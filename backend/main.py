"""
AURA Analyst - Industry-Grade Data Analysis Platform
Main application with comprehensive features
"""
from fastapi import FastAPI, Request, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import logging
import time
import re
from typing import Dict, Any

from backend.config.settings import settings
from backend.core.logging_config import setup_logging
from backend.core.exceptions import BaseAPIException
from backend.core.monitoring import metrics_collector, get_metrics_summary
from backend.api.v1 import router as api_v1_router

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")  # reload trigger
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    
    # Initialize database tables
    try:
        from backend.database.session import engine
        from backend.database.models import Base
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized")
    except Exception as e:
        logger.warning(f"Database initialization failed: {e}")

    # Initialize services
    try:
        from backend.services.bedrock_service import get_bedrock_service
        bedrock = get_bedrock_service()
        logger.info("AWS Bedrock service initialized")
    except Exception as e:
        logger.warning(f"Bedrock initialization failed: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down application")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Industry-grade AI-powered data analysis platform",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)


# Middleware Configuration

# CORS — support exact origins + *.vercel.app wildcard
def _is_allowed_origin(origin: str) -> bool:
    """Check if origin is in the allowed list, supporting *.vercel.app wildcard."""
    for allowed in settings.CORS_ORIGINS:
        if allowed == origin:
            return True
        if allowed.startswith("https://*.") and origin.startswith("https://"):
            suffix = allowed[len("https://*."):]  # e.g. "vercel.app"
            if origin[len("https://"):].endswith("." + suffix) or origin[len("https://"):] == suffix:
                return True
    return False

# Build a concrete list for CORSMiddleware (wildcard entries replaced by allow_all)
_explicit_origins = [o for o in settings.CORS_ORIGINS if not o.startswith("https://*.")]
_has_wildcard = any(o.startswith("https://*.") for o in settings.CORS_ORIGINS)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _has_wildcard else _explicit_origins,
    allow_credentials=False if _has_wildcard else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip compression
app.add_middleware(GZipMiddleware, minimum_size=1000)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests with timing"""
    request_id = request.headers.get("X-Request-ID", f"req_{int(time.time() * 1000)}")
    start_time = time.time()
    
    # Add request ID to request state
    request.state.request_id = request_id
    
    # Log request
    logger.info(
        f"Request started",
        extra={
            "extra_data": {
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "client": request.client.host if request.client else None
            }
        }
    )
    
    # Process request
    try:
        response = await call_next(request)
        duration = time.time() - start_time
        
        # Log response
        logger.info(
            f"Request completed",
            extra={
                "extra_data": {
                    "request_id": request_id,
                    "duration": f"{duration:.3f}s",
                    "status_code": response.status_code
                }
            }
        )
        
        # Add headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{duration:.3f}s"
        
        return response
    except Exception as e:
        duration = time.time() - start_time
        logger.error(
            f"Request failed: {str(e)}",
            extra={
                "extra_data": {
                    "request_id": request_id,
                    "duration": f"{duration:.3f}s",
                    "error": str(e)
                }
            }
        )
        raise


# Exception Handlers

@app.exception_handler(BaseAPIException)
async def api_exception_handler(request: Request, exc: BaseAPIException):
    """Handle custom API exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.error_code,
                "message": exc.detail,
                "metadata": exc.metadata
            },
            "request_id": getattr(request.state, "request_id", None)
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": exc.errors()
            },
            "request_id": getattr(request.state, "request_id", None)
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred" if not settings.DEBUG else str(exc)
            },
            "request_id": getattr(request.state, "request_id", None)
        }
    )


# Health Check Endpoints

@app.get("/health", tags=["Health"])
async def health_check() -> Dict[str, Any]:
    """Basic health check"""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT
    }


