Status: ready-for-agent
Labels: frontend, tdd

# 19d: Frontend — Export UI on Admin Page

## Goal

Add export controls to Admin page: mode selector (all/tags/manual), tag filter, material checkboxes, and export button.

## Depends On

- 19a (backend export endpoint must exist)

## Scope

- File: `frontend/src/pages/AdminPage.vue` — add export UI section
- File: `frontend/tests/AdminPage.test.ts` — add export tests

## Specification

### UI Layout

Add to Admin page toolbar area:

1. **导出 button** — always visible when logged in
2. **Export mode dropdown**: 全部 / 按标签 / 手动选择
3. **Tag filter** (shown when mode=tags): multi-select from existing tags
4. **Material checkboxes** (shown when mode=manual): checkboxes on each material card
5. **确认导出 button** — triggers download

### Behavior

- Clicking "导出" opens the export options panel
- Mode defaults to "全部"
- When mode=tags, show tag chips (reuse existing tag list from store)
- When mode=manual, show checkboxes on material cards, add "全选/取消全选" toggle
- "确认导出" calls `POST /api/materials/export` with selected mode/params
- Response triggers browser download of the JSON file
- After download, show success toast "已导出 N 条素材"
- Error handling: show error toast on failure

### API Call

```typescript
const authHeader = () => ({ Authorization: `Bearer ${token.value}` })

// Export
const response = await fetch('/api/materials/export', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...authHeader() },
  body: JSON.stringify({ mode: 'all' })
})
// Download file from response blob
```

## Tests Required

1. Export button visible when logged in
2. Export mode dropdown shows three options
3. Tag filter appears when mode=tags selected
4. Checkboxes appear when mode=manual selected
5. Confirm export triggers API call
6. Success toast shown after export

## Do NOT

- Change PlayPage or other pages
- Implement import UI (that's 19e)
- Add new dependencies
