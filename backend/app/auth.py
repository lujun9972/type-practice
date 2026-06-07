"""Auth middleware and endpoints."""
from __future__ import annotations

import hashlib
import secrets

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.deps import load_config, save_config

router = APIRouter(tags=["auth"])

# ── Token store (in-memory, resets on restart) ─────────
_valid_tokens: set[str] = set()


def clear_tokens() -> None:
    """Reset tokens (for testing)."""
    global _valid_tokens
    _valid_tokens = set()


def _hash_password(password: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}:{password}".encode()).hexdigest()


def _is_password_set() -> bool:
    config = load_config()
    return bool(config.get("adminPasswordHash"))


# ── Protected paths ────────────────────────────────────
_PROTECTED_PREFIXES = (
    ("POST", "/api/materials"),
    ("PUT", "/api/materials/"),
    ("DELETE", "/api/materials/"),
    ("POST", "/api/split-preview"),
    ("POST", "/api/fetch/"),
    ("PUT", "/api/progress/"),
    ("DELETE", "/api/progress/"),
    ("PUT", "/api/config"),
    ("PUT", "/api/auth/password"),
    ("POST", "/api/materials/import"),
    ("POST", "/api/materials/import/resolve"),
)


async def auth_middleware(request: Request, call_next):
    from starlette.responses import JSONResponse

    path = request.url.path
    method = request.method

    if not _is_password_set():
        return await call_next(request)

    for prot_method, prefix in _PROTECTED_PREFIXES:
        if method == prot_method and path.startswith(prefix):
            break
    else:
        return await call_next(request)

    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return JSONResponse(status_code=401, content={"detail": "Not authenticated"})
    token = auth[7:]
    if token not in _valid_tokens:
        return JSONResponse(status_code=401, content={"detail": "Invalid token"})

    return await call_next(request)


# ── Pydantic models ────────────────────────────────────

class PasswordBody(BaseModel):
    password: str


class LoginBody(BaseModel):
    password: str


class PasswordChangeBody(BaseModel):
    currentPassword: str
    newPassword: str


# ── Endpoints ──────────────────────────────────────────

@router.get("/api/auth/status")
def auth_status():
    return {"passwordSet": _is_password_set()}


@router.post("/api/auth/setup")
def auth_setup(payload: PasswordBody):
    if _is_password_set():
        raise HTTPException(status_code=409, detail="Password already set")
    salt = secrets.token_hex(16)
    h = _hash_password(payload.password, salt)
    config = load_config()
    config["adminPasswordHash"] = h
    config["adminPasswordSalt"] = salt
    save_config(config)
    token = secrets.token_hex(32)
    _valid_tokens.add(token)
    return {"token": token}


@router.post("/api/auth/login")
def auth_login(payload: LoginBody):
    if not _is_password_set():
        raise HTTPException(status_code=403, detail="No password set")
    config = load_config()
    salt = config.get("adminPasswordSalt", "")
    expected = config.get("adminPasswordHash", "")
    h = _hash_password(payload.password, salt)
    if h != expected:
        raise HTTPException(status_code=401, detail="Wrong password")
    token = secrets.token_hex(32)
    _valid_tokens.add(token)
    return {"token": token}


@router.put("/api/auth/password")
def auth_change_password(payload: PasswordChangeBody):
    if not _is_password_set():
        raise HTTPException(status_code=403, detail="No password set")
    config = load_config()
    salt = config.get("adminPasswordSalt", "")
    expected = config.get("adminPasswordHash", "")
    h = _hash_password(payload.currentPassword, salt)
    if h != expected:
        raise HTTPException(status_code=401, detail="Wrong password")
    new_salt = secrets.token_hex(16)
    new_h = _hash_password(payload.newPassword, new_salt)
    config["adminPasswordHash"] = new_h
    config["adminPasswordSalt"] = new_salt
    save_config(config)
    return {"ok": True}
