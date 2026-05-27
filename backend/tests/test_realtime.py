"""
Tests for Real-time Streaming Features
WebSocket and SSE endpoint testing
"""
import pytest
import asyncio
import json
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocket

from backend.main_v2 import app
from backend.core.security import SecurityManager


@pytest.fixture
def test_token():
    """Generate test JWT token"""
    return SecurityManager.create_access_token(
        data={
            "sub": "test_user_123",
            "email": "test@example.com",
            "role": "user"
        }
    )


@pytest.fixture
def client():
    """Test client fixture"""
    return TestClient(app)


class TestWebSocketEndpoints:
    """Test WebSocket functionality"""
    
    def test_websocket_connection_without_token(self, client):
        """Test WebSocket connection fails without token"""
        with pytest.raises(Exception):
            with client.websocket_connect("/api/v1/realtime/ws"):
                pass
    
    def test_websocket_connection_with_token(self, client, test_token):
        """Test WebSocket connection succeeds with valid token"""
        with client.websocket_connect(
            f"/api/v1/realtime/ws?token={test_token}"
        ) as websocket:
            # Receive connection message
            data = websocket.receive_json()
            assert data["type"] == "connection"
            assert data["status"] == "connected"
    
    def test_websocket_ping_pong(self, client, test_token):
        """Test WebSocket ping/pong"""
        with client.websocket_connect(
            f"/api/v1/realtime/ws?token={test_token}"
        ) as websocket:
            # Skip connection message
            websocket.receive_json()
            
            # Send ping
            websocket.send_json({"type": "ping"})
            
            # Receive pong
            response = websocket.receive_json()
            assert response["type"] == "pong"
    
    def test_websocket_channel_subscription(self, client, test_token):
        """Test channel subscription"""
        with client.websocket_connect(
            f"/api/v1/realtime/ws?token={test_token}"
        ) as websocket:
            # Skip connection message
            websocket.receive_json()
            
            # Subscribe to channel
            websocket.send_json({
                "type": "subscribe",
                "channel": "test_channel"
            })
            
            # Receive subscription confirmation
            response = websocket.receive_json()
            assert response["type"] == "subscribed"
            assert response["channel"] == "test_channel"
    
    def test_websocket_channel_unsubscription(self, client, test_token):
        """Test channel unsubscription"""
        with client.websocket_connect(
            f"/api/v1/realtime/ws?token={test_token}"
        ) as websocket:
            # Skip connection message
            websocket.receive_json()
            
            # Subscribe first
            websocket.send_json({
                "type": "subscribe",
                "channel": "test_channel"
            })
            websocket.receive_json()  # Skip confirmation
            
            # Unsubscribe
            websocket.send_json({
                "type": "unsubscribe",
                "channel": "test_channel"
            })
            
            # Receive unsubscription confirmation
            response = websocket.receive_json()
            assert response["type"] == "unsubscribed"
            assert response["channel"] == "test_channel"
    
    def test_websocket_with_initial_channel(self, client, test_token):
        """Test WebSocket connection with initial channel"""
        with client.websocket_connect(
            f"/api/v1/realtime/ws?token={test_token}&channel=analysis_123"
        ) as websocket:
            # Receive connection message
            data = websocket.receive_json()
            assert data["type"] == "connection"
            assert data["status"] == "connected"


