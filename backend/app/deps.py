"""Shared dependency providers for FastAPI routers.

Tests override these via ``app.dependency_overrides`` or by calling the
``set_*`` helpers (re-exported from ``app.main`` for backward-compat).
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from app.stats import StatsStore
from app.store import MaterialStore

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# ── Configurable paths (tests swap these) ──────────────
_store_path: Path = DATA_DIR / "materials.json"
_config_path: Path = DATA_DIR / "config.json"
_progress_path: Path = DATA_DIR / "progress.json"
_stats_path: Path = DATA_DIR / "stats.json"
_video_dir: Path = DATA_DIR / "videos"

# ── Singletons (lazily created) ────────────────────────
_store_instance: Optional[MaterialStore] = None
_stats_instance: Optional[StatsStore] = None

# ── Config defaults ────────────────────────────────────
import os

CONFIG_DEFAULTS = {
    "skipPunctuation": True,
    "skipLimit": 3,
    "typingMode": "typing",
    "llm": {
        "baseUrl": os.environ.get("LLM_BASE_URL", "https://api.deepseek.com"),
        "apiKey": "",
        "model": os.environ.get("LLM_MODEL", "deepseek-v4-flash"),
    },
}


def set_store_path(path: Path) -> None:
    global _store_path, _store_instance
    _store_path = path
    _store_instance = None


def set_config_path(path: Path) -> None:
    global _config_path
    _config_path = path


def set_progress_path(path: Path) -> None:
    global _progress_path
    _progress_path = path


def set_stats_path(path: Path) -> None:
    global _stats_path, _stats_instance
    _stats_path = path
    _stats_instance = None


def set_video_dir(path: Path) -> None:
    global _video_dir
    _video_dir = path
    path.mkdir(parents=True, exist_ok=True)


# ── Dependency providers (used via Depends) ────────────

def get_store() -> MaterialStore:
    global _store_instance
    if _store_instance is None:
        _store_instance = MaterialStore(_store_path)
    return _store_instance


def set_store(store: MaterialStore) -> None:
    global _store_instance
    _store_instance = store


def get_stats_store() -> StatsStore:
    global _stats_instance
    if _stats_instance is None:
        _stats_instance = StatsStore(_stats_path)
    return _stats_instance


def set_stats_store(store: StatsStore) -> None:
    global _stats_instance
    _stats_instance = store


def get_config_path() -> Path:
    return _config_path


def get_progress_path() -> Path:
    return _progress_path


def get_video_dir() -> Path:
    _video_dir.mkdir(parents=True, exist_ok=True)
    return _video_dir


# ── Config helpers ─────────────────────────────────────

def load_config() -> dict:
    path = get_config_path()
    if path.exists():
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return {**CONFIG_DEFAULTS}


def save_config(config: dict) -> None:
    path = get_config_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)


def load_progress() -> dict:
    path = get_progress_path()
    if path.exists():
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_progress_data(data: dict) -> None:
    path = get_progress_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
