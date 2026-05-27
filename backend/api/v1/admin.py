"""
Admin API endpoints - password protected, owner-only access
Allows managing AWS credentials and model enable/disable state at runtime
"""
import json
import os
import re
import logging
from pathlib import Path
from typing import Dict, Any, Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from backend.config.settings import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["Admin"])

# Path to the .env file
ENV_FILE = Path(__file__).parent.parent.parent / ".env"

# In-memory store for disabled model keys (persisted to a JSON sidecar file)
_DISABLED_MODELS_FILE = Path(__file__).parent.parent.parent / ".disabled_models.json"


def _require_admin(x_admin_password: Optional[str]):
    """Raise 403 if the admin password header is wrong or missing."""
    admin_pw = os.environ.get("ADMIN_PASSWORD") or getattr(settings, "ADMIN_PASSWORD", None)
    if not admin_pw:
        raise HTTPException(status_code=500, detail="ADMIN_PASSWORD not configured on server")
    if x_admin_password != admin_pw:
        raise HTTPException(status_code=403, detail="Invalid admin password")


def _load_disabled_models() -> list:
    if _DISABLED_MODELS_FILE.exists():
        try:
            return json.loads(_DISABLED_MODELS_FILE.read_text())
        except Exception:
            return []
    return []


def _save_disabled_models(disabled: list):
    _DISABLED_MODELS_FILE.write_text(json.dumps(disabled))


def _read_env() -> Dict[str, str]:
    """Read current .env file into a dict."""
    env = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                env[k.strip()] = v.strip()
    return env


def _write_env(env: Dict[str, str]):
    """Write dict back to .env file."""
    lines = []
    for k, v in env.items():
        lines.append(f"{k}={v}")
    ENV_FILE.write_text("\n".join(lines) + "\n")


# ── Models ────────────────────────────────────────────────────────────────────

class CredentialsUpdate(BaseModel):
    aws_access_key_id: str
    aws_secret_access_key: str
    aws_region: Optional[str] = None
    bedrock_model_id: Optional[str] = None


class ModelToggle(BaseModel):
    model_key: str   # e.g. "claude-sonnet-4-6"
    enabled: bool


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/status")
def admin_status(x_admin_password: Optional[str] = Header(None)):
    """Verify admin password and return current config status."""
    _require_admin(x_admin_password)
    env = _read_env()
    disabled = _load_disabled_models()
    return {
        "authenticated": True,
        "aws_region": env.get("AWS_REGION", ""),
        "aws_access_key_id": env.get("AWS_ACCESS_KEY_ID", "")[:8] + "****" if env.get("AWS_ACCESS_KEY_ID") else "",
        "aws_secret_configured": bool(env.get("AWS_SECRET_ACCESS_KEY")),
        "bedrock_model_id": env.get("BEDROCK_MODEL_ID", ""),
        "disabled_models": disabled,
    }


@router.post("/credentials")
def update_credentials(
    body: CredentialsUpdate,
    x_admin_password: Optional[str] = Header(None)
):
    """Update AWS credentials in the .env file."""
    _require_admin(x_admin_password)

    if not body.aws_access_key_id.strip() or not body.aws_secret_access_key.strip():
        raise HTTPException(status_code=400, detail="Access key and secret are required")

    env = _read_env()
    env["AWS_ACCESS_KEY_ID"] = body.aws_access_key_id.strip()
    env["AWS_SECRET_ACCESS_KEY"] = body.aws_secret_access_key.strip()
    if body.aws_region:
        env["AWS_REGION"] = body.aws_region.strip()
    if body.bedrock_model_id:
        env["BEDROCK_MODEL_ID"] = body.bedrock_model_id.strip()

    _write_env(env)

    # Also update the live os.environ so the running process picks it up
    os.environ["AWS_ACCESS_KEY_ID"] = env["AWS_ACCESS_KEY_ID"]
    os.environ["AWS_SECRET_ACCESS_KEY"] = env["AWS_SECRET_ACCESS_KEY"]
    if body.aws_region:
        os.environ["AWS_REGION"] = env["AWS_REGION"]
    if body.bedrock_model_id:
        os.environ["BEDROCK_MODEL_ID"] = env["BEDROCK_MODEL_ID"]

    # Reinitialize the Bedrock singleton with new credentials
    try:
        from backend.services import bedrock_service as bsvc
        bsvc._bedrock_service = None  # force re-init on next call
        logger.info("Bedrock service singleton reset after credential update")
    except Exception as e:
        logger.warning(f"Could not reset Bedrock singleton: {e}")

    return {"success": True, "message": "Credentials updated and applied"}


@router.post("/models/toggle")
def toggle_model(
    body: ModelToggle,
    x_admin_password: Optional[str] = Header(None)
):
    """Enable or disable a model by its key."""
    _require_admin(x_admin_password)

    disabled = _load_disabled_models()
    if body.enabled:
        disabled = [m for m in disabled if m != body.model_key]
    else:
        if body.model_key not in disabled:
            disabled.append(body.model_key)

    _save_disabled_models(disabled)
    return {"success": True, "disabled_models": disabled}


@router.get("/models")
def get_models_admin(x_admin_password: Optional[str] = Header(None)):
    """Return all models with their enabled/disabled state."""
    _require_admin(x_admin_password)

    from backend.config.ai_models import AVAILABLE_MODELS
    disabled = _load_disabled_models()

    result = []
    for key, model in AVAILABLE_MODELS.items():
        d = model.to_dict()
        d["key"] = key
        d["enabled"] = key not in disabled
        result.append(d)

    return {"models": result, "disabled_models": disabled}
