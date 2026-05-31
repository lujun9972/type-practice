"""JSON-file-based Material store."""
from __future__ import annotations

import json
from pathlib import Path


class MaterialStore:
    """Persists materials to a single JSON file."""

    def __init__(self, path: Path) -> None:
        self._path = Path(path)
        self._data: dict[str, dict] = {}
        if self._path.exists():
            self._data = json.loads(self._path.read_text(encoding="utf-8"))

    def _flush(self) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._path.write_text(
            json.dumps(self._data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def save(self, material: dict) -> None:
        self._data[material["id"]] = material
        self._flush()

    def get(self, material_id: str) -> dict | None:
        return self._data.get(material_id)

    def list_all(self) -> list[dict]:
        return list(self._data.values())

    def delete(self, material_id: str) -> bool:
        if material_id not in self._data:
            return False
        del self._data[material_id]
        self._flush()
        return True
