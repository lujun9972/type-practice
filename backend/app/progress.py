"""Progress endpoints — save/load typing progress with XP and time awarding."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.deps import get_store, get_stats_store, load_progress, save_progress_data

router = APIRouter(tags=["progress"])


@router.get("/api/progress/{material_id}")
def get_progress(material_id: str):
    progress = load_progress()
    if material_id not in progress:
        raise HTTPException(status_code=404, detail="No progress found")
    return progress[material_id]


@router.put("/api/progress/{material_id}")
def save_progress(material_id: str, payload: dict):
    progress = load_progress()
    payload["materialId"] = material_id

    # Award XP from newly completed segments
    old_results = progress.get(material_id, {}).get("segmentResults", [])
    new_results = payload.get("segmentResults", [])
    old_indices = {r["index"] for r in old_results}
    total_new_ms = 0
    for result in new_results:
        if result["index"] not in old_indices:
            xp = result.get("correctChars", 0)
            if xp > 0:
                get_stats_store().add_xp(xp)
            total_new_ms += result.get("timeMs", 0)

    if total_new_ms > 0:
        get_stats_store().add_time(total_new_ms // 1000)

    progress[material_id] = payload
    save_progress_data(progress)
    return payload


@router.delete("/api/progress/{material_id}", status_code=204)
def delete_progress(material_id: str):
    progress = load_progress()
    if material_id not in progress:
        raise HTTPException(status_code=404, detail="No progress found")
    del progress[material_id]
    save_progress_data(progress)
