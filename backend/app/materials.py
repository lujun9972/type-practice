"""Material CRUD, video upload, config, and split-preview endpoints."""
from __future__ import annotations

import os
import uuid

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel
from typing import Literal, Optional

from app.deps import get_store, get_video_dir, load_config, save_config, load_progress, save_progress_data
from app.splitter import split_into_segments
from app.subtitle_parser import parse_subtitle

router = APIRouter(tags=["materials"])

# ── Pydantic models ────────────────────────────────────

class LlmConfig(BaseModel):
    baseUrl: str = ""
    apiKey: str = ""
    model: str = ""


class ConfigUpdate(BaseModel):
    skipPunctuation: bool = True
    skipLimit: int = 3
    typingMode: Literal["typing", "pinyin"] = "typing"
    llm: LlmConfig = LlmConfig()


class MaterialCreate(BaseModel):
    title: str
    tags: str  # comma-separated
    content: str
    segments: Optional[list[dict]] = None  # pre-built segments (preserves images)


# ── Config endpoints ───────────────────────────────────

@router.get("/api/config")
def get_config():
    return load_config()


@router.put("/api/config")
def update_config(payload: ConfigUpdate):
    config = payload.model_dump()
    save_config(config)
    return config


# ── Split preview ──────────────────────────────────────

@router.post("/api/split-preview")
def split_preview(payload: MaterialCreate):
    segments = split_into_segments(payload.content)
    return {"segments": segments}


# ── Material CRUD ──────────────────────────────────────

@router.post("/api/materials", status_code=201)
def create_material(payload: MaterialCreate):
    store = get_store()
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


@router.get("/api/materials")
def list_materials(tag: Optional[str] = None):
    store = get_store()
    materials = store.list_all()
    if tag:
        materials = [m for m in materials if tag in m["tags"]]
    return materials


@router.get("/api/materials/{material_id}")
def get_material(material_id: str):
    store = get_store()
    material = store.get(material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return material


@router.put("/api/materials/{material_id}")
def update_material(material_id: str, payload: MaterialCreate):
    store = get_store()
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
    progress = load_progress()
    if material_id in progress:
        del progress[material_id]
        save_progress_data(progress)
    return material


@router.delete("/api/materials/{material_id}", status_code=204)
def delete_material(material_id: str):
    store = get_store()
    material = store.get(material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    if material.get("videoUrl"):
        video_path = get_video_dir() / material["videoUrl"]
        if video_path.exists():
            video_path.unlink()
    store.delete(material_id)


# ── Video endpoints ────────────────────────────────────

@router.post("/api/materials/video", status_code=201)
def create_video_material(
    video: UploadFile = File(...),
    subtitle: UploadFile = File(...),
    title: str = Form(""),
    tags: str = Form(""),
    overwrite: bool = Query(False),
):
    video_dir = get_video_dir()
    filename = video.filename or "video.mp4"
    target_path = video_dir / filename

    if target_path.exists() and not overwrite:
        raise HTTPException(status_code=409, detail=f"文件 {filename} 已存在")

    target_path.write_bytes(video.file.read())

    subtitle_bytes = subtitle.file.read()
    try:
        subtitle_filename = subtitle.filename or "subtitle.srt"
        entries = parse_subtitle(subtitle_bytes, subtitle_filename)
    except ValueError as e:
        if target_path.exists() and not (target_path.exists() and overwrite):
            target_path.unlink()
        raise HTTPException(status_code=400, detail=str(e)) from e

    segments = [
        {
            "type": "text",
            "content": entry["content"],
            "startTimeMs": entry["startTimeMs"],
            "endTimeMs": entry["endTimeMs"],
        }
        for entry in entries
    ]

    material = {
        "id": uuid.uuid4().hex[:12],
        "title": title,
        "tags": [t.strip() for t in tags.split(",") if t.strip()],
        "content": " ".join(e["content"] for e in entries),
        "segments": segments,
        "videoUrl": filename,
    }

    store = get_store()
    store.save(material)
    return material


@router.get("/api/videos/{filename}")
def serve_video(filename: str):
    video_path = get_video_dir() / filename
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    from fastapi.responses import FileResponse

    return FileResponse(video_path)


@router.post("/api/materials/{material_id}/video")
def attach_video(material_id: str, video: UploadFile = File(...)):
    """Attach a video file to an existing material (re-upload after import)."""
    store = get_store()
    mat = store.get(material_id)
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")

    video_dir = get_video_dir()
    filename = video.filename or "video.mp4"
    target_path = video_dir / filename
    target_path.write_bytes(video.file.read())

    mat["videoUrl"] = filename
    store.save(mat)
    return mat
