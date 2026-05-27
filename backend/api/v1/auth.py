"""
Authentication API Endpoints
User authentication and token management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Dict, Any
import logging

from backend.core.security import SecurityManager, get_current_user
from backend.core.exceptions import AuthenticationError

logger = logging.getLogger(__name__)
router = APIRouter()


class LoginRequest(BaseModel):
    """Login request model"""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Token response model"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RegisterRequest(BaseModel):
    """Registration request model"""
    email: EmailStr
    password: str
    full_name: str


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """
    User login
    
    Returns access and refresh tokens
    """
    try:
        # In production, verify against database
        # For now, demo implementation
        user_data = {
            "sub": "user_123",
            "email": request.email,
            "role": "user",
            "permissions": ["read", "write", "analyze"]
        }
        
        access_token = SecurityManager.create_access_token(user_data)
        refresh_token = SecurityManager.create_refresh_token(user_data)
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=1800  # 30 minutes
        )
        
    except Exception as e:
        logger.error(f"Login failed: {e}")
        raise AuthenticationError("Invalid credentials")


@router.post("/register")
async def register(request: RegisterRequest):
    """
    User registration
    
    Creates a new user account
    """
    try:
        # Hash password
        hashed_password = SecurityManager.hash_password(request.password)
        
        # In production, store in database
        user_id = f"user_{int(os.urandom(8).hex(), 16)}"
        
        logger.info(f"User registered: {request.email}")
        
        return {
            "message": "Registration successful",
            "user_id": user_id,
            "email": request.email
        }
        
    except Exception as e:
        logger.error(f"Registration failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed"
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(refresh_token: str):
    """
    Refresh access token
    
    Uses refresh token to get new access token
    """
    try:
        payload = SecurityManager.decode_token(refresh_token)
        SecurityManager.verify_token_type(payload, "refresh")
        
        # Create new access token
        user_data = {
            "sub": payload.get("sub"),
            "email": payload.get("email"),
            "role": payload.get("role"),
            "permissions": payload.get("permissions")
        }
        
        new_access_token = SecurityManager.create_access_token(user_data)
        
        return TokenResponse(
            access_token=new_access_token,
            refresh_token=refresh_token,
            expires_in=1800
        )
        
    except Exception as e:
        logger.error(f"Token refresh failed: {e}")
        raise AuthenticationError("Invalid refresh token")


@router.post("/logout")
async def logout(current_user: Dict = Depends(get_current_user)):
    """
    User logout
    
    Invalidates current session
    """
    # In production, blacklist token
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_current_user_info(current_user: Dict = Depends(get_current_user)):
    """Get current user information"""
    return current_user


import os