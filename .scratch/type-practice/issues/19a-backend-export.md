Status: ready-for-agent
Labels: backend, tdd

# 19a: Backend — Material Export Endpoint

## Goal

Add `POST /api/materials/export` that accepts scope criteria and returns a versioned JSON file.

## Scope

- File: `backend/app/main.py` — add export endpoint
- File: `backend/app/store.py` — add query methods if needed (by tags, by IDs)
- File: `backend/tests/test_materials_api.py` — add export tests

## Specification

### Request Body

```json
{
  "mode": "all" | "tags" | "ids",
  "tags": ["唐诗"],          // only when mode=tags
  "ids": ["abc123"]          // only when mode=ids
}
```

### Response

Content-Type: `application/json`
Content-Disposition: `attachment; filename="materials-export.json"`

```json
{
  "version": 1,
  "exportedAt": "2026-06-03T10:30:00+08:00",
  "materials": [
    {
      "id": "...",
      "title": "...",
      "tags": ["..."],
      "content": "..."
    }
  ]
}
```

### Rules

- `mode=tags`: return materials where ANY tag matches (OR logic)
- `mode=ids`: return materials with matching IDs, silently skip missing IDs
- `mode=all`: return everything
- Each material includes only `id`, `title`, `tags`, `content` — NO `segments`
- Empty result is valid (returns empty materials array)

## Tests Required

1. Export all — returns version + exportedAt + all materials
2. Export by tags — only materials with matching tags
3. Export by IDs — only selected materials, skips missing
4. Export empty (no materials in store) — returns valid structure with empty array
5. Export response has correct Content-Disposition header

## Do NOT

- Change existing endpoints or data structures
- Export segments
- Add authentication (admin page already handles that)
