"""Subtitle parser: parse SRT/VTT files into timestamped segments."""
from __future__ import annotations

import re
from pathlib import Path

import chardet

# SRT timestamp: 00:00:01,000 --> 00:00:04,000
_SRT_TS = re.compile(
    r"(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})"
)

# HTML-like formatting tags to strip
_FMT_TAG = re.compile(r"<[^>]+>")

# ASS/SRT control sequences like {\an8}
_CTRL_SEQ = re.compile(r"\{\\[^}]+\}")


def _ts_to_ms(h: str, m: str, s: str, ms: str) -> int:
    return int(h) * 3600000 + int(m) * 60000 + int(s) * 1000 + int(ms)


def _clean_text(text: str) -> str:
    """Strip formatting tags and control sequences, collapse whitespace."""
    text = _FMT_TAG.sub("", text)
    text = _CTRL_SEQ.sub("", text)
    return text.strip()


def _detect_format(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext == ".vtt":
        return "vtt"
    return "srt"  # default to SRT


def _parse_srt(content: str) -> list[dict]:
    blocks = re.split(r"\n\s*\n", content.strip())
    entries: list[dict] = []
    for block in blocks:
        lines = block.strip().splitlines()
        if len(lines) < 2:
            continue
        # Find timestamp line
        ts_line = None
        ts_idx = -1
        for i, line in enumerate(lines):
            if "-->" in line:
                ts_line = line
                ts_idx = i
                break
        if ts_line is None:
            continue
        m = _SRT_TS.search(ts_line)
        if not m:
            continue
        start_ms = _ts_to_ms(m.group(1), m.group(2), m.group(3), m.group(4))
        end_ms = _ts_to_ms(m.group(5), m.group(6), m.group(7), m.group(8))
        # Text is everything after timestamp line
        text_lines = lines[ts_idx + 1:]
        text = " ".join(_clean_text(l) for l in text_lines if l.strip())
        if not text:
            continue
        entries.append({"content": text, "startTimeMs": start_ms, "endTimeMs": end_ms})
    return entries


def _parse_vtt(content: str) -> list[dict]:
    """VTT is structurally similar to SRT after the header."""
    # Remove WEBVTT header line and optional metadata
    lines = content.strip().splitlines()
    # Skip until we find a blank line after header
    start = 0
    for i, line in enumerate(lines):
        if line.strip() == "" and i > 0:
            start = i + 1
            break
    else:
        start = 1
    body = "\n".join(lines[start:])
    return _parse_srt(body)


def _decode_bytes(raw: bytes) -> str:
    detected = chardet.detect(raw)
    encoding = detected.get("encoding") or "utf-8"
    try:
        return raw.decode(encoding)
    except (UnicodeDecodeError, LookupError):
        pass
    for fallback in ("gbk", "gb2312", "big5", "latin-1"):
        try:
            return raw.decode(fallback)
        except (UnicodeDecodeError, LookupError):
            continue
    return raw.decode("utf-8", errors="replace")


def parse_subtitle(content: str | bytes, filename: str) -> list[dict]:
    """Parse a subtitle file into a list of timestamped entries.

    Args:
        content: Raw file content (str or bytes).
        filename: Original filename (used to detect format).

    Returns:
        List of {"content": str, "startTimeMs": int, "endTimeMs": int}.

    Raises:
        ValueError: If content is empty or produces no valid entries.
    """
    if isinstance(content, bytes):
        content = _decode_bytes(content)

    content = content.strip()
    if not content:
        raise ValueError("Subtitle file is empty")

    fmt = _detect_format(filename)
    if fmt == "vtt":
        entries = _parse_vtt(content)
    else:
        entries = _parse_srt(content)

    if not entries:
        raise ValueError("No valid subtitle entries found")

    return entries
