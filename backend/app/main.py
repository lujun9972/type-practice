from __future__ import annotations

import hashlib
import os
import secrets
import uuid
from pathlib import Path
from typing import Literal, Optional

import httpx
from fastapi import FastAPI, HTTPException, Request, UploadFile
from pydantic import BaseModel

import json

from app.extractor import extract_content
from app.splitter import split_into_segments
from app.stats import StatsStore
from app.store import MaterialStore

app = FastAPI()

# Default store path (can be overridden in tests)
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_store: MaterialStore | None = None
_config_path: Path | None = None
_progress_path: Path | None = None
_stats_store: StatsStore | None = None

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


def _get_store() -> MaterialStore:
    global _store
    if _store is None:
        _store = MaterialStore(DATA_DIR / "materials.json")
    return _store


def _set_store(store: MaterialStore) -> None:
    global _store
    _store = store


def _set_config_path(path: Path) -> None:
    global _config_path
    _config_path = path


def _get_config_path() -> Path:
    return _config_path or DATA_DIR / "config.json"


def _load_config() -> dict:
    path = _get_config_path()
    if path.exists():
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return {**CONFIG_DEFAULTS}


def _save_config(config: dict) -> None:
    path = _get_config_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)


def _set_progress_path(path: Path) -> None:
    global _progress_path
    _progress_path = path


def _get_stats_store() -> StatsStore:
    global _stats_store
    if _stats_store is None:
        _stats_store = StatsStore(DATA_DIR / "stats.json")
    return _stats_store


def _set_stats_store(store: StatsStore) -> None:
    global _stats_store
    _stats_store = store


def _get_progress_path() -> Path:
    return _progress_path or DATA_DIR / "progress.json"


def _load_progress() -> dict:
    path = _get_progress_path()
    if path.exists():
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return {}


def _save_progress(data: dict) -> None:
    path = _get_progress_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ── Auth ──────────────────────────────────────────────
_valid_tokens: set[str] = set()


def _hash_password(password: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}:{password}".encode()).hexdigest()


def _is_password_set() -> bool:
    config = _load_config()
    return bool(config.get("adminPasswordHash"))


def _clear_tokens() -> None:
    """Reset tokens (for testing)."""
    global _valid_tokens
    _valid_tokens = set()


class PasswordBody(BaseModel):
    password: str


class LoginBody(BaseModel):
    password: str


# Protected paths that require auth.
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


@app.middleware("http")
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


class ExportRequest(BaseModel):
    mode: Literal["all", "tags", "ids"] = "all"
    tags: Optional[list[str]] = None
    ids: Optional[list[str]] = None


class MaterialCreate(BaseModel):
    title: str
    tags: str  # comma-separated
    content: str
    segments: Optional[list[dict]] = None  # pre-built segments (preserves images)


class UrlFetch(BaseModel):
    url: str


class TopicFetch(BaseModel):
    topic: str
    language: Literal["zh", "en"] = "zh"
    length: Literal["short", "medium", "long", "auto"] = "auto"
    lengthMin: Optional[int] = None
    lengthMax: Optional[int] = None


class LlmConfig(BaseModel):
    baseUrl: str = ""
    apiKey: str = ""
    model: str = ""


class ConfigUpdate(BaseModel):
    skipPunctuation: bool = True
    skipLimit: int = 3
    typingMode: Literal["typing", "pinyin"] = "typing"
    llm: LlmConfig = LlmConfig()


# LLM configuration from environment
LLM_BASE_URL = os.environ.get("LLM_BASE_URL", "https://api.deepseek.com")
LLM_API_KEY = os.environ.get("LLM_API_KEY", "")
LLM_MODEL = os.environ.get("LLM_MODEL", "deepseek-v4-flash")

LENGTH_MAP = {
    "short": "100-200字",
    "medium": "200-400字",
    "long": "400-600字",
    "auto": "根据主题复杂度选择合适长度",
}


from datetime import datetime, timezone
import time as _time

# ── Import upload storage ────────────────────────────────
_pending_imports: dict[str, dict] = {}  # upload_id -> {"materials": [...], "created_at": float}
_IMPORT_TTL_SECONDS = 600  # 10 minutes


def _cleanup_expired_imports() -> None:
    """Remove expired upload entries."""
    now = _time.time()
    expired = [uid for uid, entry in _pending_imports.items() if now - entry["created_at"] > _IMPORT_TTL_SECONDS]
    for uid in expired:
        del _pending_imports[uid]


class ImportResolveDecision(BaseModel):
    index: int
    action: Literal["keep_local", "use_imported", "keep_both"]


class ImportResolveRequest(BaseModel):
    upload_id: str
    decisions: list[ImportResolveDecision]


