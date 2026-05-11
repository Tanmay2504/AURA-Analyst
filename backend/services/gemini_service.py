import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
import google.generativeai as genai
from google.api_core.exceptions import GoogleAPICallError
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.statespace.sarimax import SARIMAX


def _load_env_file() -> None:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_env_file()

GENAI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GENAI_MODEL_NAME = os.environ.get("GEMINI_MODEL_NAME", "gemini-flash-latest")
GENAI_FALLBACK_MODEL = os.environ.get("GENAI_FALLBACK_MODEL", "gemini-3-mini")
MAX_RETRIES = int(os.environ.get("GENAI_MAX_RETRIES", "5"))
BASE_BACKOFF = float(os.environ.get("GENAI_BASE_BACKOFF", "1.0"))

if GENAI_API_KEY:
    genai.configure(api_key=GENAI_API_KEY)


def _strip_code_fences(text: str) -> str:
    return text.replace("```json", "").replace("```", "").strip()


def _parse_json_response(text: str, fallback: Dict[str, Any]) -> Dict[str, Any]:
    try:
        return json.loads(_strip_code_fences(text))
    except json.JSONDecodeError:
        return fallback


def _invoke_with_backoff(call_fn):
    """Call `call_fn` with retries and exponential backoff on transient errors.

    This will retry on GoogleAPICallError or other Exceptions and will
    back off exponentially. It does not raise immediately on 429/quota
    but will perform a few retries. Caller can still handle a final
    exception if needed.
    """
    last_exc = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return call_fn()
        except GoogleAPICallError as exc:
            last_exc = exc
            text = str(exc).lower()
            # If server provided a retry delay in the exception, try to honor it
            retry_wait = None
            try:
                retry_wait = getattr(exc, "retry_delay", None)
                if retry_wait is not None:
                    # retry_delay may be a timedelta-like object
                    try:
                        retry_wait = float(retry_wait.total_seconds())
                    except Exception:
                        retry_wait = None
            except Exception:
                retry_wait = None

            if retry_wait:
                time.sleep(retry_wait)
                continue

            # If we see quota/429 in the message, do exponential backoff
            if "429" in text or "quota" in text or "rate limit" in text:
                wait = min(BASE_BACKOFF * (2 ** (attempt - 1)), 60)
                time.sleep(wait)
                continue

            # For other transient API call errors, back off and retry
            wait = min(BASE_BACKOFF * (2 ** (attempt - 1)), 60)
            time.sleep(wait)
            continue
        except Exception as exc:  # fallback for non-Google exceptions
            last_exc = exc
            wait = min(BASE_BACKOFF * (2 ** (attempt - 1)), 60)
            time.sleep(wait)
            continue

    # Exhausted retries
    if last_exc:
        raise last_exc


def _build_profile(df: pd.DataFrame) -> Dict[str, Any]:
    numeric_columns = df.select_dtypes(include="number").columns.tolist()
    datetime_candidates = []

    for column_name in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[column_name]):
            datetime_candidates.append(column_name)
            continue

        if pd.api.types.is_string_dtype(df[column_name]) or df[column_name].dtype == object:
            parsed = pd.to_datetime(df[column_name], errors="coerce")
            if parsed.notna().mean() >= 0.6 and parsed.nunique(dropna=True) >= 4:
                datetime_candidates.append(column_name)

    missing_values = df.isna().sum().to_dict()
    duplicate_rows = int(df.duplicated().sum())
    outliers: Dict[str, Dict[str, Any]] = {}

    for column_name in numeric_columns:
        series = df[column_name].dropna()
        if series.empty:
            continue

        q1 = series.quantile(0.25)
        q3 = series.quantile(0.75)
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        outlier_mask = (series < lower) | (series > upper)
        outliers[column_name] = {
            "count": int(outlier_mask.sum()),
            "lower_bound": float(lower),
            "upper_bound": float(upper),
        }

    corr_pairs: List[Dict[str, Any]] = []
    if len(numeric_columns) >= 2:
        corr_matrix = df[numeric_columns].corr(numeric_only=True)
        for left_index, left_name in enumerate(numeric_columns):
            for right_name in numeric_columns[left_index + 1 :]:
                corr_value = corr_matrix.loc[left_name, right_name]
                if pd.notna(corr_value):
                    corr_pairs.append(
                        {
                            "left": left_name,
                            "right": right_name,
                            "correlation": round(float(corr_value), 4),
                        }
                    )

        corr_pairs.sort(key=lambda item: abs(item["correlation"]), reverse=True)

    return {
        "rows": int(df.shape[0]),
        "columns": int(df.shape[1]),
        "numeric_columns": numeric_columns,
        "datetime_candidates": datetime_candidates,
        "missing_values": missing_values,
        "duplicate_rows": duplicate_rows,
        "outliers": outliers,
        "top_correlations": corr_pairs[:5],
        "sample_rows": df.head(5).to_dict(orient="records"),
        "describe": df.describe(include="all").fillna("").to_dict(),
    }


