"""
Custom Exception Classes
Provides structured error handling across the application
"""
from typing import Optional, Dict, Any
from fastapi import HTTPException, status


class BaseAPIException(HTTPException):
    """Base exception for all API errors"""
    
    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code
        self.metadata = metadata or {}


class AIServiceError(BaseAPIException):
    """AI service related errors"""
    
    def __init__(self, detail: str, metadata: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail,
            error_code="AI_SERVICE_ERROR",
            metadata=metadata
        )


class RateLimitError(BaseAPIException):
    """Rate limit exceeded"""
    
    def __init__(self, detail: str = "Rate limit exceeded", metadata: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
            error_code="RATE_LIMIT_EXCEEDED",
            metadata=metadata
        )


class ValidationError(BaseAPIException):
    """Data validation errors"""
    
    def __init__(self, detail: str, metadata: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            error_code="VALIDATION_ERROR",
            metadata=metadata
        )


class AuthenticationError(BaseAPIException):
    """Authentication errors"""
    
    def __init__(self, detail: str = "Authentication failed", metadata: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            error_code="AUTHENTICATION_ERROR",
            metadata=metadata
        )


class AuthorizationError(BaseAPIException):
    """Authorization errors"""
    
    def __init__(self, detail: str = "Insufficient permissions", metadata: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            error_code="AUTHORIZATION_ERROR",
            metadata=metadata
        )


class ResourceNotFoundError(BaseAPIException):
    """Resource not found errors"""
    
    def __init__(self, detail: str, metadata: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            error_code="RESOURCE_NOT_FOUND",
            metadata=metadata
        )


class DatabaseError(BaseAPIException):
    """Database operation errors"""
    
    def __init__(self, detail: str, metadata: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code="DATABASE_ERROR",
            metadata=metadata
        )


class FileProcessingError(BaseAPIException):
    """File processing errors"""
    
    def __init__(self, detail: str, metadata: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="FILE_PROCESSING_ERROR",
            metadata=metadata
        )


class ConfigurationError(Exception):
    """Configuration errors"""
    pass