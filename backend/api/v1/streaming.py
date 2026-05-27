"""
Server-Sent Events (SSE) API for Real-time Streaming
Alternative to WebSocket for one-way server-to-client streaming
"""
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from typing import Optional, AsyncGenerator
import asyncio
import json
import logging
from datetime import datetime

from backend.core.security import get_current_user
from backend.services.bedrock_service import get_bedrock_service
from backend.services.data_processor import DataProcessor

logger = logging.getLogger(__name__)
router = APIRouter()


async def event_generator(
    event_type: str,
    data_id: Optional[str] = None,
    analysis_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> AsyncGenerator[str, None]:
    """
    Generate Server-Sent Events
    
    Yields formatted SSE messages
    """
    try:
        # Send initial connection message
        yield f"event: connected\n"
        yield f"data: {json.dumps({'timestamp': datetime.utcnow().isoformat(), 'message': 'Stream connected'})}\n\n"
        
        # Keep connection alive and send updates
        while True:
            # In production, this would listen to a message queue or database changes
            # For now, we'll send periodic heartbeats
            await asyncio.sleep(5)
            
            yield f"event: heartbeat\n"
            yield f"data: {json.dumps({'timestamp': datetime.utcnow().isoformat()})}\n\n"
            
    except asyncio.CancelledError:
        logger.info(f"SSE stream cancelled: {event_type}")
        yield f"event: disconnected\n"
        yield f"data: {json.dumps({'timestamp': datetime.utcnow().isoformat(), 'message': 'Stream disconnected'})}\n\n"


@router.get("/stream/analysis/{analysis_id}")
async def stream_analysis_progress(
    analysis_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Stream analysis progress updates via SSE
    
    - **analysis_id**: ID of the analysis to monitor
    
    Returns a stream of events:
    - connected: Initial connection
    - progress: Progress updates
    - complete: Analysis completion
    - error: Error notifications
    - heartbeat: Keep-alive messages
    """
    
    async def generate():
        try:
            # Send connection event
            yield f"event: connected\n"
            yield f"data: {json.dumps({'analysis_id': analysis_id, 'timestamp': datetime.utcnow().isoformat()})}\n\n"
            
            # Simulate analysis progress (in production, this would track actual progress)
            progress_steps = [
                (10, "Initializing analysis"),
                (25, "Loading data"),
                (40, "Processing dataset"),
                (60, "Generating insights"),
                (80, "Creating visualizations"),
                (95, "Finalizing results"),
                (100, "Analysis complete")
            ]
            
            for progress, message in progress_steps:
                # Check if client disconnected
                if await request.is_disconnected():
                    logger.info(f"Client disconnected from analysis stream: {analysis_id}")
                    break
                
                # Send progress update
                yield f"event: progress\n"
                yield f"data: {json.dumps({'analysis_id': analysis_id, 'progress': progress, 'message': message, 'timestamp': datetime.utcnow().isoformat()})}\n\n"
                
                # Simulate processing time
                await asyncio.sleep(2)
            
            # Send completion event
            if not await request.is_disconnected():
                yield f"event: complete\n"
                yield f"data: {json.dumps({'analysis_id': analysis_id, 'status': 'completed', 'timestamp': datetime.utcnow().isoformat()})}\n\n"
        
        except Exception as e:
            logger.error(f"SSE stream error: {e}", exc_info=True)
            yield f"event: error\n"
            yield f"data: {json.dumps({'error': str(e), 'timestamp': datetime.utcnow().isoformat()})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )


@router.get("/stream/data/{data_id}")
async def stream_data_updates(
    data_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Stream data updates via SSE
    
    - **data_id**: ID of the data to monitor
    
    Returns a stream of events when data changes
    """
    
    async def generate():
        try:
            yield f"event: connected\n"
            yield f"data: {json.dumps({'data_id': data_id, 'timestamp': datetime.utcnow().isoformat()})}\n\n"
            
            # Monitor for data changes
            while True:
                if await request.is_disconnected():
                    break
                
                # Send heartbeat every 30 seconds
                yield f"event: heartbeat\n"
                yield f"data: {json.dumps({'timestamp': datetime.utcnow().isoformat()})}\n\n"
                
                await asyncio.sleep(30)
        
        except Exception as e:
            logger.error(f"Data stream error: {e}", exc_info=True)
            yield f"event: error\n"
            yield f"data: {json.dumps({'error': str(e), 'timestamp': datetime.utcnow().isoformat()})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/stream/live-analysis")
async def stream_live_analysis(
    request: Request,
    data_source: str = Query(..., description="Data source identifier"),
    interval: int = Query(10, ge=5, le=60, description="Update interval in seconds"),
    current_user: dict = Depends(get_current_user)
):
    """
    Stream live data analysis updates
    
    - **data_source**: Source of live data
    - **interval**: Update interval in seconds (5-60)
    
    Continuously analyzes incoming data and streams insights
    """
    
    async def generate():
        try:
            yield f"event: connected\n"
            yield f"data: {json.dumps({'data_source': data_source, 'interval': interval, 'timestamp': datetime.utcnow().isoformat()})}\n\n"
            
            bedrock_service = get_bedrock_service()
            data_processor = DataProcessor()
            
            iteration = 0
            while True:
                if await request.is_disconnected():
                    break
                
                iteration += 1
                
                try:
                    # In production, fetch real-time data from the source
                    # For demo, we'll send simulated updates
                    
                    yield f"event: update\n"
                    yield f"data: {json.dumps({'iteration': iteration, 'data_source': data_source, 'status': 'processing', 'timestamp': datetime.utcnow().isoformat()})}\n\n"
                    
                    # Simulate data processing
                    await asyncio.sleep(interval)
                    
                    # Send analysis result
                    yield f"event: analysis\n"
                    yield f"data: {json.dumps({'iteration': iteration, 'insights': f'Analysis iteration {iteration}', 'timestamp': datetime.utcnow().isoformat()})}\n\n"
                
                except Exception as e:
                    logger.error(f"Live analysis error: {e}")
                    yield f"event: error\n"
                    yield f"data: {json.dumps({'error': str(e), 'timestamp': datetime.utcnow().isoformat()})}\n\n"
        
        except Exception as e:
            logger.error(f"Live stream error: {e}", exc_info=True)
            yield f"event: error\n"
            yield f"data: {json.dumps({'error': str(e), 'timestamp': datetime.utcnow().isoformat()})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/stream/metrics")
async def stream_metrics(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Stream real-time system metrics
    
    Returns continuous stream of system performance metrics
    """
    
    async def generate():
        try:
            yield f"event: connected\n"
            yield f"data: {json.dumps({'timestamp': datetime.utcnow().isoformat()})}\n\n"
            
            while True:
                if await request.is_disconnected():
                    break
                
                # Get current metrics
                from backend.core.monitoring import get_metrics_summary
                metrics = get_metrics_summary()
                
                yield f"event: metrics\n"
                yield f"data: {json.dumps({'metrics': metrics, 'timestamp': datetime.utcnow().isoformat()})}\n\n"
                
                await asyncio.sleep(5)
        
        except Exception as e:
            logger.error(f"Metrics stream error: {e}", exc_info=True)
            yield f"event: error\n"
            yield f"data: {json.dumps({'error': str(e), 'timestamp': datetime.utcnow().isoformat()})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
