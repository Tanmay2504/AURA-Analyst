"""
WebSocket API for Real-time Data Streaming
Provides real-time updates for analysis progress and data changes
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from typing import Dict, Set, Optional, Any
import asyncio
import json
import logging
from datetime import datetime

from backend.core.security import verify_ws_token
from backend.core.exceptions import AuthenticationError

logger = logging.getLogger(__name__)
router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections and broadcasts"""
    
    def __init__(self):
        # Store active connections by user_id
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Store connections by channel (e.g., analysis_id, data_id)
        self.channels: Dict[str, Set[WebSocket]] = {}
        self._lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket, user_id: str, channel: Optional[str] = None):
        """Accept and register a new WebSocket connection"""
        await websocket.accept()
        
        async with self._lock:
            # Add to user connections
            if user_id not in self.active_connections:
                self.active_connections[user_id] = set()
            self.active_connections[user_id].add(websocket)
            
            # Add to channel if specified
            if channel:
                if channel not in self.channels:
                    self.channels[channel] = set()
                self.channels[channel].add(websocket)
        
        logger.info(f"WebSocket connected: user={user_id}, channel={channel}")
        
        # Send welcome message
        await self.send_personal_message(
            {
                "type": "connection",
                "status": "connected",
                "timestamp": datetime.utcnow().isoformat(),
                "message": "Real-time connection established"
            },
            websocket
        )
    
    async def disconnect(self, websocket: WebSocket, user_id: str):
        """Remove a WebSocket connection"""
        async with self._lock:
            # Remove from user connections
            if user_id in self.active_connections:
                self.active_connections[user_id].discard(websocket)
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
            
            # Remove from all channels
            for channel in list(self.channels.keys()):
                self.channels[channel].discard(websocket)
                if not self.channels[channel]:
                    del self.channels[channel]
        
        logger.info(f"WebSocket disconnected: user={user_id}")
    
    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket):
        """Send message to a specific connection"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
    
    async def broadcast_to_user(self, message: Dict[str, Any], user_id: str):
        """Broadcast message to all connections of a user"""
        if user_id in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Failed to broadcast to user {user_id}: {e}")
                    disconnected.add(connection)
            
            # Clean up disconnected connections
            if disconnected:
                async with self._lock:
                    self.active_connections[user_id] -= disconnected
    
    async def broadcast_to_channel(self, message: Dict[str, Any], channel: str):
        """Broadcast message to all connections in a channel"""
        if channel in self.channels:
            disconnected = set()
            for connection in self.channels[channel]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Failed to broadcast to channel {channel}: {e}")
                    disconnected.add(connection)
            
            # Clean up disconnected connections
            if disconnected:
                async with self._lock:
                    self.channels[channel] -= disconnected
    
    async def broadcast_all(self, message: Dict[str, Any]):
        """Broadcast message to all active connections"""
        all_connections = set()
        for connections in self.active_connections.values():
            all_connections.update(connections)
        
        disconnected = set()
        for connection in all_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Failed to broadcast to all: {e}")
                disconnected.add(connection)
        
        # Clean up disconnected connections
        if disconnected:
            async with self._lock:
                for user_id in list(self.active_connections.keys()):
                    self.active_connections[user_id] -= disconnected
                    if not self.active_connections[user_id]:
                        del self.active_connections[user_id]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        return {
            "total_users": len(self.active_connections),
            "total_connections": sum(len(conns) for conns in self.active_connections.values()),
            "total_channels": len(self.channels),
            "channels": {
                channel: len(conns) for channel, conns in self.channels.items()
            }
        }


# Global connection manager
manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="Authentication token"),
    channel: Optional[str] = Query(None, description="Channel to subscribe to")
):
    """
    Main WebSocket endpoint for real-time updates
    
    - **token**: JWT authentication token
    - **channel**: Optional channel to subscribe (e.g., analysis_123, data_456)
    
    Message Types:
    - connection: Connection status
    - analysis_progress: Analysis progress updates
    - analysis_complete: Analysis completion notification
    - data_update: Data change notifications
    - error: Error messages
    - heartbeat: Keep-alive messages
    """
    user_id = None
    
    try:
        # Verify authentication
        user_data = await verify_ws_token(token)
        user_id = user_data.get("user_id", "anonymous")
        
        # Connect
        await manager.connect(websocket, user_id, channel)
        
        # Start heartbeat task
        heartbeat_task = asyncio.create_task(send_heartbeat(websocket))
        
        try:
            # Listen for messages
            while True:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle different message types
                msg_type = message.get("type")
                
                if msg_type == "ping":
                    await manager.send_personal_message(
                        {"type": "pong", "timestamp": datetime.utcnow().isoformat()},
                        websocket
                    )
                
                elif msg_type == "subscribe":
                    # Subscribe to a new channel
                    new_channel = message.get("channel")
                    if new_channel:
                        async with manager._lock:
                            if new_channel not in manager.channels:
                                manager.channels[new_channel] = set()
                            manager.channels[new_channel].add(websocket)
                        
                        await manager.send_personal_message(
                            {
                                "type": "subscribed",
                                "channel": new_channel,
                                "timestamp": datetime.utcnow().isoformat()
                            },
                            websocket
                        )
                
                elif msg_type == "unsubscribe":
                    # Unsubscribe from a channel
                    old_channel = message.get("channel")
                    if old_channel and old_channel in manager.channels:
                        async with manager._lock:
                            manager.channels[old_channel].discard(websocket)
                            if not manager.channels[old_channel]:
                                del manager.channels[old_channel]
                        
                        await manager.send_personal_message(
                            {
                                "type": "unsubscribed",
                                "channel": old_channel,
                                "timestamp": datetime.utcnow().isoformat()
                            },
                            websocket
                        )
                
                else:
                    logger.warning(f"Unknown message type: {msg_type}")
        
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected normally: user={user_id}")
        finally:
            # Cancel heartbeat
            heartbeat_task.cancel()
            try:
                await heartbeat_task
            except asyncio.CancelledError:
                pass
    
    except AuthenticationError as e:
        logger.warning(f"WebSocket authentication failed: {e}")
        await websocket.close(code=1008, reason="Authentication failed")
    
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except:
            pass
    
    finally:
        if user_id:
            await manager.disconnect(websocket, user_id)


async def send_heartbeat(websocket: WebSocket, interval: int = 30):
    """Send periodic heartbeat messages"""
    try:
        while True:
            await asyncio.sleep(interval)
            await websocket.send_json({
                "type": "heartbeat",
                "timestamp": datetime.utcnow().isoformat()
            })
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error(f"Heartbeat error: {e}")


@router.get("/ws/stats")
async def get_websocket_stats():
    """Get WebSocket connection statistics"""
    return manager.get_stats()


# Helper functions for broadcasting from other parts of the application

async def broadcast_analysis_progress(
    analysis_id: str,
    progress: int,
    status: str,
    message: str,
    user_id: Optional[str] = None
):
    """Broadcast analysis progress update"""
    payload = {
        "type": "analysis_progress",
        "analysis_id": analysis_id,
        "progress": progress,
        "status": status,
        "message": message,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Broadcast to channel
    await manager.broadcast_to_channel(payload, f"analysis_{analysis_id}")
    
    # Also broadcast to user if specified
    if user_id:
        await manager.broadcast_to_user(payload, user_id)


async def broadcast_analysis_complete(
    analysis_id: str,
    results: Dict[str, Any],
    user_id: Optional[str] = None
):
    """Broadcast analysis completion"""
    payload = {
        "type": "analysis_complete",
        "analysis_id": analysis_id,
        "results": results,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Broadcast to channel
    await manager.broadcast_to_channel(payload, f"analysis_{analysis_id}")
    
    # Also broadcast to user if specified
    if user_id:
        await manager.broadcast_to_user(payload, user_id)


async def broadcast_data_update(
    data_id: str,
    update_type: str,
    data: Dict[str, Any],
    user_id: Optional[str] = None
):
    """Broadcast data update notification"""
    payload = {
        "type": "data_update",
        "data_id": data_id,
        "update_type": update_type,
        "data": data,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Broadcast to channel
    await manager.broadcast_to_channel(payload, f"data_{data_id}")
    
    # Also broadcast to user if specified
    if user_id:
        await manager.broadcast_to_user(payload, user_id)


async def broadcast_error(
    error_message: str,
    error_code: str,
    user_id: Optional[str] = None,
    channel: Optional[str] = None
):
    """Broadcast error message"""
    payload = {
        "type": "error",
        "error_code": error_code,
        "message": error_message,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    if channel:
        await manager.broadcast_to_channel(payload, channel)
    elif user_id:
        await manager.broadcast_to_user(payload, user_id)
