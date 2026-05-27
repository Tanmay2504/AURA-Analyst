import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
import google.generativeai as genai
from google.api_core.exceptions import GoogleAPICallError


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


def _build_profile(df: pd.DataFrame, *, fast: bool = False) -> Dict[str, Any]:
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
    if len(numeric_columns) >= 2 and not fast:
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

    describe_source = df.head(250) if fast and len(df) > 250 else df

    return {
        "rows": int(df.shape[0]),
        "columns": int(df.shape[1]),
        "numeric_columns": numeric_columns,
        "datetime_candidates": datetime_candidates,
        "missing_values": missing_values,
        "duplicate_rows": duplicate_rows,
        "outliers": outliers,
        "top_correlations": corr_pairs[:3] if fast else corr_pairs[:5],
        "sample_rows": describe_source.head(5).to_dict(orient="records"),
        "describe": describe_source.describe(include="all").fillna("").to_dict(),
    }


def _build_local_summary(profile: Dict[str, Any], context: Dict[str, Optional[str]], chart_data: Dict[str, Any], forecast_data: Dict[str, Any]) -> Tuple[str, List[str]]:
    summary_parts = []
    insights: List[str] = []

    summary_parts.append(
        f"This dataset contains {profile.get('rows', 0)} rows and {profile.get('columns', 0)} columns."
    )
    summary_parts.append(f"It is best interpreted as a {context.get('dataset_type', 'unknown')} dataset.")

    target_column = context.get("target_column")
    date_column = context.get("date_column")
    category_column = context.get("category_column")

    if target_column:
        summary_parts.append(f"Primary measure detected: { _friendly_series_label(target_column) }.")
    if date_column:
        summary_parts.append(f"Date-like column detected: {date_column}.")
    if category_column:
        summary_parts.append(f"Category column detected: {category_column}.")

    missing_values = profile.get("missing_values", {}) or {}
    missing_total = sum(int(value or 0) for value in missing_values.values())
    if missing_total > 0:
        insights.append(f"The dataset contains {missing_total} missing values across {len(missing_values)} columns.")

    duplicate_rows = int(profile.get("duplicate_rows", 0) or 0)
    if duplicate_rows > 0:
        insights.append(f"There are {duplicate_rows} duplicate rows that may need review before reporting.")

    top_correlations = profile.get("top_correlations", []) or []
    if top_correlations:
        strongest = top_correlations[0]
        insights.append(
            f"Strongest correlation observed between {strongest['left']} and {strongest['right']} ({strongest['correlation']})."
        )

    outliers = profile.get("outliers", {}) or {}
    if outliers:
        largest_outlier_column = max(outliers.items(), key=lambda item: item[1].get("count", 0))[0]
        insights.append(f"Potential outliers were detected, with the highest concentration in {largest_outlier_column}.")

    if forecast_data.get("available"):
        insights.append(
            f"A 7-day forecast was generated using {forecast_data.get('method', 'a forecasting model')}.")
    else:
        insights.append("Forecasting was skipped because the dataset did not provide a strong time-series structure.")

    if chart_data.get("chart_type") == "time_series":
        insights.append("The visual output is time-series based and should be interpreted as historical trend plus forecast.")
    elif chart_data.get("chart_type") == "categorical":
        insights.append("The visual output summarizes category-level variation in the target measure.")
    elif chart_data.get("chart_type") == "numeric_summary":
        insights.append("The visual output highlights summary statistics for the primary numeric measure.")

    return " ".join(summary_parts), insights[:5]


def analyze_dataframe_locally(df: pd.DataFrame, *, fast: bool = False, include_forecast: bool = True) -> Dict[str, Any]:
    """Fast, quota-free analysis used for batch mode and fallback generation."""
    profile = _build_profile(df, fast=fast)
    context = _infer_analysis_context(df)
    chart_data = _build_chart_data(df, context)
    forecast_data = _build_forecast_data(df, context) if include_forecast else {
        "available": False,
        "reason": "Forecasting disabled in fast batch mode.",
        "date_column": context.get("date_column"),
        "target_column": context.get("target_column"),
    }
    summary, insights = _build_local_summary(profile, context, chart_data, forecast_data)

    analysis_metadata = {
        **context,
        "chart_title": _chart_title_for_context(context),
        "series_label": _friendly_series_label(context.get("target_column")),
        "rows": profile.get("rows"),
        "columns": profile.get("columns"),
        "numeric_columns": profile.get("numeric_columns", []),
        "datetime_candidates": profile.get("datetime_candidates", []),
    }

    return {
        "summary": summary,
        "insights": insights,
        "chart_data": chart_data,
        "forecast_data": forecast_data,
        "analysis_metadata": analysis_metadata,
        "agent_status": [
            "Data Custodian cleaning data...",
            "Statistical Researcher identifying trends...",
            "Business Reporter synthesizing insight...",
        ],
    }