@app.get("/health/detailed", tags=["Health"])
async def detailed_health_check() -> Dict[str, Any]:
    """Detailed health check with service status"""
    health_status = {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "services": {}
    }
    
    # Check Bedrock service
    try:
        from backend.services.bedrock_service import get_bedrock_service
        bedrock = get_bedrock_service()
        health_status["services"]["bedrock"] = "healthy"
    except Exception as e:
        health_status["services"]["bedrock"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check database
    try:
        from backend.database.session import get_db
        health_status["services"]["database"] = "healthy"
    except Exception as e:
        health_status["services"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check cache
    try:
        from backend.core.cache import cache_manager
        health_status["services"]["cache"] = "healthy" if cache_manager.redis_client else "memory"
    except Exception as e:
        health_status["services"]["cache"] = f"unhealthy: {str(e)}"
    
    return health_status


@app.get("/metrics", tags=["Monitoring"])
async def get_metrics() -> Dict[str, Any]:
    """Get application metrics"""
    return get_metrics_summary()


# API Routes
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)

# Admin routes - registered directly to ensure they are always available
from backend.api.v1.admin import router as admin_router
app.include_router(admin_router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["Admin"])


# ============================================================================
# Legacy compatibility routes - frontend calls these directly
# ============================================================================
from fastapi import File, UploadFile, Form
from fastapi.responses import JSONResponse as LegacyJSONResponse
from typing import List, Optional
import io
import json
from datetime import datetime

@app.post("/analyze", tags=["Legacy"])
async def legacy_analyze(
    file: UploadFile = File(...),
    model_id: Optional[str] = Form(None),
):
    """Legacy /analyze endpoint - proxies to main.py logic using ai_service"""
    import asyncio
    import pandas as pd
    from fastapi import HTTPException
    from backend.core.exceptions import AIServiceError

    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")

    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading CSV: {str(e)}")

    try:
        import backend.services.ai_service as ai_service
        # Run the synchronous blocking Bedrock call in a thread pool to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        analysis_result = await loop.run_in_executor(
            None, lambda: ai_service.analyze_data_with_gemini(df, model_id=model_id)
        )
    except AIServiceError as e:
        raise HTTPException(status_code=getattr(e, 'status_code', 503), detail=str(getattr(e, 'detail', e)))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis Error: {str(e)}")

    if "error" in analysis_result:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=analysis_result["error"])

    # Save to DB
    try:
        from backend.database.session import SessionLocal
        from backend.database.models import AnalysisResult

        def _parse(value, default):
            if value is None:
                return default
            if isinstance(value, (dict, list)):
                return value
            if isinstance(value, (bytes, bytearray)):
                try:
                    return json.loads(value.decode("utf-8"))
                except Exception:
                    return default
            if isinstance(value, str):
                try:
                    return json.loads(value)
                except Exception:
                    return default
            return value

        db: Session = SessionLocal()
        try:
            insights = _parse(analysis_result.get("insights", []), [])
            chart_data = _parse(analysis_result.get("chart_data", {}), {})
            forecast_data = _parse(analysis_result.get("forecast_data"), None)
            analysis_metadata = _parse(analysis_result.get("analysis_metadata"), None)
            agent_status = _parse(analysis_result.get("agent_status", []), [])
            model_used = analysis_result.get("model_used")
            if isinstance(analysis_metadata, dict) and model_used:
                analysis_metadata = {**analysis_metadata, "model_used": model_used}

            record = AnalysisResult(
                filename=file.filename,
                summary=analysis_result.get("summary", "No summary available"),
                insights=insights,
                chart_data=chart_data,
                forecast_data=forecast_data,
                analysis_metadata=analysis_metadata,
                agent_status=agent_status,
                raw_csv=contents,
                created_at=datetime.utcnow(),
            )
            db.add(record)
            db.commit()
            db.refresh(record)

            return {
                "id": record.id,
                "filename": record.filename,
                "summary": record.summary,
                "insights": _parse(record.insights, []),
                "chart_data": _parse(record.chart_data, {}),
                "forecast_data": _parse(getattr(record, "forecast_data", None), None),
                "analysis_metadata": _parse(getattr(record, "analysis_metadata", None), None),
                "agent_status": _parse(getattr(record, "agent_status", None), []),
                "created_at": record.created_at.isoformat(),
            }
        finally:
            db.close()
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")


