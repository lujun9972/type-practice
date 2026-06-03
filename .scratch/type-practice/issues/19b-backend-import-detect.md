Status: ready-for-agent
Labels: backend, tdd

# 19b: Backend — Material Import Endpoint (Detect Conflicts)

## Goal

Add `POST /api/materials/import` that accepts a JSON file upload, validates format, and returns a list of conflicts for user resolution.

## Depends On

- 19a (export format definition — import must accept the same format)

## Scope

- File: `backend/app/main.py` — add import endpoint
- File: `backend/tests/test_materials_api.py` — add import tests

## Specification

### Request

- Content-Type: `multipart/form-data`
- Field: `file` — the JSON file
- Auth: requires valid token (protected endpoint)

### Validation

- Must be valid JSON
- Must have `version` field (integer, currently only version 1 accepted)
- Must have `materials` array
- Each material must have `title` (string) and `content` (string)
- `tags` is optional (defaults to `[]`)
- `id` is optional (will be generated if missing)
- Return `400` with descriptive message for invalid files

### Response (200 OK)

```json
{
  "total": 5,
  "conflicts": [
    {
      "index": 2,
      "imported": {
        "id": "old-id",
        "title": "静夜思",
        "tags": ["唐诗"],
        "content": "床前明月光..."
      },
      "local": {
        "id": "existing-id",
        "title": "静夜思",
        "tags": ["李白", "唐诗"],
        "content": "床前明月光..."
      }
    }
  ],
  "new": [
    {
      "index": 0,
      "material": { "id": "abc", "title": "春晓", "tags": ["唐诗"], "content": "春眠不觉晓..." }
    }
  ]
}
```

### Conflict Detection

- Two materials conflict when BOTH `title` AND `content` are identical (case-sensitive exact match)
- ID is NOT used for conflict detection
- Materials with no conflict go into `new` array
- Materials with conflict go into `conflicts` array

### Rules

- This endpoint does NOT modify the store — it only detects and reports
- Actual import happens in 19c via `/api/materials/import/resolve`
- Preserve the uploaded file data server-side (in-memory) temporarily for the resolve step, keyed by a `upload_id` returned in the response
- The `upload_id` is a UUID generated per upload, expires after 10 minutes

## Tests Required

1. Import valid file with no conflicts — returns empty conflicts, all in `new`
2. Import valid file with conflicts — returns conflict list with local + imported data
3. Import file missing version — returns 400
4. Import file with unsupported version — returns 400
5. Import non-JSON file — returns 400
6. Import file with material missing title — returns 400
7. Import creates an `upload_id` for later resolution

## Do NOT

- Actually import materials (that's 19c)
- Modify the store
- Change existing endpoints