@app.post("/api/materials/export")
def export_materials(payload: ExportRequest):
    """Export materials to a versioned JSON structure."""
    store = _get_store()
    materials = store.list_all()

    if payload.mode == "tags" and payload.tags:
        materials = [m for m in materials if any(t in m.get("tags", []) for t in payload.tags)]
    elif payload.mode == "ids" and payload.ids:
        id_set = set(payload.ids)
        materials = [m for m in materials if m["id"] in id_set]

    # Export without segments — they'll be re-derived on import.
    export_items = []
    for m in materials:
        export_items.append({
            "id": m["id"],
            "title": m["title"],
            "tags": m.get("tags", []),
            "content": m.get("content", ""),
        })

    return {
        "version": 1,
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "materials": export_items,
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/materials/import")
def import_materials(file: UploadFile = None):
    """Upload a JSON file, validate format, detect conflicts."""
    _cleanup_expired_imports()

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")

    try:
        content = file.file.read()
        data = json.loads(content)
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON file: {e}")

    # Validate structure
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="Invalid format: expected a JSON object")
    if "version" not in data:
        raise HTTPException(status_code=400, detail="Missing 'version' field")
    if not isinstance(data["version"], int):
        raise HTTPException(status_code=400, detail="Invalid 'version': must be an integer")
    if data["version"] != 1:
        raise HTTPException(status_code=400, detail=f"Unsupported version: {data['version']}")
    if "materials" not in data or not isinstance(data["materials"], list):
        raise HTTPException(status_code=400, detail="Missing or invalid 'materials' array")

    imported_materials = data["materials"]
    for i, m in enumerate(imported_materials):
        if not isinstance(m, dict):
            raise HTTPException(status_code=400, detail=f"Material at index {i} is not an object")
        if "title" not in m or not isinstance(m["title"], str):
            raise HTTPException(status_code=400, detail=f"Material at index {i} missing 'title'")
        if "content" not in m or not isinstance(m["content"], str):
            raise HTTPException(status_code=400, detail=f"Material at index {i} missing 'content'")

    # Detect conflicts against existing materials
    store = _get_store()
    existing = store.list_all()
    existing_by_content = {}
    for m in existing:
        key = (m.get("title", ""), m.get("content", ""))
        existing_by_content[key] = m

    conflicts = []
    new_items = []
    for i, m in enumerate(imported_materials):
        m.setdefault("id", uuid.uuid4().hex[:12])
        m.setdefault("tags", [])
        key = (m["title"], m["content"])
        if key in existing_by_content:
            conflicts.append({
                "index": i,
                "imported": {"id": m["id"], "title": m["title"], "tags": m["tags"], "content": m["content"]},
                "local": {"id": existing_by_content[key]["id"], "title": existing_by_content[key]["title"],
                          "tags": existing_by_content[key].get("tags", []),
                          "content": existing_by_content[key].get("content", "")},
            })
        else:
            new_items.append({
                "index": i,
                "material": {"id": m["id"], "title": m["title"], "tags": m["tags"], "content": m["content"]},
            })

    # Store upload for later resolution
    upload_id = uuid.uuid4().hex[:12]
    _pending_imports[upload_id] = {
        "materials": imported_materials,
        "created_at": _time.time(),
    }

    return {
        "upload_id": upload_id,
        "total": len(imported_materials),
        "conflicts": conflicts,
        "new": new_items,
    }


@app.post("/api/materials/import/resolve")
def import_resolve(payload: ImportResolveRequest):
    """Apply conflict decisions and perform the actual import."""
    _cleanup_expired_imports()

    if payload.upload_id not in _pending_imports:
        raise HTTPException(status_code=404, detail="Upload not found or expired")

    upload = _pending_imports[payload.upload_id]
    imported_materials = upload["materials"]

    store = _get_store()
    existing = store.list_all()
    existing_by_content = {}
    for m in existing:
        key = (m.get("title", ""), m.get("content", ""))
        existing_by_content[key] = m

    # Build decision map: index -> action
    decision_map = {d.index: d.action for d in payload.decisions}

    imported_count = 0
    skipped_count = 0
    updated_count = 0

    for i, m in enumerate(imported_materials):
        key = (m["title"], m["content"])
        is_conflict = key in existing_by_content

        if is_conflict:
            action = decision_map.get(i)
            if action is None:
                raise HTTPException(status_code=400, detail=f"Missing decision for conflict at index {i}")

            if action == "keep_local":
                skipped_count += 1
                continue
            elif action == "use_imported":
                local_mat = existing_by_content[key]
                local_mat["title"] = m["title"]
                local_mat["tags"] = m.get("tags", [])
                local_mat["content"] = m["content"]
                local_mat["segments"] = split_into_segments(m["content"])
                store.save(local_mat)
                updated_count += 1
            elif action == "keep_both":
                new_id = uuid.uuid4().hex[:12]
                new_mat = {
                    "id": new_id,
                    "title": m["title"],
                    "tags": m.get("tags", []),
                    "content": m["content"],
                    "segments": split_into_segments(m["content"]),
                }
                store.save(new_mat)
                imported_count += 1
        else:
            # No conflict — auto-import
            new_id = m.get("id", uuid.uuid4().hex[:12])
            # Avoid ID collision
            if store.get(new_id):
                new_id = uuid.uuid4().hex[:12]
            new_mat = {
                "id": new_id,
                "title": m["title"],
                "tags": m.get("tags", []),
                "content": m["content"],
                "segments": split_into_segments(m["content"]),
            }
            store.save(new_mat)
            imported_count += 1

    # Clean up the upload
    del _pending_imports[payload.upload_id]

    return {
        "imported": imported_count,
        "skipped": skipped_count,
        "updated": updated_count,
        "total": len(imported_materials),
    }


