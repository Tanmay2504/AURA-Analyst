"""
API v1 Router
Aggregates all v1 API endpoints
"""
from fastapi import APIRouter

from backend.api.v1 import analysis, data, auth, users, websocket, streaming, models, admin

router = APIRouter()

# Include sub-routers
router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
router.include_router(users.router, prefix="/users", tags=["Users"])
router.include_router(data.router, prefix="/data", tags=["Data Management"])
router.include_router(analysis.router, prefix="/analysis", tags=["Analysis"])
router.include_router(models.router, prefix="/ai", tags=["AI Models"])
router.include_router(websocket.router, prefix="/realtime", tags=["Real-time"])
router.include_router(streaming.router, prefix="/realtime", tags=["Streaming"])
router.include_router(admin.router, tags=["Admin"])
