from dotenv import load_dotenv
load_dotenv()

import io
import json
from typing import List, Optional
from datetime import datetime
from fastapi import FastAPI, File, UploadFile, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
import pandas as pd

from database.session import engine, Base, get_db
from database.models import AnalysisResult
import services.ai_service as ai_service

# Create database tables
Base.metadata.create_all(bind=engine)

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
    created_at: datetime

    class Config:
        from_attributes = True

class HistoryResponse(BaseModel):
    records: List[AnalysisResponse]
    total: int

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
        # Ensure insights and chart_data are valid JSON
        insights = analysis_result.get("insights", [])
        if isinstance(insights, str):
            insights = json.loads(insights)
        
        chart_data = analysis_result.get("chart_data", {})
        if isinstance(chart_data, str):
            chart_data = json.loads(chart_data)

        # Create and save analysis record
        result_record = AnalysisResult(
            filename=file.filename,
            summary=analysis_result.get("summary", "No summary available"),
            insights=json.dumps(insights),
            chart_data=json.dumps(chart_data),
            created_at=datetime.utcnow()
        )
        db.add(result_record)
        db.commit()
        db.refresh(result_record)

        return AnalysisResponse(
            id=result_record.id,
            filename=result_record.filename,
            summary=result_record.summary,
            insights=json.loads(result_record.insights),
            chart_data=json.loads(result_record.chart_data),
            created_at=result_record.created_at
        )
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
        analysis_records = [
            AnalysisResponse(
                id=record.id,
                filename=record.filename,
                summary=record.summary,
                insights=json.loads(record.insights),
                chart_data=json.loads(record.chart_data),
                created_at=record.created_at
            )
            for record in records
        ]

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

        return AnalysisResponse(
            id=record.id,
            filename=record.filename,
            summary=record.summary,
            insights=json.loads(record.insights),
            chart_data=json.loads(record.chart_data),
            created_at=record.created_at
        )
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
