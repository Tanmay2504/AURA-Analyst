from dotenv import load_dotenv
load_dotenv()

import io
import json
from typing import List, Optional, Any
from datetime import datetime
from fastapi import FastAPI, File, UploadFile, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import inspect
import pandas as pd

from backend.database.session import engine, Base, get_db
from backend.database.models import AnalysisResult
import backend.services.ai_service as ai_service

# Create database tables
Base.metadata.create_all(bind=engine)


def _ensure_analysis_result_schema() -> None:
    """Add missing columns for SQLite databases created before schema expansion."""
    if engine.dialect.name != "sqlite":
        return

    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    if "analysis_results" not in existing_tables:
        return

    existing_columns = {column["name"] for column in inspector.get_columns("analysis_results")}
    column_definitions = {
        "forecast_data": "TEXT",
        "agent_status": "TEXT",
        "raw_csv": "BLOB",
    }

    with engine.begin() as connection:
        for column_name, column_type in column_definitions.items():
            if column_name not in existing_columns:
                connection.exec_driver_sql(
                    f"ALTER TABLE analysis_results ADD COLUMN {column_name} {column_type}"
                )


_ensure_analysis_result_schema()

app = FastAPI(
    title="AURA Analyst API",
    description="Production-grade AI Data Analysis API with persistence",
    version="1.0.0"
)

# ============================================================================
# TIER 1: API Layer - CORS Configuration
# ============================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# TIER 1: API Layer - Response Models
# ============================================================================
class AnalysisResponse(BaseModel):
    id: int
    filename: str
    summary: str
    insights: List[str]
    chart_data: dict
    forecast_data: Optional[dict] = None
    agent_status: List[str] = Field(default_factory=list)
    created_at: datetime

    class Config:
        from_attributes = True

class HistoryResponse(BaseModel):
    records: List[AnalysisResponse]
    total: int


def _parse_json_value(value: Any, default: Any):
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


def _serialize_analysis_record(record: AnalysisResult) -> AnalysisResponse:
    return AnalysisResponse(
        id=record.id,
        filename=record.filename,
        summary=record.summary,
        insights=_parse_json_value(record.insights, []),
        chart_data=_parse_json_value(record.chart_data, {}),
        forecast_data=_parse_json_value(getattr(record, "forecast_data", None), None),
        agent_status=_parse_json_value(getattr(record, "agent_status", None), []),
        created_at=record.created_at,
    )

# ============================================================================
# TIER 1: API Layer - Health Check
# ============================================================================
@app.get("/")
def read_root():
    return {
        "message": "Welcome to AURA Analyst API",
        "status": "operational",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# ============================================================================
# TIER 2: Business Logic Layer - Analysis Processing
# ============================================================================
@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Endpoint: POST /analyze
    Purpose: Process CSV file and generate AI-driven analysis
    Persistence: Saves all successful analyses to the database
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
    
    contents = await file.read()
    try:
        # Load the CSV into Pandas
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading CSV: {str(e)}")

    # Call Gemini for analysis (Service Layer)
    try:
        analysis_result = ai_service.analyze_data_with_gemini(df)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API Error: {str(e)}")

    if "error" in analysis_result:
        raise HTTPException(status_code=500, detail=analysis_result["error"])

    # ========================================================================
    # TIER 3: Persistence Layer - Database Integration
    # ========================================================================
    try:
        insights = _parse_json_value(analysis_result.get("insights", []), [])
        chart_data = _parse_json_value(analysis_result.get("chart_data", {}), {})
        forecast_data = _parse_json_value(analysis_result.get("forecast_data", None), None)
        agent_status = _parse_json_value(analysis_result.get("agent_status", []), [])

        # Create and save analysis record
        result_record = AnalysisResult(
            filename=file.filename,
            summary=analysis_result.get("summary", "No summary available"),
            insights=insights,
            chart_data=chart_data,
            forecast_data=forecast_data,
            agent_status=agent_status,
            raw_csv=contents,
            created_at=datetime.utcnow()
        )
        db.add(result_record)
        db.commit()
        db.refresh(result_record)

        return _serialize_analysis_record(result_record)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

# ============================================================================
# TIER 2: Business Logic Layer - History Retrieval
# ============================================================================
@app.get("/history", response_model=HistoryResponse)
async def get_analysis_history(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Endpoint: GET /history
    Purpose: Retrieve all past analysis records
    Pagination: Supports skip and limit parameters
    """
    try:
        # Query all analysis results ordered by most recent first
        records = db.query(AnalysisResult)\
            .order_by(AnalysisResult.created_at.desc())\
            .offset(skip)\
            .limit(limit)\
            .all()
        
        total = db.query(AnalysisResult).count()

        # Convert records to response models
        analysis_records = [_serialize_analysis_record(record) for record in records]

        return HistoryResponse(records=analysis_records, total=total)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching history: {str(e)}")

# ============================================================================
# TIER 2: Business Logic Layer - Individual Result Retrieval
# ============================================================================
@app.get("/analysis/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis_detail(analysis_id: int, db: Session = Depends(get_db)):
    """
    Endpoint: GET /analysis/{analysis_id}
    Purpose: Retrieve a specific analysis result by ID
    """
    try:
        record = db.query(AnalysisResult).filter(AnalysisResult.id == analysis_id).first()
        
        if not record:
            raise HTTPException(status_code=404, detail="Analysis record not found")

        return _serialize_analysis_record(record)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching analysis: {str(e)}")

# ============================================================================
# Error Handlers
# ============================================================================
@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return {
        "error": "An unexpected error occurred",
        "detail": str(exc)
    }
