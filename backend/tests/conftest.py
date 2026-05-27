"""
Pytest Configuration and Fixtures
"""
import pytest
import asyncio
from typing import Generator, AsyncGenerator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.main_v2 import app
from backend.config.settings import settings
from backend.core.security import SecurityManager


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def client() -> Generator:
    """Test client fixture"""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def auth_headers() -> dict:
    """Generate authentication headers"""
    token = SecurityManager.create_access_token({
        "sub": "test_user",
        "email": "test@example.com",
        "role": "user",
        "permissions": ["read", "write", "analyze"]
    })
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers() -> dict:
    """Generate admin authentication headers"""
    token = SecurityManager.create_access_token({
        "sub": "admin_user",
        "email": "admin@example.com",
        "role": "admin",
        "permissions": ["read", "write", "analyze", "admin"]
    })
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def sample_data():
    """Sample data for testing"""
    return {
        "columns": ["id", "name", "value"],
        "row_count": 100,
        "column_count": 3,
        "data_types": {
            "id": "int64",
            "name": "object",
            "value": "float64"
        }
    }