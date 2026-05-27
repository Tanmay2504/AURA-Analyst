"""
AI Models API
Endpoints for browsing and selecting AI models
"""
from fastapi import APIRouter, Depends, Query
from typing import Dict, Any, List, Optional
import logging

from backend.config.ai_models import (
    get_all_models,
    get_model_by_id,
    get_models_by_provider,
    get_recommended_model,
    compare_models,
    ModelProvider
)
from backend.core.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/models")
async def list_models(
    provider: Optional[str] = Query(None, description="Filter by provider"),
    current_user: Dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    List all available AI models with detailed information
    
    Returns comprehensive information about each model including:
    - Capabilities and features
    - Pricing information
    - Performance characteristics
    - Best use cases
    - Limitations
    """
    try:
        if provider:
            models = get_models_by_provider(ModelProvider(provider.lower()))
        else:
            models = get_all_models()
        
        return {
            "success": True,
            "total_models": len(models),
            "models": models,
            "providers": list(set(m["provider"] for m in models.values()))
        }
    except Exception as e:
        logger.error(f"Failed to list models: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/models/public")
async def list_public_models() -> Dict[str, Any]:
    """
    Public listing of curated AI models suitable for unauthenticated frontend population.
    Respects admin-disabled models so the frontend only shows enabled ones.
    """
    try:
        from backend.api.v1.admin import _load_disabled_models
        models = get_all_models()
        disabled = _load_disabled_models()

        # Filter out disabled models and return minimal metadata
        public_models = {
            key: {
                "model_id": model["model_id"],
                "name": model["name"],
                "provider": model["provider"],
                "description": model["description"],
                "max_tokens": model["max_tokens"],
                "context_window": model["context_window"],
                "pricing": model["pricing"],
                "performance": model["performance"],
                "capabilities": model["capabilities"],
                "best_for": model["best_for"],
                "limitations": model["limitations"],
                "recommended_use_cases": model["recommended_use_cases"],
            }
            for key, model in models.items()
            if key not in disabled
        }

        return {
            "success": True,
            "models": public_models,
            "total_models": len(public_models),
        }
    except Exception as e:
        logger.error(f"Failed to list public models: {e}")
        return {"success": False, "error": str(e)}


@router.get("/models/{model_key}")
async def get_model_details(
    model_key: str,
    current_user: Dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get detailed information about a specific model
    
    - **model_key**: Model identifier (e.g., 'claude-3-sonnet', 'claude-3-opus')
    """
    try:
        model = get_model_by_id(model_key)
        return {
            "success": True,
            "model": model.to_dict()
        }
    except ValueError as e:
        return {
            "success": False,
            "error": str(e)
        }
    except Exception as e:
        logger.error(f"Failed to get model details: {e}")
        return {
            "success": False,
            "error": "Internal server error"
        }


@router.post("/models/recommend")
async def recommend_model(
    complexity: str = Query("medium", description="Analysis complexity: simple, medium, complex"),
    budget: str = Query("medium", description="Budget level: low, medium, high"),
    speed_priority: bool = Query(False, description="Prioritize speed over quality"),
    current_user: Dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get AI model recommendation based on requirements
    
    - **complexity**: Analysis complexity level
    - **budget**: Budget constraints
    - **speed_priority**: Whether speed is more important than quality
    
    Returns the most suitable model for your needs
    """
    try:
        model = get_recommended_model(
            complexity=complexity,
            budget=budget,
            speed_priority=speed_priority
        )
        
        return {
            "success": True,
            "recommended_model": model.to_dict(),
            "reasoning": {
                "complexity": complexity,
                "budget": budget,
                "speed_priority": speed_priority
            }
        }
    except Exception as e:
        logger.error(f"Failed to recommend model: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@router.post("/models/compare")
async def compare_ai_models(
    model_ids: List[str] = Query(..., description="List of model IDs to compare"),
    current_user: Dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Compare multiple AI models side by side
    
    - **model_ids**: List of model identifiers to compare
    
    Returns detailed comparison including:
    - Feature comparison
    - Pricing comparison
    - Performance comparison
    - Best model for each criterion
    """
    try:
        if len(model_ids) < 2:
            return {
                "success": False,
                "error": "At least 2 models required for comparison"
            }
        
        comparison = compare_models(model_ids)
        
        return {
            "success": True,
            "comparison": comparison
        }
    except ValueError as e:
        return {
            "success": False,
            "error": str(e)
        }
    except Exception as e:
        logger.error(f"Failed to compare models: {e}")
        return {
            "success": False,
            "error": "Internal server error"
        }


@router.get("/models/providers")
async def list_providers(
    current_user: Dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    List all available AI model providers
    
    Returns information about each provider and their models
    """
    try:
        providers_info = {}
        
        for provider in ModelProvider:
            models = get_models_by_provider(provider)
            providers_info[provider.value] = {
                "name": provider.value.title(),
                "model_count": len(models),
                "models": list(models.keys())
            }
        
        return {
            "success": True,
            "providers": providers_info
        }
    except Exception as e:
        logger.error(f"Failed to list providers: {e}")
        return {
            "success": False,
            "error": str(e)
        }




@router.get("/models/capabilities")
async def list_capabilities(
    current_user: Dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    List all model capabilities and which models support them
    """
    from backend.config.ai_models import ModelCapability, AVAILABLE_MODELS
    
    try:
        capabilities_map = {}
        
        for capability in ModelCapability:
            models_with_capability = [
                {
                    "key": key,
                    "name": model.name,
                    "provider": model.provider.value
                }
                for key, model in AVAILABLE_MODELS.items()
                if capability in model.capabilities
            ]
            
            capabilities_map[capability.value] = {
                "description": capability.value.replace("_", " ").title(),
                "model_count": len(models_with_capability),
                "models": models_with_capability
            }
        
        return {
            "success": True,
            "capabilities": capabilities_map
        }
    except Exception as e:
        logger.error(f"Failed to list capabilities: {e}")
        return {
            "success": False,
            "error": str(e)
        }
