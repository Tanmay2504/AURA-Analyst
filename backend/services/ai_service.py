import json
import logging
from typing import Dict, Any

from .gemini_service import (
    analyze_data_with_gemini as _gemini_analyze,
    analyze_dataframe_locally as _analyze_dataframe_locally,
    compare_datasets_with_gemini as _compare_datasets_with_gemini,
    _build_profile,
    _infer_analysis_context,
    _build_chart_data,
    _build_forecast_data,
    _chart_title_for_context,
    _friendly_series_label,
)
from backend.core.exceptions import AIServiceError

logger = logging.getLogger(__name__)

# Try to import Bedrock support. If available and configured, use Bedrock as a fallback
try:
	from backend.services.bedrock_service import get_bedrock_service
	from backend.config.settings import settings
	_USE_BEDROCK = bool(settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY)
except Exception:
	_USE_BEDROCK = False


# max_tokens per analysis mode
_MODE_TOKENS = {
    "quick": 1024,
    "standard": 2048,
    "deep": 4096,
}

def analyze_data_with_gemini(df, model_id: str | None = None, analysis_mode: str = "standard") -> Dict[str, Any]:
	"""
	Bedrock-only analysis wrapper for legacy endpoints.

	- Requires AWS credentials and a valid `BEDROCK_MODEL_ID` configured in settings/.env.
	- If Bedrock is not configured, or if the Bedrock call fails, this function raises
	  an `AIServiceError` so the API surfaces the exact Bedrock error to the client.
	"""
	if not _USE_BEDROCK:
		raise AIServiceError(
			"AWS Bedrock is required for analysis. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and BEDROCK_MODEL_ID in the environment."
		)

	bedrock = get_bedrock_service()
	selected_model_id = model_id or bedrock.model_id

	try:
		profile = _build_profile(df)
		context = _infer_analysis_context(df)
		chart_data = _build_chart_data(df, context)
		forecast_data = _build_forecast_data(df, context)
		chart_title = _chart_title_for_context(context)
		target_label = _friendly_series_label(context.get("target_column"))

		analysis_metadata = {
			**context,
			"chart_title": chart_title,
			"series_label": target_label,
			"rows": profile.get("rows"),
			"columns": profile.get("columns"),
			"numeric_columns": profile.get("numeric_columns", []),
			"datetime_candidates": profile.get("datetime_candidates", []),
		}

		# Build a data_summary object expected by Bedrock prompts
		data_summary = {
			"profile": profile,
			"analysis_metadata": analysis_metadata,
			"chart_data": chart_data,
			"forecast_data": forecast_data,
		}

		# Build a concise prompt - always use quick mode for speed
		rows = profile.get("rows", 0)
		analysis_type = "quick"

		# Trim profile to reduce prompt size and speed up response
		slim_profile = {
			"rows": profile.get("rows"),
			"columns": profile.get("columns"),
			"numeric_columns": profile.get("numeric_columns", [])[:10],
			"datetime_candidates": profile.get("datetime_candidates", []),
			"missing_values": {k: v for k, v in list(profile.get("missing_values", {}).items())[:10]},
			"duplicate_rows": profile.get("duplicate_rows"),
			"top_correlations": profile.get("top_correlations", [])[:3],
			"outliers": {k: v for k, v in list(profile.get("outliers", {}).items())[:5]},
			"sample_rows": profile.get("sample_rows", [])[:3],
		}
		slim_summary = {
			"profile": slim_profile,
			"analysis_metadata": analysis_metadata,
		}
		prompt = bedrock._build_analysis_prompt(slim_summary, analysis_type, None)

		# Set max_tokens based on analysis_mode chosen by user
		max_tokens = _MODE_TOKENS.get(analysis_mode, 2048)

		# Prepare body similar to BedrockService._invoke_model
		if "claude" in selected_model_id.lower():
			body = json.dumps({
				"anthropic_version": "bedrock-2023-05-31",
				"max_tokens": max_tokens,
				"temperature": 0.3,
				"messages": [{"role": "user", "content": prompt}],
			})
		else:
			body = json.dumps({"prompt": prompt, "max_tokens": max_tokens, "temperature": 0.3})

		response = bedrock.client.invoke_model(
			modelId=selected_model_id,
			body=body,
			contentType="application/json",
			accept="application/json",
		)

		response_body = json.loads(response["body"].read())
		parsed = bedrock._parse_response(response_body)

		# Map parsed bedrock response into the same shape the frontend expects
		agent_status = [
			"Data Custodian cleaning data...",
			"Statistical Researcher identifying trends...",
			"Business Reporter synthesizing insight...",
		]

		# The AI returns a rich JSON object (dataset_overview, data_quality_assessment, etc.)
		# stored under parsed["analysis"]. We serialize the whole thing as the summary string
		# so the frontend AnalysisDashboard can parse and render it as structured cards.
		analysis_obj = parsed.get("analysis", {})

		# If analysis_obj is a rich dict (has dataset_overview or statistical_insights),
		# serialize it as JSON so the frontend can parse it into structured sections.
		if isinstance(analysis_obj, dict) and (
			"dataset_overview" in analysis_obj
			or "statistical_insights" in analysis_obj
			or "data_quality_assessment" in analysis_obj
		):
			summary_str = json.dumps(analysis_obj)
		else:
			# Fallback: plain text summary
			summary_str = (
				analysis_obj.get("summary", "")
				if isinstance(analysis_obj, dict)
				else str(analysis_obj)
			) or parsed.get("summary", "No summary available.")

		insights = (
			analysis_obj.get("insights", [])
			if isinstance(analysis_obj, dict)
			else parsed.get("insights", [])
		) or []

		return {
			"summary": summary_str,
			"insights": insights,
			"chart_data": chart_data,
			"forecast_data": forecast_data,
			"analysis_metadata": analysis_metadata,
			"model_used": selected_model_id,
			"agent_status": agent_status,
		}
	except Exception as e:
		logger.exception("Bedrock invocation failed: %s", e)
		# Surface the original Bedrock error to the API consumer
		raise AIServiceError(f"Bedrock invocation failed: {str(e)}")


def analyze_dataframe_locally(df, **kwargs):
	return _analyze_dataframe_locally(df, **kwargs)


def compare_datasets_with_gemini(analysis_packets):
	return _compare_datasets_with_gemini(analysis_packets)

