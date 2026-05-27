"""
Monitoring and Metrics
Application performance monitoring and metrics collection
"""
import time
import functools
import inspect
import logging
from typing import Callable, Any, Dict
from datetime import datetime
from collections import defaultdict
import threading

logger = logging.getLogger(__name__)


class MetricsCollector:
    """Collect and store application metrics"""
    
    def __init__(self):
        self.metrics: Dict[str, Any] = defaultdict(lambda: {
            "count": 0,
            "total_time": 0,
            "errors": 0,
            "last_called": None
        })
        self.lock = threading.Lock()
    
    def record_request(self, endpoint: str, duration: float, success: bool = True):
        """Record API request metrics"""
        with self.lock:
            metric = self.metrics[f"api.{endpoint}"]
            metric["count"] += 1
            metric["total_time"] += duration
            metric["last_called"] = datetime.utcnow().isoformat()
            if not success:
                metric["errors"] += 1
    
    def record_ai_request(self, model: str, duration: float, success: bool = True):
        """Record AI service request metrics"""
        with self.lock:
            metric = self.metrics[f"ai.{model}"]
            metric["count"] += 1
            metric["total_time"] += duration
            metric["last_called"] = datetime.utcnow().isoformat()
            if not success:
                metric["errors"] += 1
    
    def record_error(self, error_type: str):
        """Record error occurrence"""
        with self.lock:
            metric = self.metrics[f"error.{error_type}"]
            metric["count"] += 1
            metric["last_called"] = datetime.utcnow().isoformat()
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get all collected metrics"""
        with self.lock:
            return dict(self.metrics)
    
    def get_summary(self) -> Dict[str, Any]:
        """Get metrics summary"""
        with self.lock:
            total_requests = sum(
                m["count"] for k, m in self.metrics.items() 
                if k.startswith("api.")
            )
            total_errors = sum(
                m["errors"] for k, m in self.metrics.items() 
                if k.startswith("api.")
            )
            total_ai_requests = sum(
                m["count"] for k, m in self.metrics.items() 
                if k.startswith("ai.")
            )
            
            return {
                "total_requests": total_requests,
                "total_errors": total_errors,
                "total_ai_requests": total_ai_requests,
                "error_rate": total_errors / total_requests if total_requests > 0 else 0,
                "uptime": time.time(),
                "timestamp": datetime.utcnow().isoformat()
            }


# Global metrics collector
metrics_collector = MetricsCollector()


def track_time(metric_name: str):
    """Decorator to track execution time"""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            success = True
            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                success = False
                raise
            finally:
                duration = time.time() - start_time
                metrics_collector.record_request(metric_name, duration, success)
                logger.debug(f"{metric_name} took {duration:.3f}s")
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            success = True
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                success = False
                raise
            finally:
                duration = time.time() - start_time
                metrics_collector.record_request(metric_name, duration, success)
                logger.debug(f"{metric_name} took {duration:.3f}s")
        
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator


def track_ai_request(func: Callable) -> Callable:
    """Decorator to track AI service requests"""
    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        success = True
        model = "unknown"
        try:
            result = await func(*args, **kwargs)
            if isinstance(result, dict) and "model_used" in result:
                model = result["model_used"]
            return result
        except Exception as e:
            success = False
            raise
        finally:
            duration = time.time() - start_time
            metrics_collector.record_ai_request(model, duration, success)
            logger.info(f"AI request to {model} took {duration:.3f}s, success={success}")
    
    return wrapper


def track_error(error_type: str, details: str = ""):
    """Track error occurrence"""
    metrics_collector.record_error(error_type)
    logger.error(f"Error tracked: {error_type} - {details}")


def get_metrics() -> Dict[str, Any]:
    """Get current metrics"""
    return metrics_collector.get_metrics()


def get_metrics_summary() -> Dict[str, Any]:
    """Get metrics summary"""
    return metrics_collector.get_summary()