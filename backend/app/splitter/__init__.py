"""Segment Splitter: split raw text into typed Segment nodes."""
from __future__ import annotations

import re

# Characters that serve as natural split points.
_SPLIT_POINTS = re.compile(r"(?<=[。！？；.!?])\s*")
_COMMA_SPLIT = re.compile(r"(?<=[，,、；;])")
_HTML_TAG = re.compile(r"<[^>]+>")

MIN_SEGMENT = 10
MAX_SEGMENT = 40


def _split_long_segment(text: str) -> list[str]:
    """If text exceeds MAX_SEGMENT, split on commas; otherwise return as-is."""
    if len(text) <= MAX_SEGMENT:
        return [text]

    parts = _COMMA_SPLIT.split(text)
    merged: list[str] = []
    current = ""
    for part in parts:
        candidate = current + part
        if len(candidate) > MAX_SEGMENT and current:
            merged.append(current)
            current = part
        else:
            current = candidate
    if current:
        merged.append(current)

    # Fallback: if still no split happened, force-split by character count.
    if len(merged) == 1 and len(merged[0]) > MAX_SEGMENT:
        chunk = merged[0]
        forced = [chunk[i : i + MAX_SEGMENT] for i in range(0, len(chunk), MAX_SEGMENT)]
        return forced

    return merged or [text]


def split_into_segments(
    text: str, images: list[dict] | None = None
) -> list[dict]:
    """Split raw text into an ordered list of Segment nodes.

    Each node is {"type": "text", "content": "..."} or
    {"type": "image", "url": "...", "position": int}.
    """
    if not text or not text.strip():
        return []

    # Strip HTML tags.
    text = _HTML_TAG.sub("", text)
    if not text.strip():
        return []

    # Phase 1: split on sentence-ending punctuation.
    raw_parts = [p for p in _SPLIT_POINTS.split(text) if p.strip()]

    # Phase 2: further split parts that are too long.
    segments: list[dict] = []
    char_count = 0
    for part in raw_parts:
        for chunk in _split_long_segment(part):
            segments.append({"type": "text", "content": chunk})
            char_count += len(chunk)

    # Phase 3: insert image nodes at their positions.
    if images:
        sorted_images = sorted(images, key=lambda img: img.get("position", 0))
        for img in sorted_images:
            pos = img.get("position", 0)
            # Find insertion index by accumulating text lengths.
            accum = 0
            insert_idx = len(segments)
            for i, seg in enumerate(segments):
                if seg["type"] == "text":
                    if accum >= pos:
                        insert_idx = i
                        break
                    accum += len(seg["content"])
                    if accum >= pos:
                        insert_idx = i + 1
                        break
            segments.insert(
                insert_idx,
                {"type": "image", "url": img["url"], "position": pos},
            )

    return segments
