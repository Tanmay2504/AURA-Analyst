"""
Security and Authentication
JWT-based authentication with role-based access control
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import logging

from backend.config.settings import settings
from backend.core.exceptions import AuthenticationError, AuthorizationError

logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security scheme
security = HTTPBearer()


class SecurityManager:
    """Manage authentication and authorization"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def create_access_token(
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(
                minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
            )
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access"
        })
        
        encoded_jwt = jwt.encode(
            to_encode,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        return encoded_jwt
    
    @staticmethod
    def create_refresh_token(data: Dict[str, Any]) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "refresh"
        })
        
        encoded_jwt = jwt.encode(
            to_encode,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        return encoded_jwt
    
    @staticmethod
    def decode_token(token: str) -> Dict[str, Any]:
        """Decode and validate JWT token"""
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM]
            )
            return payload
        except JWTError as e:
            logger.warning(f"Token decode failed: {e}")
            raise AuthenticationError("Invalid or expired token")
    
    @staticmethod
    def verify_token_type(payload: Dict[str, Any], expected_type: str):
        """Verify token type"""
        token_type = payload.get("type")
        if token_type != expected_type:
            raise AuthenticationError(f"Invalid token type. Expected {expected_type}")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """Get current authenticated user from token"""
    token = credentials.credentials
    
    try:
        payload = SecurityManager.decode_token(token)
        SecurityManager.verify_token_type(payload, "access")
        
        user_id: str = payload.get("sub")
        if user_id is None:
            raise AuthenticationError("Invalid token payload")
        
        # In production, fetch user from database
        return {
            "user_id": user_id,
            "email": payload.get("email"),
            "role": payload.get("role", "user"),
            "permissions": payload.get("permissions", [])
        }
    except AuthenticationError:
        raise
    except Exception as e:
        logger.error(f"Authentication failed: {e}")
        raise AuthenticationError("Authentication failed")


def require_role(required_role: str):
    """Dependency to require specific role"""
    async def role_checker(current_user: Dict = Depends(get_current_user)):
        user_role = current_user.get("role", "user")
        
        # Role hierarchy: admin > analyst > user
        role_hierarchy = {"admin": 3, "analyst": 2, "user": 1}
        
        if role_hierarchy.get(user_role, 0) < role_hierarchy.get(required_role, 0):
            raise AuthorizationError(
                f"Insufficient permissions. Required role: {required_role}"
            )
        
        return current_user
    
    return role_checker


def require_permission(required_permission: str):
    """Dependency to require specific permission"""
    async def permission_checker(current_user: Dict = Depends(get_current_user)):
        permissions = current_user.get("permissions", [])
        
        if required_permission not in permissions and "admin" not in permissions:
            raise AuthorizationError(
                f"Missing required permission: {required_permission}"
            )
        
        return current_user
    
    return permission_checker


class APIKeyManager:
    """Manage API keys for service-to-service authentication"""
    
    @staticmethod
    def generate_api_key() -> str:
        """Generate a new API key"""
        import secrets
        return f"aura_{secrets.token_urlsafe(32)}"
    
    @staticmethod
    def validate_api_key(api_key: str) -> bool:
        """Validate API key"""
        # In production, check against database
        # For now, simple validation
        return api_key.startswith("aura_") and len(api_key) > 40


async def verify_api_key(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """Verify API key authentication"""
    api_key = credentials.credentials
    
    if not APIKeyManager.validate_api_key(api_key):
        raise AuthenticationError("Invalid API key")
    
    # Return service account info
    return {
        "type": "service_account",
        "api_key": api_key,
        "permissions": ["read", "write", "analyze"]
    }


async def verify_ws_token(token: str) -> Dict[str, Any]:
    """
    Verify WebSocket authentication token
    
    Args:
        token: JWT token from WebSocket query parameter
        
    Returns:
        User data dictionary
        
    Raises:
        AuthenticationError: If token is invalid
    """
    try:
        payload = SecurityManager.decode_token(token)
        SecurityManager.verify_token_type(payload, "access")
        
        user_id: str = payload.get("sub")
        if user_id is None:
            raise AuthenticationError("Invalid token payload")
        
        # In production, fetch user from database
        return {
            "user_id": user_id,
            "email": payload.get("email"),
            "role": payload.get("role", "user"),
            "permissions": payload.get("permissions", [])
        }
    except AuthenticationError:
        raise
    except Exception as e:
        logger.error(f"WebSocket authentication failed: {e}")
        raise AuthenticationError("WebSocket authentication failed")
