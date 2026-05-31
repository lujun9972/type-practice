Status: ready-for-agent

## Parent

`.scratch/type-practice/PRD.md`

## What to build

Implement the Material Library backend storage and CRUD API, plus a browser-based admin page to manage materials.

**Backend**: Implement all Material CRUD endpoints:
- `GET /api/materials` — list all materials (with optional `?tag=` filter)
- `POST /api/materials` — create material (accepts title, tags as comma-separated string, raw text content, optional images)
- `GET /api/materials/:id` — get single material with pre-split Segments
- `PUT /api/materials/:id` — update material
- `DELETE /api/materials/:id` — delete material

On create/update, the backend runs the Segment Splitter on the raw content and stores the resulting Segments. Storage can be file-based (JSON files) or a lightweight embedded database.

**Admin page**: A separate route (`/admin`) with:
- List view of all materials showing title, tags, and actions (edit/delete)
- Create/Edit form: title field, tags field (comma-separated), content textarea (paste text), image upload
- Preview: shows how the Segment Splitter would split the content before saving

Write tests: CRUD operations, tag filtering, persistence across restart, Segment splitting on create.

## Acceptance criteria

- [ ] All 5 CRUD API endpoints implemented and working
- [ ] Materials stored persistently (survive backend restart)
- [ ] Segment Splitter runs on create/update, Segments stored with Material
- [ ] Tag filtering works on GET /api/materials?tag=X
- [ ] Admin page lists all materials with title and tags
- [ ] Admin create form: paste text, set title and tags, upload images
- [ ] Admin preview shows Segments before saving
- [ ] Admin edit and delete work correctly
- [ ] Tests pass for CRUD operations, filtering, and persistence

## Blocked by

- Issue 02 (Segment Splitter)