def _normalize_column_name(column_name: str) -> str:
    return column_name.lower().replace(" ", "_")


def _score_numeric_target(column_name: str, series: pd.Series) -> float:
    normalized = _normalize_column_name(column_name)
    score = 0.0

    keyword_boosts = {
        "cases": 6,
        "case": 6,
        "confirmed": 6,
        "new_cases": 8,
        "deaths": 6,
        "death": 6,
        "recovered": 4,
        "hospitalized": 4,
        "admissions": 4,
        "vaccinations": 4,
        "vaccinated": 4,
        "count": 3,
        "total": 2,
        "rate": 2,
        "value": 1,
        "amount": 1,
        "sales": 6,
        "revenue": 6,
        "profit": 4,
        "population": 2,
    }

    for keyword, boost in keyword_boosts.items():
        if keyword in normalized:
            score += boost

    if normalized in {"id", "index", "row", "serial", "code"}:
        score -= 8

    unique_ratio = series.nunique(dropna=True) / max(len(series.dropna()), 1)
    score += min(series.dropna().shape[0] / 100.0, 2.0)
    score += min(unique_ratio * 4.0, 4.0)

    if pd.api.types.is_numeric_dtype(series):
        std = float(series.dropna().std() or 0.0)
        mean_abs = float(series.dropna().abs().mean() or 1.0)
        score += min(std / max(mean_abs, 1.0), 3.0)

    return score


def _score_date_column(column_name: str, series: pd.Series) -> float:
    normalized = _normalize_column_name(column_name)
    score = 0.0

    for keyword in ["date", "day", "time", "timestamp", "week", "month", "year"]:
        if keyword in normalized:
            score += 5

    if pd.api.types.is_datetime64_any_dtype(series):
        score += 4

    if pd.api.types.is_string_dtype(series) or series.dtype == object:
        parsed = pd.to_datetime(series, errors="coerce")
        parse_ratio = parsed.notna().mean()
        if parse_ratio >= 0.6:
            score += 6 * parse_ratio
        if parsed.nunique(dropna=True) >= 4:
            score += 2

    return score


def _infer_analysis_context(df: pd.DataFrame) -> Dict[str, Optional[str]]:
    numeric_columns = df.select_dtypes(include="number").columns.tolist()
    text_columns = [column_name for column_name in df.columns if column_name not in numeric_columns]

    date_candidates: List[Tuple[float, str]] = []
    for column_name in df.columns:
        date_candidates.append((_score_date_column(column_name, df[column_name]), column_name))

    date_candidates.sort(reverse=True)
    date_column = date_candidates[0][1] if date_candidates and date_candidates[0][0] >= 5 else None

    target_column = None
    if numeric_columns:
        scored_targets = [(_score_numeric_target(column_name, df[column_name]), column_name) for column_name in numeric_columns]
        scored_targets.sort(reverse=True)
        target_column = scored_targets[0][1]

    category_column = None
    if numeric_columns:
        categorical_candidates: List[Tuple[float, str]] = []
        for column_name in text_columns:
            nunique = df[column_name].nunique(dropna=True)
            if 2 <= nunique <= 20:
                normalized = _normalize_column_name(column_name)
                score = 0.0
                for keyword in ["state", "states", "country", "region", "county", "city", "province", "location", "sex", "gender", "age_group", "category"]:
                    if keyword in normalized:
                        score += 4
                score += max(0.0, 6 - abs(nunique - 6))
                categorical_candidates.append((score, column_name))
        categorical_candidates.sort(reverse=True)
        category_column = categorical_candidates[0][1] if categorical_candidates else None

    dataset_type = "numeric_summary"
    if date_column and target_column:
        dataset_type = "time_series"
    elif category_column and target_column:
        dataset_type = "categorical_summary"

    return {
        "dataset_type": dataset_type,
        "date_column": date_column,
        "target_column": target_column,
        "category_column": category_column,
    }


