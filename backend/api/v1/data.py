"""
Data Management API Endpoints
File upload, processing, and management
"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import logging
import os
from pathlib import Path

from backend.services.data_processor import DataProcessor
from backend.core.security import get_current_user
from backend.core.exceptions import FileProcessingError, ValidationError
from backend.config.settings import settings

logger = logging.getLogger(__name__)
router = APIRouter()


class DataUploadResponse(BaseModel):
    """Data upload response"""
    data_id: str
    filename: str
    size: int
    rows: int
    columns: int
    status: str


@router.post("/upload", response_model=DataUploadResponse)
async def upload_data(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    current_user: Dict = Depends(get_current_user)
):
    """
    Upload and process data file
    
    Supported formats: CSV, Excel, JSON, Parquet
    Maximum size: 100MB
    """
    try:
        # Validate file
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in settings.ALLOWED_EXTENSIONS:
            raise ValidationError(
                f"Unsupported file type: {file_ext}. "
                f"Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"
            )
        
        # Check file size
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset
        
        if file_size > settings.MAX_UPLOAD_SIZE:
            raise ValidationError(
                f"File too large: {file_size} bytes. "
                f"Maximum: {settings.MAX_UPLOAD_SIZE} bytes"
            )
        
        # Save file
        upload_dir = Path(settings.UPLOAD_DIR)
        upload_dir.mkdir(exist_ok=True)
        
        data_id = f"data_{int(os.urandom(8).hex(), 16)}"
        file_path = upload_dir / f"{data_id}{file_ext}"
        
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        logger.info(f"File uploaded: {file_path}")
        
        # Process file
        data_processor = DataProcessor()
        metadata = await data_processor.process_file(str(file_path), data_id)
        
        # Store metadata in background
        if background_tasks:
            background_tasks.add_task(
                store_data_metadata,
                data_id,
                metadata,
                current_user["user_id"]
            )
        
        return DataUploadResponse(
            data_id=data_id,
            filename=file.filename,
            size=file_size,
            rows=metadata.get("row_count", 0),
            columns=metadata.get("column_count", 0),
            status="processed"
        )
        
    except ValidationError:
        raise
    except Exception as e:
        logger.error(f"File upload failed: {e}", exc_info=True)
        raise FileProcessingError(f"Failed to process file: {str(e)}")


@router.get("/list")
async def list_data(
    current_user: Dict = Depends(get_current_user)
):
    """List all uploaded datasets for current user"""
    # In production, fetch from database
    return {
        "datasets": [],
        "total": 0
    }


@router.get("/{data_id}/summary")
async def get_data_summary(
    data_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Get summary of uploaded data"""
    data_processor = DataProcessor()
    summary = await data_processor.get_data_summary(data_id)
    
    if not summary:
        raise ValidationError(f"Data not found: {data_id}")
    
    return summary


@router.delete("/{data_id}")
async def delete_data(
    data_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Delete uploaded data"""
    # In production, delete from storage and database
    return {
        "message": f"Data {data_id} deleted successfully"
    }


async def store_data_metadata(
    data_id: str,
    metadata: Dict[str, Any],
    user_id: str
):
    """Store data metadata in database (background task)"""
    try:
        # In production, store in database
        logger.info(f"Stored metadata for data: {data_id}")
    except Exception as e:
        logger.error(f"Failed to store metadata: {e}")