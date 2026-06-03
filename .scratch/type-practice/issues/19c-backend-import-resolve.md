Status: ready-for-agent
Labels: backend, tdd

# 19c: Backend — Material Import Resolution Endpoint

## Goal

Add `POST /api/materials/import/resolve` that accepts conflict decisions and performs the actual import.

## Depends On

- 19b (upload detection must be complete first)

## Scope

- File: `backend/app/main.py` — add resolve endpoint
- File: `backend/app/splitter.py` — use existing `split_into_segments()` to generate segments
- File: `backend/tests/test_materials_api.py` — add resolve tests

## Specification

### Request

```json
{
  "upload_id": "uuid-from-19b",
  "decisions": [
    {
      "index": 2,
      "action": "keep_local"
    },
    {
      "index": 3,
      "action": "use_imported"
    },
    {
      "index": 4,
      "action": "keep_both"
    }
  ]
}
```

### Actions

| Action | Effect |
|--------|--------|
| `keep_local` | Skip this material, local version unchanged |
| `use_imported` | Overwrite local material (same ID as local) with imported data, re-split segments |
| `keep_both` | Create new material with new ID from imported data, keep local untouched |

### For `new` materials (no conflict):

- Automatically imported with their original ID (or a new generated ID if original conflicts with existing)
- Segments generated via `split_into_segments(material["content"])`

### For `use_imported` materials:

- Update existing material's `title`, `tags`, `content` in place (keep local ID)
- Re-generate segments via `split_into_segments()`

### For `keep_both` materials:

- Create a new material with a fresh UUID
- Copy `title`, `tags`, `content` from imported
- Generate segments via `split_into_segments()`

### Response (200 OK)

```json
{
  "imported": 3,
  "skipped": 1,
  "updated": 1,
  "total": 5
}
```

### Error Handling

- Invalid `upload_id` → 404
- Expired `upload_id` → 410 Gone
- Missing decision for a conflict → 400
- Invalid action → 400

## Tests Required

1. Resolve with all `keep_local` — nothing imported, summary shows 0 imported, N skipped
2. Resolve with all `use_imported` — local materials updated, segments regenerated
3. Resolve with all `keep_both` — new materials created with new IDs
4. Mixed decisions — correct counts in summary
5. `new` materials (no conflicts) auto-imported
6. Invalid upload_id → 404
7. Segments are correctly generated from content on import

## Do NOT

- Modify the conflict detection logic (19b)
- Change segment splitting algorithm
- Import without re-splitting segments