def _friendly_series_label(column_name: Optional[str]) -> str:
    if not column_name:
        return "Value"

    normalized = _normalize_column_name(column_name)
    label_map = {
        "cases": "COVID Cases",
        "new_cases": "New COVID Cases",
        "confirmed": "Confirmed Cases",
        "deaths": "COVID Deaths",
        "death": "Deaths",
        "recovered": "Recoveries",
        "hospitalized": "Hospitalizations",
        "vaccinations": "Vaccinations",
        "vaccinated": "Vaccinations",
        "sales": "Sales",
        "revenue": "Revenue",
        "profit": "Profit",
    }

    for keyword, label in label_map.items():
        if keyword in normalized:
            return label

    return column_name.replace("_", " ").title()


def _chart_title_for_context(context: Dict[str, Optional[str]]) -> str:
    dataset_type = context.get("dataset_type")
    target_label = _friendly_series_label(context.get("target_column"))

    if dataset_type == "time_series":
        return f"{target_label} Trend"
    if dataset_type == "categorical_summary":
        return f"{target_label} by Category"
    return f"{target_label} Distribution"


def _build_chart_data(df: pd.DataFrame, context: Dict[str, Optional[str]]) -> Dict[str, Any]:
    dataset_type = context.get("dataset_type")
    date_column = context.get("date_column")
    target_column = context.get("target_column")
    category_column = context.get("category_column")

    if dataset_type == "time_series" and date_column and target_column:
        working = df[[date_column, target_column]].dropna().copy()
        working[date_column] = pd.to_datetime(working[date_column], errors="coerce")
        working = working.dropna(subset=[date_column]).sort_values(date_column)
        if working.empty:
            return {"labels": [], "values": [], "chart_type": "time_series"}

        working = working.set_index(date_column)[target_column].astype(float)
        if len(working) > 12:
            working = working.tail(12)

        return {
            "labels": [index.strftime("%Y-%m-%d") for index in working.index],
            "values": [round(float(value), 4) for value in working.tolist()],
            "chart_type": "time_series",
            "x_axis": date_column,
            "y_axis": target_column,
        }

    numeric_columns = df.select_dtypes(include="number").columns.tolist()
    if not numeric_columns:
        return {"labels": [], "values": [], "chart_type": "empty"}

    target_column = target_column or numeric_columns[0]

    if dataset_type == "categorical_summary" and category_column:
        grouped = (
            df[[category_column, target_column]]
            .dropna()
            .groupby(category_column, as_index=False)[target_column]
            .mean()
            .sort_values(target_column, ascending=False)
            .head(10)
        )
        return {
            "labels": grouped[category_column].astype(str).tolist(),
            "values": grouped[target_column].astype(float).tolist(),
            "chart_type": "categorical",
            "x_axis": category_column,
            "y_axis": target_column,
        }

    if dataset_type == "numeric_summary":
        numeric_summary = df[numeric_columns].describe().loc[["mean", "min", "max"]]
        primary_column = target_column
        return {
            "labels": ["Mean", "Min", "Max"],
            "values": [
                round(float(numeric_summary.loc["mean", primary_column]), 4),
                round(float(numeric_summary.loc["min", primary_column]), 4),
                round(float(numeric_summary.loc["max", primary_column]), 4),
            ],
            "chart_type": "numeric_summary",
            "x_axis": "Statistic",
            "y_axis": primary_column,
        }

    sequence = df[target_column].dropna().head(8)
    return {
        "labels": [str(index + 1) for index in range(len(sequence))],
        "values": sequence.astype(float).tolist(),
        "chart_type": "sequence",
        "x_axis": "Index",
        "y_axis": target_column,
    }