def _build_chart_data(df: pd.DataFrame) -> Dict[str, Any]:
    numeric_columns = df.select_dtypes(include="number").columns.tolist()
    if not numeric_columns:
        return {"labels": [], "values": []}

    target_column = numeric_columns[0]
    labels: List[str] = []
    values: List[float] = []

    categorical_candidates = [
        column_name
        for column_name in df.columns
        if column_name != target_column and df[column_name].nunique(dropna=True) <= 12
    ]

    if categorical_candidates:
        category_column = categorical_candidates[0]
        grouped = (
            df[[category_column, target_column]]
            .dropna()
            .groupby(category_column, as_index=False)[target_column]
            .mean()
            .head(8)
        )
        labels = grouped[category_column].astype(str).tolist()
        values = grouped[target_column].astype(float).tolist()
    else:
        sequence = df[target_column].dropna().head(8)
        labels = [str(index + 1) for index in range(len(sequence))]
        values = sequence.astype(float).tolist()

    return {"labels": labels, "values": values}


def _detect_time_series(df: pd.DataFrame) -> Tuple[Optional[str], Optional[str]]:
    numeric_columns = df.select_dtypes(include="number").columns.tolist()
    if not numeric_columns:
        return None, None

    datetime_candidates = []

    for column_name in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[column_name]):
            datetime_candidates.append(column_name)

        if pd.api.types.is_string_dtype(df[column_name]) or df[column_name].dtype == object:
            parsed = pd.to_datetime(df[column_name], errors="coerce")
            if parsed.notna().mean() >= 0.6 and parsed.nunique(dropna=True) >= 4:
                datetime_candidates.append(column_name)

    if datetime_candidates:
        return datetime_candidates[0], numeric_columns[0]

    return None, None


def _build_forecast_data(df: pd.DataFrame) -> Dict[str, Any]:
    date_column, target_column = _detect_time_series(df)
    if not date_column or not target_column:
        return {
            "available": False,
            "reason": "No usable time-series date column and numeric target column were detected.",
        }

    working = df[[date_column, target_column]].dropna().copy()
    working[date_column] = pd.to_datetime(working[date_column], errors="coerce")
    working = working.dropna(subset=[date_column]).sort_values(date_column)

    if working.empty or working.shape[0] < 5:
        return {
            "available": False,
            "reason": "Not enough time-series rows to generate a forecast.",
            "date_column": date_column,
            "target_column": target_column,
        }

    series = working.set_index(date_column)[target_column].astype(float)
    daily_series = series.resample("D").mean().interpolate(method="linear").ffill().bfill()

    horizon = 7
    forecast_values: List[float] = []

    try:
        model = SARIMAX(
            daily_series,
            order=(1, 1, 1),
            seasonal_order=(0, 0, 0, 0),
            enforce_stationarity=False,
            enforce_invertibility=False,
        )
        fit = model.fit(disp=False)
        forecast = fit.get_forecast(steps=horizon)
        forecast_values = forecast.predicted_mean.tolist()
        method_name = "statsmodels SARIMAX"
    except Exception:
        try:
            model = ExponentialSmoothing(daily_series, trend="add", seasonal=None)
            fit = model.fit(optimized=True)
            forecast = fit.forecast(horizon)
            forecast_values = forecast.tolist()
            method_name = "statsmodels ExponentialSmoothing"
        except Exception as exc:
            return {
                "available": False,
                "reason": f"Forecasting failed: {exc}",
                "date_column": date_column,
                "target_column": target_column,
            }

    last_date = daily_series.index.max()
    forecast_dates = pd.date_range(last_date + pd.Timedelta(days=1), periods=horizon, freq="D")

    return {
        "available": True,
        "method": method_name,
        "date_column": date_column,
        "target_column": target_column,
        "horizon_days": horizon,
        "points": [
            {"date": date.strftime("%Y-%m-%d"), "value": round(float(value), 4)}
            for date, value in zip(forecast_dates, forecast_values)
        ],
    }


