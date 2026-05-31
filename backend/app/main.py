from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import Literal, Optional

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import json

from app.extractor import extract_content
from app.splitter import split_into_segments
from app.store import MaterialStore

app = FastAPI()

# Default store path (can be overridden in tests)
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_store: MaterialStore | None = None
_config_path: Path | None = None

CONFIG_DEFAULTS = {
    "skipPunctuation": True,
    "skipLimit": 3,
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


class MaterialCreate(BaseModel):
    title: str
    tags: str  # comma-separated
    content: str


class UrlFetch(BaseModel):
    url: str


class TopicFetch(BaseModel):
    topic: str
    language: Literal["zh", "en"] = "zh"
    length: Literal["short", "medium", "long", "auto"] = "auto"


class LlmConfig(BaseModel):
    baseUrl: str = ""
    apiKey: str = ""
    model: str = ""


class ConfigUpdate(BaseModel):
    skipPunctuation: bool = True
    skipLimit: int = 3
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


@app.get("/api/health")
def health():
    return {"status": "ok"}


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
    segments = split_into_segments(payload.content)
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
    segments = split_into_segments(payload.content)
    material.update({
        "title": payload.title,
        "tags": [t.strip() for t in payload.tags.split(",") if t.strip()],
        "content": payload.content,
        "segments": segments,
    })
    store.save(material)
    return material


@app.delete("/api/materials/{material_id}", status_code=204)
def delete_material(material_id: str):
    store = _get_store()
    if not store.delete(material_id):
        raise HTTPException(status_code=404, detail="Material not found")


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