def _build_forecast_data(df: pd.DataFrame, context: Dict[str, Optional[str]]) -> Dict[str, Any]:
    date_column = context.get("date_column")
    target_column = context.get("target_column")
    if not date_column or not target_column:
        return {
            "available": False,
            "reason": "No usable time-series date column and numeric target column were detected.",
            "date_column": date_column,
            "target_column": target_column,
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
        from statsmodels.tsa.statespace.sarimax import SARIMAX  # noqa: PLC0415
        from statsmodels.tsa.holtwinters import ExponentialSmoothing  # noqa: PLC0415
    except ImportError as exc:
        return {
            "available": False,
            "reason": f"statsmodels not available: {exc}",
            "date_column": date_column,
            "target_column": target_column,
        }

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
    context = _infer_analysis_context(df)
    chart_data = _build_chart_data(df, context)
    forecast_data = _build_forecast_data(df, context)
    chart_title = _chart_title_for_context(context)
    target_label = _friendly_series_label(context.get("target_column"))

    agent_status = [
        "Data Custodian cleaning data...",
        "Statistical Researcher identifying trends...",
        "Business Reporter synthesizing insight...",
    ]

    analysis_metadata = {
        **context,
        "chart_title": chart_title,
        "series_label": target_label,
        "rows": profile.get("rows"),
        "columns": profile.get("columns"),
        "numeric_columns": profile.get("numeric_columns", []),
        "datetime_candidates": profile.get("datetime_candidates", []),
    }

    custodian_prompt = f"""
You are the Data Custodian in a multi-agent analytics team.
Review the dataset profile and identify data quality issues.

Dataset profile:
{json.dumps(profile, indent=2)}

Detected analysis context:
{json.dumps(analysis_metadata, indent=2)}

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

Detected analysis context:
{json.dumps(analysis_metadata, indent=2)}

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

Use this chart/report framing:
Chart title: {chart_title}
Primary series: {target_label}

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
        "analysis_metadata": analysis_metadata,
        "agent_status": agent_status,
    }


def compare_datasets_with_gemini(analysis_packets: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Compare multiple analyzed datasets and generate AI connections between them."""
    if not analysis_packets:
        return {
            "summary": "No datasets provided for comparison.",
            "shared_patterns": [],
            "key_differences": [],
            "recommended_storyline": "",
            "insight_connections": [],
        }

    dataset_briefs = []
    for index, packet in enumerate(analysis_packets, start=1):
        metadata = packet.get("analysis_metadata") or {}
        dataset_briefs.append(
            {
                "index": index,
                "filename": packet.get("filename", f"dataset_{index}.csv"),
                "summary": packet.get("summary", "")[:500],
                "top_insights": packet.get("insights", [])[:3],
                "dataset_type": metadata.get("dataset_type", "unknown"),
                "target_column": metadata.get("target_column"),
                "date_column": metadata.get("date_column"),
                "category_column": metadata.get("category_column"),
                "series_label": metadata.get("series_label"),
                "chart_title": metadata.get("chart_title"),
            }
        )

    comparison_prompt = f"""
You are a senior data analyst. Compare multiple CSV analyses and explain how the datasets are related.

Dataset briefs:
{json.dumps(dataset_briefs, indent=2)}

Return raw JSON only with these keys:
- summary: 1-2 sentence overview of how the datasets relate.
- shared_patterns: list of 3-5 shared trends, themes, or observations.
- key_differences: list of 3-5 important differences between datasets.
- recommended_storyline: one paragraph describing the best storyline for a report/poster/presentation.
- insight_connections: list of 3-5 specific cross-dataset connections or contrasts.
"""

    comparison_output = _invoke_gemini_json(
        system_instruction="You are a senior data analyst. Return valid JSON only.",
        prompt=comparison_prompt,
        fallback={
            "summary": "The uploaded datasets were analyzed individually, but no AI comparison could be generated.",
            "shared_patterns": [],
            "key_differences": [],
            "recommended_storyline": "",
            "insight_connections": [],
        },
    )

    return {
        "summary": comparison_output.get("summary", ""),
        "shared_patterns": comparison_output.get("shared_patterns", []),
        "key_differences": comparison_output.get("key_differences", []),
        "recommended_storyline": comparison_output.get("recommended_storyline", ""),
        "insight_connections": comparison_output.get("insight_connections", []),
    }