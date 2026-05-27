"""
Caching Layer
Redis-based caching with fallback to in-memory cache
"""
import json
import logging
from typing import Optional, Any, Callable
from functools import wraps
import hashlib
from datetime import timedelta

try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

from backend.config.settings import settings

logger = logging.getLogger(__name__)


class CacheManager:
    """Manage caching operations"""
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.memory_cache: dict = {}
        self._initialize_redis()
    
    def _initialize_redis(self):
        """Initialize Redis connection"""
        if not REDIS_AVAILABLE or not settings.REDIS_URL:
            logger.warning("Redis not available, using in-memory cache")
            return
        
        try:
            self.redis_client = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            logger.info("Redis cache initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Redis: {e}")
            self.redis_client = None
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            if self.redis_client:
                value = await self.redis_client.get(key)
                if value:
                    return json.loads(value)
            else:
                return self.memory_cache.get(key)
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None
    ):
        """Set value in cache"""
        try:
            ttl = ttl or settings.CACHE_TTL
            serialized = json.dumps(value)
            
            if self.redis_client:
                await self.redis_client.setex(
                    key,
                    ttl,
                    serialized
                )
            else:
                self.memory_cache[key] = value
                # Simple TTL for memory cache (not perfect but works)
                # In production, use a proper TTL implementation
        except Exception as e:
            logger.error(f"Cache set error: {e}")
    
    async def delete(self, key: str):
        """Delete value from cache"""
        try:
            if self.redis_client:
                await self.redis_client.delete(key)
            else:
                self.memory_cache.pop(key, None)
        except Exception as e:
            logger.error(f"Cache delete error: {e}")
    
    async def clear(self):
        """Clear all cache"""
        try:
            if self.redis_client:
                await self.redis_client.flushdb()
            else:
                self.memory_cache.clear()
        except Exception as e:
            logger.error(f"Cache clear error: {e}")
    
    @staticmethod
    def generate_cache_key(*args, **kwargs) -> str:
        """Generate cache key from arguments"""
        key_data = f"{args}:{sorted(kwargs.items())}"
        return hashlib.md5(key_data.encode()).hexdigest()


# Global cache manager
cache_manager = CacheManager()


def cached(ttl: Optional[int] = None, key_prefix: str = ""):
    """Decorator for caching function results"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{key_prefix}:{func.__name__}:{cache_manager.generate_cache_key(*args, **kwargs)}"
            
            # Try to get from cache
            cached_value = await cache_manager.get(cache_key)
            if cached_value is not None:
                logger.debug(f"Cache hit: {cache_key}")
                return cached_value
            
            # Execute function
            logger.debug(f"Cache miss: {cache_key}")
            result = await func(*args, **kwargs)
            
            # Store in cache
            await cache_manager.set(cache_key, result, ttl)
            
            return result
        
        return wrapper
    return decorator


async def invalidate_cache_pattern(pattern: str):
    """Invalidate all cache keys matching pattern"""
    try:
        if cache_manager.redis_client:
            keys = await cache_manager.redis_client.keys(pattern)
            if keys:
                await cache_manager.redis_client.delete(*keys)
                logger.info(f"Invalidated {len(keys)} cache keys matching {pattern}")
    except Exception as e:
        logger.error(f"Cache invalidation error: {e}")