# ── Auth endpoints ────────────────────────────────────


@app.get("/api/auth/status")
def auth_status():
    return {"passwordSet": _is_password_set()}


@app.post("/api/auth/setup")
def auth_setup(payload: PasswordBody):
    if _is_password_set():
        raise HTTPException(status_code=409, detail="Password already set")
    salt = secrets.token_hex(16)
    h = _hash_password(payload.password, salt)
    config = _load_config()
    config["adminPasswordHash"] = h
    config["adminPasswordSalt"] = salt
    _save_config(config)
    token = secrets.token_hex(32)
    _valid_tokens.add(token)
    return {"token": token}


@app.post("/api/auth/login")
def auth_login(payload: LoginBody):
    if not _is_password_set():
        raise HTTPException(status_code=403, detail="No password set")
    config = _load_config()
    salt = config.get("adminPasswordSalt", "")
    expected = config.get("adminPasswordHash", "")
    h = _hash_password(payload.password, salt)
    if h != expected:
        raise HTTPException(status_code=401, detail="Wrong password")
    token = secrets.token_hex(32)
    _valid_tokens.add(token)
    return {"token": token}


class PasswordChangeBody(BaseModel):
    currentPassword: str
    newPassword: str


@app.put("/api/auth/password")
def auth_change_password(payload: PasswordChangeBody):
    if not _is_password_set():
        raise HTTPException(status_code=403, detail="No password set")
    config = _load_config()
    salt = config.get("adminPasswordSalt", "")
    expected = config.get("adminPasswordHash", "")
    h = _hash_password(payload.currentPassword, salt)
    if h != expected:
        raise HTTPException(status_code=401, detail="Wrong password")
    new_salt = secrets.token_hex(16)
    new_h = _hash_password(payload.newPassword, new_salt)
    config["adminPasswordHash"] = new_h
    config["adminPasswordSalt"] = new_salt
    _save_config(config)
    return {"ok": True}


@app.get("/api/config")
def get_config():
    return _load_config()


@app.put("/api/config")
def update_config(payload: ConfigUpdate):
    config = payload.model_dump()
    _save_config(config)
    return config


@app.post("/api/split-preview")
def split_preview(payload: MaterialCreate):
    segments = split_into_segments(payload.content)
    return {"segments": segments}


@app.post("/api/materials", status_code=201)
def create_material(payload: MaterialCreate):
    store = _get_store()
    segments = payload.segments if payload.segments else split_into_segments(payload.content)
    material = {
        "id": uuid.uuid4().hex[:12],
        "title": payload.title,
        "tags": [t.strip() for t in payload.tags.split(",") if t.strip()],
        "content": payload.content,
        "segments": segments,
    }
    store.save(material)
    return material


@app.get("/api/materials")
def list_materials(tag: Optional[str] = None):
    store = _get_store()
    materials = store.list_all()
    if tag:
        materials = [m for m in materials if tag in m["tags"]]
    return materials


