"""Export and import endpoints for materials."""
from __future__ import annotations

import json
import time as _time
import uuid
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, UploadFile
from pydantic import BaseModel

from app.deps import get_store, load_progress, save_progress_data
from app.splitter import split_into_segments

router = APIRouter(tags=["import-export"])

# ── Pending import storage ─────────────────────────────
_pending_imports: dict[str, dict] = {}  # upload_id -> {"materials": [...], "created_at": float}
_IMPORT_TTL_SECONDS = 600  # 10 minutes


def _cleanup_expired_imports() -> None:
    """Remove expired upload entries."""
    now = _time.time()
    expired = [uid for uid, entry in _pending_imports.items() if now - entry["created_at"] > _IMPORT_TTL_SECONDS]
    for uid in expired:
        del _pending_imports[uid]


# ── Pydantic models ────────────────────────────────────

class ExportRequest(BaseModel):
    mode: Literal["all", "tags", "ids"] = "all"
    tags: Optional[list[str]] = None
    ids: Optional[list[str]] = None


class ImportResolveDecision(BaseModel):
    index: int
    action: Literal["keep_local", "use_imported", "keep_both"]


class ImportResolveRequest(BaseModel):
    upload_id: str
    decisions: list[ImportResolveDecision]


# ── Endpoints ──────────────────────────────────────────

@router.post("/api/materials/export")
def export_materials(payload: ExportRequest):
    """Export materials to a versioned JSON structure."""
    from datetime import datetime, timezone

    store = get_store()
    materials = store.list_all()

    if payload.mode == "tags" and payload.tags:
        materials = [m for m in materials if any(t in m.get("tags", []) for t in payload.tags)]
    elif payload.mode == "ids" and payload.ids:
        id_set = set(payload.ids)
        materials = [m for m in materials if m["id"] in id_set]

    export_items = []
    for m in materials:
        item = {
            "id": m["id"],
            "title": m["title"],
            "tags": m.get("tags", []),
            "content": m.get("content", ""),
        }
        if m.get("videoUrl"):
            item["videoUrl"] = m["videoUrl"]
            item["segments"] = m.get("segments", [])
        export_items.append(item)

    return {
        "version": 1,
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "materials": export_items,
    }


@router.post("/api/materials/import")
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

    store = get_store()
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


@router.post("/api/materials/import/resolve")
def import_resolve(payload: ImportResolveRequest):
    """Apply conflict decisions and perform the actual import."""
    _cleanup_expired_imports()

    if payload.upload_id not in _pending_imports:
        raise HTTPException(status_code=404, detail="Upload not found or expired")

    upload = _pending_imports[payload.upload_id]
    imported_materials = upload["materials"]

    store = get_store()
    existing = store.list_all()
    existing_by_content = {}
    for m in existing:
        key = (m.get("title", ""), m.get("content", ""))
        existing_by_content[key] = m

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
                local_mat["segments"] = m.get("segments", split_into_segments(m["content"]))
                if m.get("videoUrl"):
                    local_mat["videoUrl"] = m["videoUrl"]
                store.save(local_mat)
                updated_count += 1
            elif action == "keep_both":
                new_id = uuid.uuid4().hex[:12]
                new_mat = {
                    "id": new_id,
                    "title": m["title"],
                    "tags": m.get("tags", []),
                    "content": m["content"],
                    "segments": m.get("segments", split_into_segments(m["content"])),
                }
                if m.get("videoUrl"):
                    new_mat["videoUrl"] = m["videoUrl"]
                store.save(new_mat)
                imported_count += 1
        else:
            new_id = m.get("id", uuid.uuid4().hex[:12])
            if store.get(new_id):
                new_id = uuid.uuid4().hex[:12]
            new_mat = {
                "id": new_id,
                "title": m["title"],
                "tags": m.get("tags", []),
                "content": m["content"],
                "segments": m.get("segments", split_into_segments(m["content"])),
            }
            if m.get("videoUrl"):
                new_mat["videoUrl"] = m["videoUrl"]
            store.save(new_mat)
            imported_count += 1

    del _pending_imports[payload.upload_id]

    return {
        "imported": imported_count,
        "skipped": skipped_count,
        "updated": updated_count,
        "total": len(imported_materials),
    }
