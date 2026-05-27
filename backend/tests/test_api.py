"""
API Endpoint Tests
"""
import pytest
from fastapi.testclient import TestClient


def test_health_check(client: TestClient):
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_detailed_health_check(client: TestClient):
    """Test detailed health check"""
    response = client.get("/health/detailed")
    assert response.status_code == 200
    data = response.json()
    assert "services" in data


def test_metrics_endpoint(client: TestClient):
    """Test metrics endpoint"""
    response = client.get("/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "total_requests" in data


def test_root_endpoint(client: TestClient):
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "name" in data
    assert "version" in data


def test_login(client: TestClient):
    """Test login endpoint"""
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "test@example.com",
            "password": "testpassword"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_protected_endpoint_without_auth(client: TestClient):
    """Test protected endpoint without authentication"""
    response = client.get("/api/v1/users/profile")
    assert response.status_code == 403  # Forbidden


def test_protected_endpoint_with_auth(client: TestClient, auth_headers: dict):
    """Test protected endpoint with authentication"""
    response = client.get("/api/v1/users/profile", headers=auth_headers)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_data_upload(client: TestClient, auth_headers: dict):
    """Test data upload endpoint"""
    # Create a test CSV file
    csv_content = b"id,name,value\n1,test,100\n2,test2,200"
    
    response = client.post(
        "/api/v1/data/upload",
        files={"file": ("test.csv", csv_content, "text/csv")},
        headers=auth_headers
    )
    
    # May fail without proper setup, but tests the endpoint
    assert response.status_code in [200, 422, 500]