@app.get("/api/materials/{material_id}")
def get_material(material_id: str):
    store = _get_store()
    material = store.get(material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return material


@app.put("/api/materials/{material_id}")
def update_material(material_id: str, payload: MaterialCreate):
    store = _get_store()
    material = store.get(material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    segments = payload.segments if payload.segments else split_into_segments(payload.content)
    material.update({
        "title": payload.title,
        "tags": [t.strip() for t in payload.tags.split(",") if t.strip()],
        "content": payload.content,
        "segments": segments,
    })
    store.save(material)
    # Editing content invalidates progress.
    progress = _load_progress()
    if material_id in progress:
        del progress[material_id]
        _save_progress(progress)
    return material


@app.delete("/api/materials/{material_id}", status_code=204)
def delete_material(material_id: str):
    store = _get_store()
    if not store.delete(material_id):
        raise HTTPException(status_code=404, detail="Material not found")


@app.get("/api/progress/{material_id}")
def get_progress(material_id: str):
    progress = _load_progress()
    if material_id not in progress:
        raise HTTPException(status_code=404, detail="No progress found")
    return progress[material_id]


@app.put("/api/progress/{material_id}")
def save_progress(material_id: str, payload: dict):
    progress = _load_progress()
    payload["materialId"] = material_id

    # Award XP from newly completed segments
    old_results = progress.get(material_id, {}).get("segmentResults", [])
    new_results = payload.get("segmentResults", [])
    old_indices = {r["index"] for r in old_results}
    for result in new_results:
        if result["index"] not in old_indices:
            xp = result.get("correctChars", 0)
            if xp > 0:
                _get_stats_store().add_xp(xp)

    progress[material_id] = payload
    _save_progress(progress)
    return payload


@app.delete("/api/progress/{material_id}", status_code=204)
def delete_progress(material_id: str):
    progress = _load_progress()
    if material_id not in progress:
        raise HTTPException(status_code=404, detail="No progress found")
    del progress[material_id]
    _save_progress(progress)


@app.post("/api/fetch/url")
def fetch_url(payload: UrlFetch):
    try:
        resp = httpx.get(payload.url, timeout=10, follow_redirects=True)
        resp.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to fetch URL: {e}")

    extracted = extract_content(resp.text, payload.url)
    text = extracted["text"]
    if not text.strip():
        raise HTTPException(status_code=422, detail="No readable content found")

    segments = split_into_segments(text, extracted["images"])
    # Derive title from URL path.
    title = payload.url.rstrip("/").split("/")[-1].replace("-", " ").title() or "Untitled"

    return {
        "id": uuid.uuid4().hex[:12],
        "title": title,
        "tags": [],
        "content": text,
        "segments": segments,
    }


@app.post("/api/fetch/topic")
def fetch_topic(payload: TopicFetch):
    config = _load_config()
    llm = config.get("llm", {})

    api_key = os.environ.get("LLM_API_KEY") or llm.get("apiKey") or LLM_API_KEY
    if not api_key:
        raise HTTPException(status_code=503, detail="LLM API key not configured")

    base_url = os.environ.get("LLM_BASE_URL") or llm.get("baseUrl") or LLM_BASE_URL
    model = os.environ.get("LLM_MODEL") or llm.get("model") or LLM_MODEL

    if payload.lengthMin is not None and payload.lengthMax is not None:
        length_instruction = f"{payload.lengthMin}-{payload.lengthMax}字"
    else:
        length_instruction = LENGTH_MAP.get(payload.length, LENGTH_MAP["auto"])
    lang_name = "中文" if payload.language == "zh" else "English"

    system_prompt = (
        f"你是一个面向11岁小学生的内容创作者。"
        f"请用{lang_name}写一篇关于「{payload.topic}」的文章。"
        f"内容长度：{length_instruction}。"
        f"使用适合小学生的词汇和表达方式。"
        f"只输出正文内容，不要标题、不要解释。"
    )

    try:
        resp = httpx.post(
            f"{base_url}/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": [{"role": "system", "content": system_prompt}],
                "temperature": 0.7,
            },
            timeout=30,
        )
        resp.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM API error: {e}")

    data = resp.json()
    text = data["choices"][0]["message"]["content"].strip()
    if not text:
        raise HTTPException(status_code=502, detail="LLM returned empty content")

    segments = split_into_segments(text)
    return {
        "id": uuid.uuid4().hex[:12],
        "title": payload.topic,
        "tags": [],
        "content": text,
        "segments": segments,
    }


# ── Stats endpoints ────────────────────────────────────


class DailyGoalBody(BaseModel):
    difficulty: Literal["easy", "normal", "challenge"]
    date: Optional[str] = None


class RepairBody(BaseModel):
    date: str


@app.get("/api/stats")
def get_stats():
    return _get_stats_store().get_stats()


@app.post("/api/stats/daily-goal")
def set_daily_goal(payload: DailyGoalBody):
    store = _get_stats_store()
    store.set_daily_goal(payload.difficulty, date=payload.date)
    return store.get_stats()


@app.post("/api/stats/repair")
def use_repair(payload: RepairBody):
    store = _get_stats_store()
    if not store.use_repair(payload.date):
        raise HTTPException(status_code=400, detail="No repair items available")
    return store.get_stats()


# Serve frontend static files in production (when dist/ exists)
_STATIC_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if _STATIC_DIR.is_dir():
    from fastapi.staticfiles import StaticFiles

    app.mount("/", StaticFiles(directory=str(_STATIC_DIR), html=True), name="static")
