from dotenv import load_dotenv
load_dotenv()

import io
import json
from fastapi import FastAPI, File, UploadFile, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import pandas as pd

from database.session import engine, Base, get_db
from database.models import AnalysisSession
import services.ai_service as ai_service

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Data Analyst API")

# Allow the frontend to call the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, set to localhost:3000
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Data Analyst API"}

@app.post("/analyze")
async def analyze_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
    
    contents = await file.read()
    try:
        # Load the CSV into Pandas
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading CSV: {str(e)}")

    # Call Gemini for analysis
    try:
        analysis_result = ai_service.analyze_data_with_gemini(df)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API Error: {str(e)}")

    if "error" in analysis_result:
        raise HTTPException(status_code=500, detail=analysis_result)

    # Save to SQLite memory
    session_record = AnalysisSession(
        filename=file.filename,
        summary=analysis_result.get("summary", ""),
        insights=json.dumps(analysis_result.get("insights", [])),
        chart_data=json.dumps(analysis_result.get("chart_data", {}))
    )
    db.add(session_record)
    db.commit()
    db.refresh(session_record)

    return {
        "id": session_record.id,
        "filename": session_record.filename,
        "analysis": analysis_result
    }
