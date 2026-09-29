Status: ready-for-agent

## Parent

PRD: `.scratch/material-search-filter/PRD.md`

## What to build

Replace the AdminPage inline material list with the shared MaterialBrowser component, using the `#card-actions` slot to preserve existing admin functionality.

AdminPage currently has an inline `<div v-else class="material-list">` that renders each material as a row with: title, tags, optional export checkbox (when in export mode with `exportMode === 'ids'`), and a delete button with confirm/cancel flow.

Replace this with `<MaterialBrowser>` using the `#card-actions` slot to inject the per-material admin controls:
- Export checkbox (visible only when `showExportPanel && exportMode === 'ids'`)
- Delete button → confirm/cancel flow (using existing `pendingDeleteId` state)

The `@select` event connects to the existing `onView` handler (which shows the material detail panel).

The export panel, import panel, and other admin features remain unchanged — only the material listing section is replaced.

## Acceptance criteria

- [ ] AdminPage renders MaterialBrowser in place of the old inline material list
- [ ] `@select` event triggers `onView` (shows material detail panel)
- [ ] `#card-actions` slot renders delete button for each material
- [ ] Delete confirm/cancel flow works correctly within the slot
- [ ] Export checkbox renders in the slot when export mode is "ids"
- [ ] Export checkbox selection (`exportSelectedIds`) still works correctly
- [ ] Search and tag filtering work in AdminPage via MaterialBrowser
- [ ] All existing AdminPage tests pass (updated for new component structure)
- [ ] No regression in: material creation, editing, import/export, video upload

## Blocked by

- `.scratch/material-search-filter/issues/01-material-browser-search.md` — MaterialBrowser component must exist first.
