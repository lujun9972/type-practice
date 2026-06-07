"""Type Practice — FastAPI application.

This module creates the app, registers routers and middleware,
and re-exports test helpers for backward compatibility.
"""
from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI

from app.auth import router as auth_router, auth_middleware, clear_tokens as _auth_clear_tokens
from app.materials import router as materials_router
from app.import_export import router as import_export_router
from app.progress import router as progress_router
from app.content_fetch import router as content_fetch_router

from app.deps import (
    set_store as _deps_set_store,
    get_store as _deps_get_store,
    set_stats_store as _deps_set_stats_store,
    get_stats_store as _deps_get_stats_store,
    set_store_path as _deps_set_store_path,
    set_config_path as _deps_set_config_path,
    set_progress_path as _deps_set_progress_path,
    set_video_dir as _deps_set_video_dir,
)

app = FastAPI()

# ── Middleware ─────────────────────────────────────────
app.middleware("http")(auth_middleware)

# ── Routers ────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(materials_router)
app.include_router(import_export_router)
app.include_router(progress_router)
app.include_router(content_fetch_router)


# ── Health check ───────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "ok"}


# ── Stats endpoints (kept here — only 3 thin routes) ──
from typing import Literal, Optional
from pydantic import BaseModel
from app.deps import get_stats_store as _get_stats_store_dep


class DailyGoalBody(BaseModel):
    difficulty: Literal["easy", "normal", "challenge", "custom"]
    date: Optional[str] = None
    goal_type: Literal["xp", "time"] = "xp"
    custom_minutes: Optional[int] = None


class RepairBody(BaseModel):
    date: str


@app.get("/api/stats")
def get_stats():
    return _get_stats_store_dep().get_stats()


@app.post("/api/stats/daily-goal")
def set_daily_goal(payload: DailyGoalBody):
    store = _get_stats_store_dep()
    store.set_daily_goal(
        payload.difficulty,
        date=payload.date,
        goal_type=payload.goal_type,
        custom_minutes=payload.custom_minutes,
    )
    return store.get_stats()


@app.post("/api/stats/repair")
def use_repair(payload: RepairBody):
    store = _get_stats_store_dep()
    if not store.use_repair(payload.date):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="No repair items available")
    return store.get_stats()


# ── Serve frontend static files in production ─────────
_STATIC_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if _STATIC_DIR.is_dir():
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=str(_STATIC_DIR), html=True), name="static")


# ── Backward-compatible test helpers ──────────────────
# Tests import these from app.main — we delegate to deps.
_set_store = _deps_set_store
_set_stats_store = _deps_set_stats_store
_set_config_path = _deps_set_config_path
_set_progress_path = _deps_set_progress_path
_set_video_dir = _deps_set_video_dir
_clear_tokens = _auth_clear_tokens
_get_stats_store = _get_stats_store_dep