@app.post("/analyze/batch", tags=["Legacy"])
async def legacy_analyze_batch(
    files: List[UploadFile] = File(...),
    model_id: Optional[str] = Form(None),
):
    """Legacy /analyze/batch endpoint"""
    import pandas as pd
    from fastapi import HTTPException
    import backend.services.ai_service as ai_service
    from backend.database.session import SessionLocal
    from backend.database.models import AnalysisResult

    if not files:
        raise HTTPException(status_code=400, detail="Please upload at least one CSV file.")

    def _parse(value, default):
        if value is None:
            return default
        if isinstance(value, (dict, list)):
            return value
        if isinstance(value, (bytes, bytearray)):
            try:
                return json.loads(value.decode("utf-8"))
            except Exception:
                return default
        if isinstance(value, str):
            try:
                return json.loads(value)
            except Exception:
                return default
        return value

    analysis_packets = []
    saved_records = []
    db = SessionLocal()
    try:
        for file in files:
            if not file.filename.endswith(".csv"):
                raise HTTPException(status_code=400, detail=f"Only CSV files are allowed. Invalid: {file.filename}")
            contents = await file.read()
            try:
                df = pd.read_csv(io.BytesIO(contents))
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Error reading {file.filename}: {str(e)}")

            result = ai_service.analyze_dataframe_locally(df, fast=True, include_forecast=False)
            insights = _parse(result.get("insights", []), [])
            chart_data = _parse(result.get("chart_data", {}), {})
            forecast_data = _parse(result.get("forecast_data"), None)
            analysis_metadata = _parse(result.get("analysis_metadata"), None)
            agent_status = _parse(result.get("agent_status", []), [])

            record = AnalysisResult(
                filename=file.filename,
                summary=result.get("summary", ""),
                insights=insights,
                chart_data=chart_data,
                forecast_data=forecast_data,
                analysis_metadata=analysis_metadata,
                agent_status=agent_status,
                raw_csv=contents,
                created_at=datetime.utcnow(),
            )
            db.add(record)
            db.commit()
            db.refresh(record)

            saved = {
                "id": record.id,
                "filename": record.filename,
                "summary": record.summary,
                "insights": _parse(record.insights, []),
                "chart_data": _parse(record.chart_data, {}),
                "forecast_data": _parse(getattr(record, "forecast_data", None), None),
                "analysis_metadata": _parse(getattr(record, "analysis_metadata", None), None),
                "agent_status": _parse(getattr(record, "agent_status", None), []),
                "created_at": record.created_at.isoformat(),
            }
            saved_records.append(saved)
            analysis_packets.append({
                "filename": saved["filename"],
                "summary": saved["summary"],
                "insights": saved["insights"],
                "chart_data": saved["chart_data"],
            })

        connections = ai_service.compare_datasets_with_gemini(analysis_packets)
        return {
            "total_files": len(saved_records),
            "datasets": saved_records,
            "connections": {
                "summary": connections.get("summary", ""),
                "shared_patterns": connections.get("shared_patterns", []),
                "key_differences": connections.get("key_differences", []),
                "recommended_storyline": connections.get("recommended_storyline", ""),
                "insight_connections": connections.get("insight_connections", []),
            },
            "metadata": {
                "file_count": len(saved_records),
                "filenames": [r["filename"] for r in saved_records],
            },
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Batch analysis error: {str(e)}")
    finally:
        db.close()


@app.get("/history", tags=["Legacy"])
async def legacy_history(skip: int = 0, limit: int = 50):
    """Legacy /history endpoint"""
    from backend.database.session import SessionLocal
    from backend.database.models import AnalysisResult

    def _parse(value, default):
        if value is None:
            return default
        if isinstance(value, (dict, list)):
            return value
        if isinstance(value, (bytes, bytearray)):
            try:
                return json.loads(value.decode("utf-8"))
            except Exception:
                return default
        if isinstance(value, str):
            try:
                return json.loads(value)
            except Exception:
                return default
        return value

    db = SessionLocal()
    try:
        records = db.query(AnalysisResult).order_by(AnalysisResult.created_at.desc()).offset(skip).limit(limit).all()
        total = db.query(AnalysisResult).count()
        result_list = []
        for r in records:
            result_list.append({
                "id": r.id,
                "filename": r.filename,
                "summary": r.summary,
                "insights": _parse(r.insights, []),
                "chart_data": _parse(r.chart_data, {}),
                "forecast_data": _parse(getattr(r, "forecast_data", None), None),
                "analysis_metadata": _parse(getattr(r, "analysis_metadata", None), None),
                "agent_status": _parse(getattr(r, "agent_status", None), []),
                "created_at": r.created_at.isoformat(),
            })
        return {"records": result_list, "total": total}
    finally:
        db.close()


@app.get("/analysis/{analysis_id}", tags=["Legacy"])
async def legacy_get_analysis(analysis_id: int):
    """Legacy /analysis/{id} endpoint"""
    from fastapi import HTTPException
    from backend.database.session import SessionLocal
    from backend.database.models import AnalysisResult

    def _parse(value, default):
        if value is None:
            return default
        if isinstance(value, (dict, list)):
            return value
        if isinstance(value, (bytes, bytearray)):
            try:
                return json.loads(value.decode("utf-8"))
            except Exception:
                return default
        if isinstance(value, str):
            try:
                return json.loads(value)
            except Exception:
                return default
        return value

    db = SessionLocal()
    try:
        record = db.query(AnalysisResult).filter(AnalysisResult.id == analysis_id).first()
        if not record:
            raise HTTPException(status_code=404, detail="Analysis record not found")
        return {
            "id": record.id,
            "filename": record.filename,
            "summary": record.summary,
            "insights": _parse(record.insights, []),
            "chart_data": _parse(record.chart_data, {}),
            "forecast_data": _parse(getattr(record, "forecast_data", None), None),
            "analysis_metadata": _parse(getattr(record, "analysis_metadata", None), None),
            "agent_status": _parse(getattr(record, "agent_status", None), []),
            "created_at": record.created_at.isoformat(),
        }
    finally:
        db.close()


# ============================================================================
# Columns list endpoint - returns actual column names from the stored CSV
# ============================================================================
@app.get("/columns/{analysis_id}", tags=["Legacy"])
async def get_columns(analysis_id: int):
    """Return the list of column names for a stored analysis"""
    import pandas as pd
    from fastapi import HTTPException
    from backend.database.session import SessionLocal
    from backend.database.models import AnalysisResult

    db = SessionLocal()
    try:
        record = db.query(AnalysisResult).filter(AnalysisResult.id == analysis_id).first()
        if not record:
            raise HTTPException(status_code=404, detail="Analysis not found")
        raw_csv = record.raw_csv
    finally:
        db.close()

    try:
        df = pd.read_csv(io.BytesIO(raw_csv))
        return {"columns": df.columns.tolist(), "rows": len(df)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not read dataset: {e}")


# ============================================================================
# Natural Language Query endpoint
# ============================================================================
@app.post("/query/{analysis_id}", tags=["Legacy"])
async def nl_query(analysis_id: int, request: Request):
    """Answer a natural language question about a previously analyzed dataset"""
    import asyncio
    import pandas as pd
    from fastapi import HTTPException
    from backend.database.session import SessionLocal
    from backend.database.models import AnalysisResult
    from backend.services.bedrock_service import get_bedrock_service

    body = await request.json()
    question = body.get("question", "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    db = SessionLocal()
    try:
        record = db.query(AnalysisResult).filter(AnalysisResult.id == analysis_id).first()
        if not record:
            raise HTTPException(status_code=404, detail="Analysis not found")
        raw_csv = record.raw_csv
    finally:
        db.close()

    try:
        df = pd.read_csv(io.BytesIO(raw_csv))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not read dataset: {e}")

    # Build a compact data profile for the prompt
    profile_lines = []
    profile_lines.append(f"Dataset: {record.filename}, {len(df)} rows x {len(df.columns)} columns")
    profile_lines.append(f"Columns: {', '.join(df.columns.tolist())}")
    for col in df.select_dtypes(include="number").columns[:10]:
        s = df[col]
        profile_lines.append(f"  {col}: min={s.min():.2f}, max={s.max():.2f}, mean={s.mean():.2f}, nulls={s.isna().sum()}")
    for col in df.select_dtypes(include="object").columns[:5]:
        top = df[col].value_counts().head(3).to_dict()
        profile_lines.append(f"  {col} (categorical): top values = {top}")
    profile = "\n".join(profile_lines)

    prompt = f"""You are a data analyst. Answer the following question about this dataset concisely and accurately.

Dataset Profile:
{profile}

Question: {question}

Provide a direct, helpful answer. If the question asks for a number or comparison, give the exact value from the data. Keep the answer under 200 words."""

    try:
        bedrock = get_bedrock_service()
        body_json = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 512,
            "temperature": 0.2,
            "messages": [{"role": "user", "content": prompt}],
        })
        loop = asyncio.get_event_loop()
        def _call():
            resp = bedrock.client.invoke_model(
                modelId=bedrock.model_id,
                body=body_json,
                contentType="application/json",
                accept="application/json",
            )
            return json.loads(resp["body"].read())
        response_body = await loop.run_in_executor(None, _call)
        content = response_body.get("content", [])
        answer = content[0].get("text", "").strip() if content else "No answer generated."
        return {"question": question, "answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


# ============================================================================
# Column-level analysis endpoint
# ============================================================================
@app.get("/column/{analysis_id}/{column_name}", tags=["Legacy"])
async def column_analysis(analysis_id: int, column_name: str):
    """Get deep-dive statistics for a specific column"""
    import pandas as pd
    from fastapi import HTTPException
    from backend.database.session import SessionLocal
    from backend.database.models import AnalysisResult

    db = SessionLocal()
    try:
        record = db.query(AnalysisResult).filter(AnalysisResult.id == analysis_id).first()
        if not record:
            raise HTTPException(status_code=404, detail="Analysis not found")
        raw_csv = record.raw_csv
    finally:
        db.close()

    try:
        df = pd.read_csv(io.BytesIO(raw_csv))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not read dataset: {e}")

    if column_name not in df.columns:
        raise HTTPException(status_code=404, detail=f"Column '{column_name}' not found")

    col = df[column_name]
    result = {
        "column": column_name,
        "dtype": str(col.dtype),
        "total_values": int(len(col)),
        "missing": int(col.isna().sum()),
        "missing_pct": round(col.isna().mean() * 100, 2),
        "unique": int(col.nunique()),
    }

    if col.dtype in ["int64", "float64"] or str(col.dtype).startswith("float") or str(col.dtype).startswith("int"):
        result.update({
            "min": float(col.min()),
            "max": float(col.max()),
            "mean": round(float(col.mean()), 4),
            "median": round(float(col.median()), 4),
            "std": round(float(col.std()), 4),
            "q25": round(float(col.quantile(0.25)), 4),
            "q75": round(float(col.quantile(0.75)), 4),
            "outliers": int(((col < col.quantile(0.01)) | (col > col.quantile(0.99))).sum()),
            "histogram": _build_histogram(col),
        })
    else:
        vc = col.value_counts().head(10)
        result.update({
            "top_values": [{"value": str(k), "count": int(v)} for k, v in vc.items()],
            "bar_data": [{"name": str(k), "value": int(v)} for k, v in vc.items()],
        })

    return result


def _build_histogram(series, bins: int = 10):
    """Build histogram bucket data for a numeric series"""
    import numpy as np
    clean = series.dropna()
    if len(clean) == 0:
        return []
    counts, edges = np.histogram(clean, bins=bins)
    return [
        {"range": f"{edges[i]:.1f}–{edges[i+1]:.1f}", "count": int(counts[i])}
        for i in range(len(counts))
    ]


# Keep-alive endpoint - ping this every 5 min to prevent Render cold starts
@app.get("/ping", tags=["Health"])
async def ping():
    """Lightweight keep-alive endpoint"""
    return {"status": "ok"}


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": "Industry-grade AI-powered data analysis platform",
        "docs": "/api/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "backend.main_v2:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )