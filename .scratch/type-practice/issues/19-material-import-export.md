Status: ready-for-agent

# 19: Material Import & Export

## Problem Statement

When the Material Library grows (e.g. 300+ Tang poems), users have no way to back up their materials, migrate them to another machine, or share a curated collection with others. The only current path is manually recreating each material.

## Solution

Add import/export functionality to the Admin page. Export produces a versioned JSON file containing selected materials. Import reads that JSON, detects conflicts (same title + content), and prompts the user to resolve each conflict by choosing: keep local, use imported, or keep both.

## User Stories

1. As a student, I want to export all materials to a JSON file, so that I have a backup of my Material Library
2. As a student, I want to export materials filtered by tag, so that I can share only my Tang poem collection with a friend
3. As a student, I want to manually select which materials to export, so that I can share specific ones
4. As a student, I want to import materials from a JSON file, so that I can restore from backup or use materials from a friend
5. As a student, I want to be warned when imported materials conflict with existing ones (same title + content), so that I don't accidentally create duplicates
6. As a student, I want to choose per-conflict whether to keep local, use imported, or keep both, so that I have full control over my library
7. As a student, I want imported materials to have their segments auto-generated from content, so that I don't need to worry about segment format
8. As a student, I want the export file to include a version number and timestamp, so that future format changes can be handled gracefully
9. As a student, I want to see a summary after import (N imported, M skipped, K conflicts resolved), so that I know what happened
10. As a student, I want the import button on the Admin page (password-protected), so that only authorized users can modify the library
11. As a student, I want the export button on the Admin page, so that I can access it alongside other library management tools
12. As a student, I want to be able to export even when I have no materials (empty export), so that the feature doesn't break on fresh installs

## Implementation Decisions

- **UI location:** Admin page. Add "导出" and "导入" buttons to the existing admin toolbar.
- **Export scope:** Three modes — all materials, by tag filter, or manually selected (checkboxes on material cards).
- **Export format:** Enhanced JSON with `version` (integer), `exportedAt` (ISO 8601), and `materials` array. Each material contains `id`, `title`, `tags`, `content`. Segments are NOT exported — they are re-derived from content on import via the existing `split_into_segments()` function.
- **Import conflict detection:** Two materials conflict when both `title` and `content` are identical. ID comparison is NOT used (IDs are random and meaningless across machines).
- **Import conflict resolution:** Per-conflict dialog showing local vs imported material, with three choices: "保留本地" (keep local), "使用导入的" (use imported, overwrites local), "两个都保留" (keep both, imported gets a new ID).
- **Backend endpoints:**
  - `POST /api/materials/export` — accepts a list of material IDs or tag filter, returns JSON file
  - `POST /api/materials/import` — accepts JSON file upload, returns conflict list for resolution
  - `POST /api/materials/import/resolve` — accepts resolved conflict decisions, performs the actual import
- **Modules affected:**
  - Backend: new export/import endpoints in `main.py`, `MaterialStore` may need batch operations
  - Frontend: Admin page template and script for export controls, import upload, conflict resolution dialog
  - No changes to TypingSession, TypingEngine, PinyinEngine, or PlayPage

## Testing Decisions

- **What makes a good test:** test external behavior — export returns valid JSON with correct structure, import creates materials, conflict detection works, conflict resolution applies user choices. Do not test internal data structures.
- **Modules to test:** Backend API integration tests (pytest), frontend component tests (Vitest) for Admin page import/export UI
- **Prior art:** `backend/tests/test_materials_api.py` — existing CRUD tests; `frontend/tests/AdminPage.test.ts` — existing admin page tests
- **Test cases (backend):**
  - Export all returns version + materials array
  - Export by tag only includes matching materials
  - Export by IDs only includes selected materials
  - Import creates new materials from valid JSON
  - Import detects conflicts (same title + content)
  - Import resolution: keep local skips import
  - Import resolution: use imported overwrites local
  - Import resolution: keep both creates new with new ID
  - Import with version 1 accepted (forward compatibility)
- **Test cases (frontend):**
  - Export button triggers download
  - Import button opens file picker
  - Conflict dialog shows local vs imported
  - Conflict dialog offers three choices

## Out of Scope

- CSV/Excel export format
- Export/import of Progress data
- Export/import of user stats (XP, levels, streaks)
- Drag-and-drop file upload
- Partial import (importing only some materials from a file)
- Export scheduling or auto-backup
- Cloud sync

## Further Notes

- The two-step import (detect conflicts → resolve) prevents accidental data loss from a single click.
- Exporting without segments keeps the file small and format-stable across segment algorithm changes.
- The `version` field in the export format enables future migration paths without breaking old exports.
