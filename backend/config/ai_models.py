"""
AI Model Configuration
Comprehensive model definitions with capabilities, pricing, and use cases
"""
from typing import Dict, List, Any
from enum import Enum


class ModelProvider(str, Enum):
    """AI Model Providers"""
    ANTHROPIC = "anthropic"
    AMAZON = "amazon"
    META = "meta"
    COHERE = "cohere"
    AI21 = "ai21"
    MISTRAL = "mistral"


class ModelCapability(str, Enum):
    """Model Capabilities"""
    TEXT_ANALYSIS = "text_analysis"
    DATA_ANALYSIS = "data_analysis"
    CODE_GENERATION = "code_generation"
    SUMMARIZATION = "summarization"
    REASONING = "reasoning"
    MULTILINGUAL = "multilingual"
    LONG_CONTEXT = "long_context"


class AIModel:
    """AI Model Definition"""
    
    def __init__(
        self,
        model_id: str,
        name: str,
        provider: ModelProvider,
        description: str,
        capabilities: List[ModelCapability],
        max_tokens: int,
        context_window: int,
        cost_per_1k_input: float,
        cost_per_1k_output: float,
        speed: str,  # "fast", "medium", "slow"
        quality: str,  # "high", "medium", "standard"
        best_for: List[str],
        limitations: List[str],
        recommended_use_cases: List[str]
    ):
        self.model_id = model_id
        self.name = name
        self.provider = provider
        self.description = description
        self.capabilities = capabilities
        self.max_tokens = max_tokens
        self.context_window = context_window
        self.cost_per_1k_input = cost_per_1k_input
        self.cost_per_1k_output = cost_per_1k_output
        self.speed = speed
        self.quality = quality
        self.best_for = best_for
        self.limitations = limitations
        self.recommended_use_cases = recommended_use_cases
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary"""
        return {
            "model_id": self.model_id,
            "name": self.name,
            "provider": self.provider.value,
            "description": self.description,
            "capabilities": [cap.value for cap in self.capabilities],
            "max_tokens": self.max_tokens,
            "context_window": self.context_window,
            "pricing": {
                "input_per_1k_tokens": f"${self.cost_per_1k_input:.4f}",
                "output_per_1k_tokens": f"${self.cost_per_1k_output:.4f}",
                "estimated_cost_per_analysis": self._estimate_analysis_cost()
            },
            "performance": {
                "speed": self.speed,
                "quality": self.quality
            },
            "best_for": self.best_for,
            "limitations": self.limitations,
            "recommended_use_cases": self.recommended_use_cases
        }
    
    def _estimate_analysis_cost(self) -> str:
        """Estimate cost for typical analysis (5k input, 2k output)"""
        input_cost = (5 * self.cost_per_1k_input)
        output_cost = (2 * self.cost_per_1k_output)
        total = input_cost + output_cost
        return f"${total:.4f}"


# AWS Bedrock Available Models
# Only models verified to work with this account's Bedrock access are listed here.
AVAILABLE_MODELS = {
    # ── Active Bedrock inference-profile ARNs (verified working) ──────────
    "claude-sonnet-4-6": AIModel(
        model_id="arn:aws:bedrock:us-east-1:699038657654:inference-profile/us.anthropic.claude-sonnet-4-6",
        name="Claude Sonnet 4.6 (Recommended)",
        provider=ModelProvider.ANTHROPIC,
        description="Latest Claude Sonnet model with excellent balance of speed and intelligence. Recommended for most analysis tasks.",
        capabilities=[
            ModelCapability.TEXT_ANALYSIS,
            ModelCapability.DATA_ANALYSIS,
            ModelCapability.REASONING,
            ModelCapability.LONG_CONTEXT,
            ModelCapability.MULTILINGUAL,
            ModelCapability.CODE_GENERATION,
        ],
        max_tokens=8096,
        context_window=200000,
        cost_per_1k_input=0.003,
        cost_per_1k_output=0.015,
        speed="fast",
        quality="high",
        best_for=[
            "General data analysis",
            "Business intelligence",
            "Trend analysis",
            "Visualization recommendations",
        ],
        limitations=["May lack depth for highly complex analysis"],
        recommended_use_cases=[
            "Daily data analysis tasks",
            "Dashboard insights",
            "Sales and marketing analytics",
            "Standard business reports",
        ],
    ),
    "claude-sonnet-4": AIModel(
        model_id="arn:aws:bedrock:us-east-1:699038657654:inference-profile/us.anthropic.claude-sonnet-4-20250514-v1:0",
        name="Claude Sonnet 4 (Stable)",
        provider=ModelProvider.ANTHROPIC,
        description="Stable Claude Sonnet 4 model. Reliable for production workloads with consistent performance.",
        capabilities=[
            ModelCapability.TEXT_ANALYSIS,
            ModelCapability.DATA_ANALYSIS,
            ModelCapability.REASONING,
            ModelCapability.LONG_CONTEXT,
            ModelCapability.MULTILINGUAL,
        ],
        max_tokens=8096,
        context_window=200000,
        cost_per_1k_input=0.003,
        cost_per_1k_output=0.015,
        speed="fast",
        quality="high",
        best_for=[
            "Production workloads",
            "Consistent analysis",
            "Business intelligence",
        ],
        limitations=["Slightly older than 4.6"],
        recommended_use_cases=[
            "Production data pipelines",
            "Automated reporting",
            "Operational analytics",
        ],
    ),
    "claude-opus-4-6": AIModel(
        model_id="arn:aws:bedrock:us-east-1:699038657654:inference-profile/us.anthropic.claude-opus-4-6-v1",
        name="Claude Opus 4.6 (Strongest Reasoning)",
        provider=ModelProvider.ANTHROPIC,
        description="Most powerful Claude model with exceptional reasoning. Best for complex multi-step analysis requiring deep insights.",
        capabilities=[
            ModelCapability.TEXT_ANALYSIS,
            ModelCapability.DATA_ANALYSIS,
            ModelCapability.CODE_GENERATION,
            ModelCapability.REASONING,
            ModelCapability.LONG_CONTEXT,
            ModelCapability.MULTILINGUAL,
        ],
        max_tokens=8096,
        context_window=200000,
        cost_per_1k_input=0.015,
        cost_per_1k_output=0.075,
        speed="medium",
        quality="high",
        best_for=[
            "Complex data analysis",
            "Multi-dataset comparisons",
            "Advanced statistical insights",
            "Strategic recommendations",
        ],
        limitations=["Higher cost per request", "Slower response time"],
        recommended_use_cases=[
            "Enterprise-level data analysis",
            "Financial data analysis",
            "Research and academic projects",
            "Complex business intelligence",
        ],
    ),
    "claude-haiku-4-5": AIModel(
        model_id="arn:aws:bedrock:us-east-1:699038657654:inference-profile/us.anthropic.claude-haiku-4-5-20251001-v1:0",
        name="Claude Haiku 4.5 (Fastest Fallback)",
        provider=ModelProvider.ANTHROPIC,
        description="Fastest and most cost-effective Claude model. Perfect for quick insights and high-volume analysis.",
        capabilities=[
            ModelCapability.TEXT_ANALYSIS,
            ModelCapability.DATA_ANALYSIS,
            ModelCapability.SUMMARIZATION,
        ],
        max_tokens=8096,
        context_window=200000,
        cost_per_1k_input=0.00025,
        cost_per_1k_output=0.00125,
        speed="fast",
        quality="medium",
        best_for=[
            "Quick data summaries",
            "High-volume analysis",
            "Real-time insights",
            "Cost-sensitive applications",
        ],
        limitations=["Less detailed analysis", "Limited reasoning depth"],
        recommended_use_cases=[
            "Real-time data monitoring",
            "Batch processing",
            "Quick data checks",
            "Automated reporting",
        ],
    ),

    # ── Legacy Claude 3 model IDs (DISABLED - these models are no longer accessible) ───────────
    # These are kept as comments only. Do NOT add them back to AVAILABLE_MODELS.
    # "claude-3-opus": model_id="anthropic.claude-3-opus-20240229-v1:0"  → Legacy/inaccessible
    # "claude-3-sonnet": model_id="anthropic.claude-3-sonnet-20240229-v1:0" → Legacy/inaccessible
    # "claude-3-haiku": model_id="anthropic.claude-3-haiku-20240307-v1:0" → Legacy/inaccessible
    # "titan-text-express": model_id="amazon.titan-text-express-v1" → ValidationException
    # "llama3-70b": model_id="meta.llama3-70b-instruct-v1:0" → ValidationException
    # "mistral-7b": model_id="mistral.mistral-7b-instruct-v0:2" → ValidationException
    # "mistral-large": model_id="mistral.mistral-large-2402-v1:0" → ValidationException
    # "cohere-command": model_id="cohere.command-text-v14" → ValidationException
}


# ── DISABLED legacy models below (do not uncomment) ──────────────────────────
_LEGACY_DISABLED = {
    "claude-3-opus": AIModel(
        model_id="anthropic.claude-3-opus-20240229-v1:0",
        name="Claude 3 Opus",
        provider=ModelProvider.ANTHROPIC,
        description="Most powerful Claude model with exceptional reasoning and analysis capabilities. Best for complex data analysis requiring deep insights.",
        capabilities=[
            ModelCapability.TEXT_ANALYSIS,
            ModelCapability.DATA_ANALYSIS,
            ModelCapability.CODE_GENERATION,
            ModelCapability.REASONING,
            ModelCapability.LONG_CONTEXT,
            ModelCapability.MULTILINGUAL
        ],
        max_tokens=4096,
        context_window=200000,
        cost_per_1k_input=0.015,
        cost_per_1k_output=0.075,
        speed="medium",
        quality="high",
        best_for=[
            "Complex data analysis",
            "Multi-dataset comparisons",
            "Advanced statistical insights",
            "Strategic recommendations",
            "Large dataset analysis"
        ],
        limitations=[
            "Higher cost per request",
            "Slower response time",
            "May be overkill for simple tasks"
        ],
        recommended_use_cases=[
            "Enterprise-level data analysis",
            "Financial data analysis",
            "Research and academic projects",
            "Complex business intelligence",
            "Multi-dimensional analysis"
        ]
    ),
    
    "claude-3-sonnet": AIModel(
        model_id="anthropic.claude-3-sonnet-20240229-v1:0",
        name="Claude 3 Sonnet",
        provider=ModelProvider.ANTHROPIC,
        description="Balanced model offering excellent performance and cost-effectiveness. Ideal for most data analysis tasks.",
        capabilities=[
            ModelCapability.TEXT_ANALYSIS,
            ModelCapability.DATA_ANALYSIS,
            ModelCapability.REASONING,
            ModelCapability.LONG_CONTEXT,
            ModelCapability.MULTILINGUAL
        ],
        max_tokens=4096,
        context_window=200000,
        cost_per_1k_input=0.003,
        cost_per_1k_output=0.015,
        speed="fast",
        quality="high",
        best_for=[
            "General data analysis",
            "Business intelligence",
            "Trend analysis",
            "Data quality assessment",
            "Visualization recommendations"
        ],
        limitations=[
            "May lack depth for highly complex analysis",
            "Not as detailed as Opus for edge cases"
        ],
        recommended_use_cases=[
            "Daily data analysis tasks",
            "Dashboard insights",
            "Sales and marketing analytics",
            "Operational data analysis",
            "Standard business reports"
        ]
    ),
    
    "claude-3-haiku": AIModel(
        model_id="anthropic.claude-3-haiku-20240307-v1:0",
        name="Claude 3 Haiku",
        provider=ModelProvider.ANTHROPIC,
        description="Fastest and most cost-effective Claude model. Perfect for quick insights and high-volume analysis.",
        capabilities=[
            ModelCapability.TEXT_ANALYSIS,
            ModelCapability.DATA_ANALYSIS,
            ModelCapability.SUMMARIZATION
        ],
        max_tokens=4096,
        context_window=200000,
        cost_per_1k_input=0.00025,
        cost_per_1k_output=0.00125,
        speed="fast",
        quality="medium",
        best_for=[
            "Quick data summaries",
            "High-volume analysis",
            "Real-time insights",
            "Cost-sensitive applications",
            "Simple pattern detection"
        ],
        limitations=[
            "Less detailed analysis",
            "May miss subtle patterns",
            "Limited reasoning depth"
        ],
        recommended_use_cases=[
            "Real-time data monitoring",
            "Batch processing",
            "Quick data checks",
            "Automated reporting",
            "High-frequency analysis"
        ]
    ),
    
    # Amazon Titan Models
    "titan-text-express": AIModel(
        model_id="amazon.titan-text-express-v1",
        name="Amazon Titan Text Express",
        provider=ModelProvider.AMAZON,
        description="Fast and cost-effective model from Amazon. Good for straightforward text analysis and summarization.",
        capabilities=[
            ModelCapability.TEXT_ANALYSIS,
            ModelCapability.SUMMARIZATION
        ],
        max_tokens=8192,
        context_window=8192,
        cost_per_1k_input=0.0002,
        cost_per_1k_output=0.0006,
        speed="fast",
        quality="standard",
        best_for=[
            "Text summarization",
            "Simple data descriptions",
            "Quick insights",
            "Cost-effective analysis"
        ],
        limitations=[
            "Limited analytical depth",
            "Basic reasoning capabilities",
            "Not ideal for complex data"
        ],
        recommended_use_cases=[
            "Text-heavy datasets",
            "Document analysis",
            "Simple summaries",
            "Budget-conscious projects"
        ]
    ),
    
    # Meta Llama Models
    "llama3-70b": AIModel(
        model_id="meta.llama3-70b-instruct-v1:0",
        name="Meta Llama 3 70B",
        provider=ModelProvider.META,
        description="Open-source model with strong reasoning capabilities. Good balance of performance and cost.",
        capabilities=[
            ModelCapability.TEXT_ANALYSIS,
            ModelCapability.DATA_ANALYSIS,
            ModelCapability.REASONING,
            ModelCapability.CODE_GENERATION
        ],
        max_tokens=2048,
        context_window=8192,
        cost_per_1k_input=0.00099,
        cost_per_1k_output=0.00099,
        speed="medium",
        quality="medium",
        best_for=[
            "General purpose analysis",
            "Code generation",
            "Structured data analysis",
            "Open-source preference"
        ],
        limitations=[
            "Smaller context window",
            "May require more specific prompts",
            "Less polished outputs"
        ],
        recommended_use_cases=[
            "Technical data analysis",
            "Code-related insights",
            "Structured data processing",
            "Open-source projects"
        ]
    ),
    
    # Mistral AI Models
    "mistral-7b": AIModel(
        model_id="mistral.mistral-7b-instruct-v0:2",
        name="Mistral 7B Instruct",
        provider=ModelProvider.MISTRAL,
        description="Efficient European model with good multilingual support. Cost-effective for basic analysis.",
        capabilities=[
            ModelCapability.TEXT_ANALYSIS,
            ModelCapability.MULTILINGUAL,
            ModelCapability.SUMMARIZATION
        ],
        max_tokens=8192,
        context_window=32000,
        cost_per_1k_input=0.00015,
        cost_per_1k_output=0.0002,
        speed="fast",
        quality="standard",
        best_for=[
            "Multilingual data",
            "European datasets",
            "Cost-effective analysis",
            "Quick summaries"
        ],
        limitations=[
            "Smaller model size",
            "Less sophisticated reasoning",
            "May struggle with complex tasks"
        ],
        recommended_use_cases=[
            "International data analysis",
            "Multilingual reports",
            "Budget projects",
            "Simple data tasks"
        ]
    ),
    
    "mistral-large": AIModel(
        model_id="mistral.mistral-large-2402-v1:0",
        name="Mistral Large",
        provider=ModelProvider.MISTRAL,
        description="Flagship Mistral model with advanced capabilities. Strong alternative to Claude for European users.",
        capabilities=[
            ModelCapability.TEXT_ANALYSIS,
            ModelCapability.DATA_ANALYSIS,
            ModelCapability.REASONING,
            ModelCapability.MULTILINGUAL,
            ModelCapability.LONG_CONTEXT
        ],
        max_tokens=8192,
        context_window=32000,
        cost_per_1k_input=0.008,
        cost_per_1k_output=0.024,
        speed="medium",
        quality="high",
        best_for=[
            "Complex analysis",
            "Multilingual projects",
            "European compliance",
            "Advanced reasoning"
        ],
        limitations=[
            "Higher cost",
            "Newer model (less tested)",
            "Limited availability in some regions"
        ],
        recommended_use_cases=[
            "European enterprise analysis",
            "GDPR-compliant projects",
            "Multilingual business intelligence",
            "Advanced data science"
        ]
    ),
    
    # Cohere Models
    "cohere-command": AIModel(
        model_id="cohere.command-text-v14",
        name="Cohere Command",
        provider=ModelProvider.COHERE,
        description="Specialized in business communication and analysis. Good for generating reports and insights.",
        capabilities=[
            ModelCapability.TEXT_ANALYSIS,
            ModelCapability.SUMMARIZATION,
            ModelCapability.DATA_ANALYSIS
        ],
        max_tokens=4096,
        context_window=4096,
        cost_per_1k_input=0.0015,
        cost_per_1k_output=0.002,
        speed="fast",
        quality="medium",
        best_for=[
            "Business reports",
            "Executive summaries",
            "Communication-focused analysis",
            "Report generation"
        ],
        limitations=[
            "Smaller context window",
            "Less technical depth",
            "Focused on business use cases"
        ],
        recommended_use_cases=[
            "Business intelligence reports",
            "Executive dashboards",
            "Client-facing analysis",
            "Marketing analytics"
        ]
    )
}


def get_model_by_id(model_id: str) -> AIModel:
    """Get model by ID"""
    for key, model in AVAILABLE_MODELS.items():
        if model.model_id == model_id or key == model_id:
            return model
    raise ValueError(f"Model not found: {model_id}")


def get_all_models() -> Dict[str, Dict[str, Any]]:
    """Get all available models as dictionary"""
    return {key: model.to_dict() for key, model in AVAILABLE_MODELS.items()}


def get_models_by_provider(provider: ModelProvider) -> Dict[str, Dict[str, Any]]:
    """Get models filtered by provider"""
    return {
        key: model.to_dict()
        for key, model in AVAILABLE_MODELS.items()
        if model.provider == provider
    }


def get_recommended_model(
    complexity: str = "medium",
    budget: str = "medium",
    speed_priority: bool = False
) -> AIModel:
    """
    Get recommended model based on requirements
    
    Args:
        complexity: "simple", "medium", "complex"
        budget: "low", "medium", "high"
        speed_priority: Whether speed is critical
        
    Returns:
        Recommended AIModel
    """
    if complexity == "complex" and budget == "high":
        return AVAILABLE_MODELS["claude-opus-4-6"]
    elif speed_priority or budget == "low":
        return AVAILABLE_MODELS["claude-haiku-4-5"]
    else:
        # Default to Claude Sonnet 4.6 - best balance
        return AVAILABLE_MODELS["claude-sonnet-4-6"]


def compare_models(model_ids: List[str]) -> Dict[str, Any]:
    """Compare multiple models side by side"""
    models = [get_model_by_id(mid) for mid in model_ids]
    
    comparison = {
        "models": [m.to_dict() for m in models],
        "comparison": {
            "fastest": min(models, key=lambda m: 0 if m.speed == "fast" else 1 if m.speed == "medium" else 2).name,
            "cheapest": min(models, key=lambda m: m.cost_per_1k_input + m.cost_per_1k_output).name,
            "highest_quality": max(models, key=lambda m: 2 if m.quality == "high" else 1 if m.quality == "medium" else 0).name,
            "largest_context": max(models, key=lambda m: m.context_window).name
        }
    }
    
    return comparison