def _invoke_gemini_json(system_instruction: str, prompt: str, fallback: Dict[str, Any]) -> Dict[str, Any]:
    def _call(model_name: str):
        model = genai.GenerativeModel(model_name=model_name, system_instruction=system_instruction)
        return model.generate_content(prompt)

    try:
        response = _invoke_with_backoff(lambda: _call(GENAI_MODEL_NAME))
        return _parse_json_response(getattr(response, "text", ""), fallback)
    except Exception:
        # Try a single fallback model attempt if configured and different
        if GENAI_FALLBACK_MODEL and GENAI_FALLBACK_MODEL != GENAI_MODEL_NAME:
            try:
                response = _invoke_with_backoff(lambda: _call(GENAI_FALLBACK_MODEL))
                return _parse_json_response(getattr(response, "text", ""), fallback)
            except Exception:
                return fallback
        return fallback


def analyze_data_with_gemini(df: pd.DataFrame) -> Dict[str, Any]:
    """Run the agentic analysis flow and return structured analysis results."""
    if not GENAI_API_KEY:
        raise ValueError("Gemini API key is not set. Please set the GEMINI_API_KEY environment variable.")

    profile = _build_profile(df)
    chart_data = _build_chart_data(df)
    forecast_data = _build_forecast_data(df)

    agent_status = [
        "Data Custodian cleaning data...",
        "Statistical Researcher identifying trends...",
        "Business Reporter synthesizing insight...",
    ]

    custodian_prompt = f"""
You are the Data Custodian in a multi-agent analytics team.
Review the dataset profile and identify data quality issues.

Dataset profile:
{json.dumps(profile, indent=2)}

Return raw JSON only with these keys:
- missing_value_summary: brief paragraph about missing data patterns.
- outlier_summary: brief paragraph about outlier exposure.
- cleaning_notes: list of 2-4 concise cleaning actions.
"""

    researcher_prompt = f"""
You are the Statistical Researcher in a multi-agent analytics team.
Review the dataset profile and summarize correlation and trend patterns.

Dataset profile:
{json.dumps(profile, indent=2)}

Return raw JSON only with these keys:
- trend_summary: brief paragraph about trend direction or structure.
- correlation_summary: brief paragraph about strongest correlations.
- key_observations: list of 3-5 concise statistical observations.
"""

    custodian_output = _invoke_gemini_json(
        system_instruction="You are the Data Custodian. Return valid JSON only.",
        prompt=custodian_prompt,
        fallback={"missing_value_summary": "", "outlier_summary": "", "cleaning_notes": []},
    )
    researcher_output = _invoke_gemini_json(
        system_instruction="You are the Statistical Researcher. Return valid JSON only.",
        prompt=researcher_prompt,
        fallback={"trend_summary": "", "correlation_summary": "", "key_observations": []},
    )

    reporter_prompt = f"""
You are the Business Reporter in a multi-agent analytics team.
Synthesize the custodian and researcher findings into a polished executive summary.

Custodian output:
{json.dumps(custodian_output, indent=2)}

Researcher output:
{json.dumps(researcher_output, indent=2)}

Forecast context:
{json.dumps(forecast_data, indent=2)}

Return raw JSON only with these keys:
- summary: 1-2 sentence executive summary.
- insights: list of 3-5 concise business-friendly insights.
"""

    reporter_output = _invoke_gemini_json(
        system_instruction="You are the Business Reporter. Return valid JSON only.",
        prompt=reporter_prompt,
        fallback={"summary": "No summary available.", "insights": []},
    )

    synthesized_insights = []
    synthesized_insights.extend(custodian_output.get("cleaning_notes", []))
    synthesized_insights.extend(researcher_output.get("key_observations", []))
    synthesized_insights.extend(reporter_output.get("insights", []))

    if custodian_output.get("missing_value_summary"):
        synthesized_insights.insert(0, custodian_output["missing_value_summary"])
    if custodian_output.get("outlier_summary"):
        synthesized_insights.insert(1, custodian_output["outlier_summary"])
    if researcher_output.get("trend_summary"):
        synthesized_insights.append(researcher_output["trend_summary"])
    if researcher_output.get("correlation_summary"):
        synthesized_insights.append(researcher_output["correlation_summary"])

    seen = set()
    deduped_insights: List[str] = []
    for insight in synthesized_insights:
        normalized = str(insight).strip()
        if normalized and normalized not in seen:
            seen.add(normalized)
            deduped_insights.append(normalized)

    return {
        "summary": reporter_output.get("summary", "No summary available."),
        "insights": deduped_insights[:5],
        "chart_data": chart_data,
        "forecast_data": forecast_data,
        "agent_status": agent_status,
    }