class TestWebSocketStats:
    """Test WebSocket statistics endpoint"""
    
    def test_get_websocket_stats(self, client, test_token):
        """Test getting WebSocket statistics"""
        response = client.get(
            "/api/v1/realtime/ws/stats",
            headers={"Authorization": f"Bearer {test_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "total_connections" in data
        assert "total_channels" in data
        assert "channels" in data


class TestSSEEndpoints:
    """Test Server-Sent Events functionality"""
    
    def test_sse_analysis_stream_unauthorized(self, client):
        """Test SSE analysis stream without authentication"""
        response = client.get("/api/v1/realtime/stream/analysis/123")
        assert response.status_code == 403  # Unauthorized
    
    def test_sse_analysis_stream_authorized(self, client, test_token):
        """Test SSE analysis stream with authentication"""
        with client.stream(
            "GET",
            "/api/v1/realtime/stream/analysis/123",
            headers={"Authorization": f"Bearer {test_token}"}
        ) as response:
            assert response.status_code == 200
            assert response.headers["content-type"] == "text/event-stream"
            assert response.headers["cache-control"] == "no-cache"
    
    def test_sse_data_stream(self, client, test_token):
        """Test SSE data stream"""
        with client.stream(
            "GET",
            "/api/v1/realtime/stream/data/456",
            headers={"Authorization": f"Bearer {test_token}"}
        ) as response:
            assert response.status_code == 200
            assert response.headers["content-type"] == "text/event-stream"
    
    def test_sse_live_analysis_stream(self, client, test_token):
        """Test SSE live analysis stream"""
        with client.stream(
            "GET",
            "/api/v1/realtime/stream/live-analysis?data_source=test_source&interval=5",
            headers={"Authorization": f"Bearer {test_token}"}
        ) as response:
            assert response.status_code == 200
            assert response.headers["content-type"] == "text/event-stream"
    
    def test_sse_metrics_stream(self, client, test_token):
        """Test SSE metrics stream"""
        with client.stream(
            "GET",
            "/api/v1/realtime/stream/metrics",
            headers={"Authorization": f"Bearer {test_token}"}
        ) as response:
            assert response.status_code == 200
            assert response.headers["content-type"] == "text/event-stream"


class TestBroadcastFunctions:
    """Test broadcast helper functions"""
    
    @pytest.mark.asyncio
    async def test_broadcast_analysis_progress(self):
        """Test broadcasting analysis progress"""
        from backend.api.v1.websocket import broadcast_analysis_progress
        
        # Should not raise exception
        await broadcast_analysis_progress(
            analysis_id="test_123",
            progress=50,
            status="processing",
            message="Test message"
        )
    
    @pytest.mark.asyncio
    async def test_broadcast_analysis_complete(self):
        """Test broadcasting analysis completion"""
        from backend.api.v1.websocket import broadcast_analysis_complete
        
        # Should not raise exception
        await broadcast_analysis_complete(
            analysis_id="test_123",
            results={"test": "data"}
        )
    
    @pytest.mark.asyncio
    async def test_broadcast_data_update(self):
        """Test broadcasting data update"""
        from backend.api.v1.websocket import broadcast_data_update
        
        # Should not raise exception
        await broadcast_data_update(
            data_id="test_456",
            update_type="modified",
            data={"rows": 100}
        )
    
    @pytest.mark.asyncio
    async def test_broadcast_error(self):
        """Test broadcasting error"""
        from backend.api.v1.websocket import broadcast_error
        
        # Should not raise exception
        await broadcast_error(
            error_message="Test error",
            error_code="TEST_ERROR",
            user_id="test_user"
        )


class TestConnectionManager:
    """Test ConnectionManager functionality"""
    
    @pytest.mark.asyncio
    async def test_connection_manager_stats(self):
        """Test connection manager statistics"""
        from backend.api.v1.websocket import manager
        
        stats = manager.get_stats()
        assert isinstance(stats, dict)
        assert "total_users" in stats
        assert "total_connections" in stats
        assert "total_channels" in stats
        assert "channels" in stats
    
    @pytest.mark.asyncio
    async def test_connection_manager_broadcast_to_user(self):
        """Test broadcasting to specific user"""
        from backend.api.v1.websocket import manager
        
        # Should not raise exception even if user doesn't exist
        await manager.broadcast_to_user(
            message={"type": "test", "data": "hello"},
            user_id="nonexistent_user"
        )
    
    @pytest.mark.asyncio
    async def test_connection_manager_broadcast_to_channel(self):
        """Test broadcasting to specific channel"""
        from backend.api.v1.websocket import manager
        
        # Should not raise exception even if channel doesn't exist
        await manager.broadcast_to_channel(
            message={"type": "test", "data": "hello"},
            channel="nonexistent_channel"
        )
    
    @pytest.mark.asyncio
    async def test_connection_manager_broadcast_all(self):
        """Test broadcasting to all connections"""
        from backend.api.v1.websocket import manager
        
        # Should not raise exception
        await manager.broadcast_all(
            message={"type": "test", "data": "hello"}
        )


class TestSecurityIntegration:
    """Test security integration with real-time features"""
    
    def test_invalid_token_websocket(self, client):
        """Test WebSocket with invalid token"""
        with pytest.raises(Exception):
            with client.websocket_connect(
                "/api/v1/realtime/ws?token=invalid_token"
            ):
                pass
    
    def test_expired_token_websocket(self, client):
        """Test WebSocket with expired token"""
        from datetime import timedelta
        
        # Create expired token
        expired_token = SecurityManager.create_access_token(
            data={"sub": "test_user"},
            expires_delta=timedelta(seconds=-1)
        )
        
        with pytest.raises(Exception):
            with client.websocket_connect(
                f"/api/v1/realtime/ws?token={expired_token}"
            ):
                pass
    
    def test_invalid_token_sse(self, client):
        """Test SSE with invalid token"""
        response = client.get(
            "/api/v1/realtime/stream/analysis/123",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code in [401, 403]


class TestRealtimeIntegration:
    """Integration tests for real-time features"""
    
    @pytest.mark.asyncio
    async def test_full_websocket_flow(self, client, test_token):
        """Test complete WebSocket flow"""
        with client.websocket_connect(
            f"/api/v1/realtime/ws?token={test_token}&channel=test_flow"
        ) as websocket:
            # 1. Receive connection message
            msg = websocket.receive_json()
            assert msg["type"] == "connection"
            
            # 2. Send ping
            websocket.send_json({"type": "ping"})
            msg = websocket.receive_json()
            assert msg["type"] == "pong"
            
            # 3. Subscribe to another channel
            websocket.send_json({"type": "subscribe", "channel": "another_channel"})
            msg = websocket.receive_json()
            assert msg["type"] == "subscribed"
            
            # 4. Unsubscribe
            websocket.send_json({"type": "unsubscribe", "channel": "another_channel"})
            msg = websocket.receive_json()
            assert msg["type"] == "unsubscribed"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
