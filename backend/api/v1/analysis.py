"""
Analysis API Endpoints
Comprehensive data analysis with AWS Bedrock
"""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
import logging

from backend.services.bedrock_service import get_bedrock_service
from backend.services.data_processor import DataProcessor
from backend.core.security import get_current_user
from backend.core.cache import cached
from backend.core.monitoring import track_time
from backend.core.exceptions import AIServiceError, ValidationError

logger = logging.getLogger(__name__)
router = APIRouter()


class AnalysisRequest(BaseModel):
    """Analysis request model"""
    data_id: str = Field(..., description="ID of uploaded data")
    analysis_type: str = Field(
        default="comprehensive",
        description="Type of analysis: comprehensive, quick, deep, custom"
    )
    custom_prompt: Optional[str] = Field(
        None,
        description="Custom prompt for specific analysis requirements"
    )
    include_visualizations: bool = Field(
        default=True,
        description="Include visualization recommendations"
    )
    include_predictions: bool = Field(
        default=False,
        description="Include trend predictions (for time series data)"
    )
    model_id: Optional[str] = Field(
        None,
        description="Specific AI model to use (e.g., 'claude-3-opus', 'claude-3-sonnet'). If not specified, uses default model."
    )


class AnalysisResponse(BaseModel):
    """Analysis response model"""
    analysis_id: str
    status: str
    data_summary: Dict[str, Any]
    insights: Dict[str, Any]
    visualizations: Optional[List[Dict[str, Any]]] = None
    predictions: Optional[Dict[str, Any]] = None
    model_used: str
    processing_time: float


@router.post("/analyze", response_model=AnalysisResponse)
@track_time("analysis.analyze")
async def analyze_data(
    request: AnalysisRequest,
    background_tasks: BackgroundTasks,
    current_user: Dict = Depends(get_current_user)
):
    """
    Perform comprehensive data analysis using AWS Bedrock
    
    - **data_id**: ID of the uploaded dataset
    - **analysis_type**: Type of analysis to perform
    - **custom_prompt**: Optional custom requirements
    - **include_visualizations**: Generate visualization recommendations
    - **include_predictions**: Generate trend predictions
    """
    import time
    start_time = time.time()
    
    try:
        # Get data processor and Bedrock service
        data_processor = DataProcessor()
        bedrock_service = get_bedrock_service()
        
        # Load and process data
        logger.info(f"Loading data: {request.data_id}")
        data_summary = await data_processor.get_data_summary(request.data_id)
        
        if not data_summary:
            raise ValidationError(f"Data not found: {request.data_id}")
        
        # Perform analysis
        logger.info(f"Analyzing data with Bedrock: {request.analysis_type}, Model: {request.model_id or 'default'}")
        analysis_result = await bedrock_service.analyze_data(
            data_summary=data_summary,
            analysis_type=request.analysis_type,
            custom_prompt=request.custom_prompt,
            model_id=request.model_id
        )
        
        # Generate visualizations if requested
        visualizations = None
        if request.include_visualizations:
            logger.info("Generating visualization recommendations")
            viz_result = await bedrock_service.generate_visualization_config(data_summary)
            visualizations = viz_result.get("analysis", {}).get("visualizations", [])
        
        # Generate predictions if requested
        predictions = None
        if request.include_predictions and data_summary.get("is_time_series"):
            logger.info("Generating trend predictions")
            predictions = await bedrock_service.predict_trends(data_summary)
        
        processing_time = time.time() - start_time
        
        # Store analysis results in background
        analysis_id = f"analysis_{int(time.time() * 1000)}"
        background_tasks.add_task(
            store_analysis_results,
            analysis_id,
            request.data_id,
            analysis_result,
            current_user["user_id"]
        )
        
        return AnalysisResponse(
            analysis_id=analysis_id,
            status="completed",
            data_summary=data_summary,
            insights=analysis_result.get("analysis", {}),
            visualizations=visualizations,
            predictions=predictions,
            model_used=analysis_result.get("model_used", "unknown"),
            processing_time=processing_time
        )
        
    except ValidationError:
        raise
    except Exception as e:
        logger.error(f"Analysis failed: {e}", exc_info=True)
        raise AIServiceError(f"Analysis failed: {str(e)}")


@router.get("/analysis/{analysis_id}")
@cached(ttl=3600, key_prefix="analysis")
async def get_analysis(
    analysis_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Get analysis results by ID"""
    # In production, fetch from database
    return {
        "analysis_id": analysis_id,
        "status": "completed",
        "message": "Analysis results retrieved successfully"
    }


@router.post("/compare")
async def compare_datasets(
    dataset_ids: List[str],
    current_user: Dict = Depends(get_current_user)
):
    """Compare multiple datasets"""
    bedrock_service = get_bedrock_service()
    data_processor = DataProcessor()
    
    # Load all datasets
    datasets = []
    for data_id in dataset_ids:
        summary = await data_processor.get_data_summary(data_id)
        if summary:
            datasets.append(summary)
    
    if len(datasets) < 2:
        raise ValidationError("At least 2 valid datasets required for comparison")
    
    # Create comparison prompt
    comparison_prompt = f"""Compare these {len(datasets)} datasets and provide:
1. Key similarities and differences
2. Unique characteristics of each dataset
3. Combined insights
4. Recommendations for unified analysis

Datasets:
{datasets}
"""
    
    result = await bedrock_service.analyze_data(
        data_summary={"datasets": datasets},
        analysis_type="comparison",
        custom_prompt=comparison_prompt
    )
    
    return result


@router.post("/insights/extract")
async def extract_insights(
    data_id: str,
    focus_areas: Optional[List[str]] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Extract specific insights from data"""
    bedrock_service = get_bedrock_service()
    data_processor = DataProcessor()
    
    data_summary = await data_processor.get_data_summary(data_id)
    
    if not data_summary:
        raise ValidationError(f"Data not found: {data_id}")
    
    focus_prompt = ""
    if focus_areas:
        focus_prompt = f"\nFocus specifically on: {', '.join(focus_areas)}"
    
    result = await bedrock_service.analyze_data(
        data_summary=data_summary,
        analysis_type="quick",
        custom_prompt=f"Extract key insights and actionable recommendations.{focus_prompt}"
    )
    
    return result


async def store_analysis_results(
    analysis_id: str,
    data_id: str,
    results: Dict[str, Any],
    user_id: str
):
    """Store analysis results in database (background task)"""
    try:
        # In production, store in database
        logger.info(f"Stored analysis results: {analysis_id}")
    except Exception as e:
        logger.error(f"Failed to store analysis results: {e}")