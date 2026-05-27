"""
AWS Bedrock Service for AI-powered data analysis
Provides enterprise-grade AI capabilities with fallback mechanisms
"""
import json
import logging
from typing import Dict, Any, Optional, List
import boto3
from botocore.config import Config as BotoCoreConfig
from botocore.exceptions import ClientError, BotoCoreError
from tenacity import retry, stop_after_attempt, wait_exponential

from backend.config.settings import settings
from backend.core.exceptions import AIServiceError, RateLimitError
from backend.core.monitoring import track_ai_request, track_error

logger = logging.getLogger(__name__)


class BedrockService:
    """AWS Bedrock service for advanced AI analysis"""
    
    def __init__(self):
        """Initialize Bedrock client"""
        try:
            _boto_config = BotoCoreConfig(
                read_timeout=300,
                connect_timeout=10,
                retries={"max_attempts": 2}
            )
            self.client = boto3.client(
                service_name='bedrock-runtime',
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                config=_boto_config
            )
            self.model_id = settings.BEDROCK_MODEL_ID
            self.fallback_model_id = settings.BEDROCK_FALLBACK_MODEL_ID
            logger.info(f"Bedrock service initialized with model: {self.model_id}")
        except Exception as e:
            logger.error(f"Failed to initialize Bedrock client: {e}")
            raise AIServiceError(f"Bedrock initialization failed: {str(e)}")
    
    @retry(
        stop=stop_after_attempt(settings.MAX_RETRIES),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True
    )
    @track_ai_request
    async def analyze_data(
        self,
        data_summary: Dict[str, Any],
        analysis_type: str = "comprehensive",
        custom_prompt: Optional[str] = None,
        model_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze data using AWS Bedrock
        
        Args:
            data_summary: Summary of the data to analyze
            analysis_type: Type of analysis (comprehensive, quick, deep)
            custom_prompt: Optional custom prompt for specific analysis
            model_id: Optional specific model ID to use (overrides default)
            
        Returns:
            Analysis results with insights and recommendations
        """
        try:
            prompt = self._build_analysis_prompt(data_summary, analysis_type, custom_prompt)
            
            # Use specified model or default
            selected_model = model_id or self.model_id
            
            # Try selected model
            try:
                response = await self._invoke_model(selected_model, prompt)
                return self._parse_response(response, selected_model)
            except (ClientError, BotoCoreError) as e:
                logger.warning(f"Selected model failed, trying fallback: {e}")
                # Fallback to secondary model
                response = await self._invoke_model(self.fallback_model_id, prompt)
                return self._parse_response(response, self.fallback_model_id)
                
        except Exception as e:
            logger.error(f"Bedrock analysis failed: {e}")
            track_error("bedrock_analysis_error", str(e))
            raise AIServiceError(f"Analysis failed: {str(e)}")
    
    async def _invoke_model(self, model_id: str, prompt: str) -> Dict[str, Any]:
        """Invoke Bedrock model with proper error handling"""
        try:
            # Prepare request based on model type
            if "claude" in model_id.lower():
                body = json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 4096,
                    "temperature": 0.7,
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ]
                })
            else:
                # Generic format for other models
                body = json.dumps({
                    "prompt": prompt,
                    "max_tokens": 4096,
                    "temperature": 0.7
                })
            
            response = self.client.invoke_model(
                modelId=model_id,
                body=body,
                contentType="application/json",
                accept="application/json"
            )
            
            response_body = json.loads(response['body'].read())
            return response_body
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'ThrottlingException':
                raise RateLimitError("Rate limit exceeded")
            raise
    
    def _build_analysis_prompt(
        self,
        data_summary: Dict[str, Any],
        analysis_type: str,
        custom_prompt: Optional[str]
    ) -> str:
        """Build analysis prompt - concise for quick mode, comprehensive otherwise"""

        if analysis_type == "quick":
            base_prompt = f"""You are an expert data analyst. Analyze this dataset and provide a concise analysis.

Dataset Summary:
{json.dumps(data_summary, indent=2)}

Provide a JSON response with these sections:
1. dataset_overview: summary string + key_facts object
2. data_quality_assessment: overall_score, completeness findings (top issues only), outliers summary
3. statistical_insights: key_statistics, top correlations, significant_findings (top 3)
4. business_insights: top 3 actionable_recommendations with priority and rationale

Keep the response focused and concise. Output valid JSON only."""
        else:
            base_prompt = f"""You are an expert data analyst. Analyze the following dataset and provide comprehensive insights.

Dataset Summary:
{json.dumps(data_summary, indent=2)}

Please provide a structured JSON analysis with:
1. **dataset_overview**: summary and key facts
2. **data_quality_assessment**: completeness, data types, outliers, distribution
3. **statistical_insights**: key statistics, correlations, trends, significant findings
4. **business_insights**: actionable recommendations (with priority), KPIs, risk factors

Output valid JSON only."""

        if custom_prompt:
            base_prompt += f"\n\nAdditional Requirements:\n{custom_prompt}"

        return base_prompt
    
    def _parse_response(self, response: Dict[str, Any], model_id: str = None) -> Dict[str, Any]:
        """Parse and structure the model response"""
        used_model = model_id or self.model_id
        try:
            # Handle Claude response format
            if "content" in response:
                content = response["content"]
                if isinstance(content, list) and len(content) > 0:
                    text = content[0].get("text", "")
                else:
                    text = str(content)
            elif "completion" in response:
                text = response["completion"]
            else:
                text = str(response)
            
            # Try to extract JSON if present
            try:
                # Look for JSON in the response
                start_idx = text.find('{')
                end_idx = text.rfind('}') + 1
                if start_idx != -1 and end_idx > start_idx:
                    json_str = text[start_idx:end_idx]
                    parsed = json.loads(json_str)
                    return {
                        "analysis": parsed,
                        "raw_response": text,
                        "model_used": used_model
                    }
            except json.JSONDecodeError:
                pass
            
            # Return structured response even if not JSON
            return {
                "analysis": {
                    "summary": text,
                    "insights": self._extract_insights(text),
                    "recommendations": self._extract_recommendations(text)
                },
                "raw_response": text,
                "model_used": used_model
            }
            
        except Exception as e:
            logger.error(f"Failed to parse response: {e}")
            return {
                "analysis": {"error": "Failed to parse response"},
                "raw_response": str(response),
                "model_used": used_model
            }
    
    def _extract_insights(self, text: str) -> List[str]:
        """Extract key insights from text"""
        insights = []
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if line and (
                line.startswith('-') or 
                line.startswith('•') or 
                line.startswith('*') or
                any(keyword in line.lower() for keyword in ['insight:', 'finding:', 'observation:'])
            ):
                insights.append(line.lstrip('-•* '))
        return insights[:10]  # Return top 10 insights
    
    def _extract_recommendations(self, text: str) -> List[str]:
        """Extract recommendations from text"""
        recommendations = []
        lines = text.split('\n')
        in_recommendations = False
        for line in lines:
            line = line.strip()
            if 'recommendation' in line.lower() or 'suggest' in line.lower():
                in_recommendations = True
            if in_recommendations and line and (
                line.startswith('-') or 
                line.startswith('•') or 
                line.startswith('*')
            ):
                recommendations.append(line.lstrip('-•* '))
        return recommendations[:10]  # Return top 10 recommendations
    
    async def generate_visualization_config(
        self,
        data_summary: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate visualization configuration based on data"""
        prompt = f"""Based on this data summary, suggest the best visualizations:

{json.dumps(data_summary, indent=2)}

Provide a JSON response with:
- chart_type: type of chart (bar, line, scatter, pie, etc.)
- x_axis: column for x-axis
- y_axis: column for y-axis
- color_by: column for color coding (optional)
- aggregation: aggregation method if needed
- title: suggested chart title
- insights: what this visualization reveals

Provide 3-5 visualization suggestions."""

        try:
            response = await self._invoke_model(self.model_id, prompt)
            return self._parse_response(response)
        except Exception as e:
            logger.error(f"Visualization config generation failed: {e}")
            return {"error": str(e)}
    
    async def predict_trends(
        self,
        time_series_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Predict future trends based on time series data"""
        prompt = f"""Analyze this time series data and predict future trends:

{json.dumps(time_series_data, indent=2)}

Provide:
1. Trend analysis (upward, downward, stable, seasonal)
2. Predicted values for next periods
3. Confidence intervals
4. Factors influencing the trend
5. Recommendations for decision making

Format as JSON."""

        try:
            response = await self._invoke_model(self.model_id, prompt)
            return self._parse_response(response)
        except Exception as e:
            logger.error(f"Trend prediction failed: {e}")
            return {"error": str(e)}


# Singleton instance
_bedrock_service: Optional[BedrockService] = None


def get_bedrock_service() -> BedrockService:
    """Get or create Bedrock service instance"""
    global _bedrock_service
    if _bedrock_service is None:
        _bedrock_service = BedrockService()
    return _bedrock_service