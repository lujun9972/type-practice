Status: ready-for-agent
Labels: frontend, tdd

# 19e: Frontend — Import UI + Conflict Resolution Dialog

## Goal

Add import button, file picker, conflict resolution dialog, and import summary to Admin page.

## Depends On

- 19b (backend import detection)
- 19c (backend import resolution)

## Scope

- File: `frontend/src/pages/AdminPage.vue` — add import UI + conflict dialog
- File: `frontend/tests/AdminPage.test.ts` — add import tests

## Specification

### Import Flow

1. **导入 button** — next to export button on Admin page
2. Click opens file picker (accept `.json` only)
3. Selected file uploaded to `POST /api/materials/import` (multipart)
4. **No conflicts** → auto-resolve, show success summary "已导入 N 条素材"
5. **Has conflicts** → show conflict resolution dialog

### Conflict Resolution Dialog

For each conflict:

```
┌─────────────────────────────────────────────┐
│  素材冲突 (2/5)                              │
│                                             │
│  本地版本:                                   │
│    标题: 静夜思                              │
│    标签: 李白, 唐诗                          │
│    内容: 床前明月光...                        │
│                                             │
│  导入版本:                                   │
│    标题: 静夜思                              │
│    标签: 唐诗                                │
│    内容: 床前明月光...                        │
│                                             │
│  [保留本地]  [使用导入的]  [两个都保留]         │
└─────────────────────────────────────────────┘
```

- Show one conflict at a time (sequential)
- Highlight differences (e.g. tags differ → bold/colored)
- Three buttons: "保留本地", "使用导入的", "两个都保留"
- After resolving all conflicts, call `POST /api/materials/import/resolve`
- Show final summary: "导入完成: N 条导入, M 条跳过, K 条更新"

### API Calls

```typescript
// Upload
const formData = new FormData()
formData.append('file', file)
const result = await fetch('/api/materials/import', {
  method: 'POST',
  headers: authHeader(),
  body: formData
})
const { upload_id, conflicts, new: newItems } = await result.json()

// Resolve
const resolveResult = await fetch('/api/materials/import/resolve', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...authHeader() },
  body: JSON.stringify({ upload_id, decisions })
})
```

### Error Handling

- Upload fails → error toast "导入失败: ..."
- Invalid file format → error toast from backend message
- Resolve fails → error toast
- After successful import → refresh material list

## Tests Required

1. Import button visible when logged in
2. Clicking import opens file picker (accept .json)
3. Conflict dialog shows local vs imported material
4. Conflict dialog has three resolution buttons
5. After resolving all conflicts, resolve API is called
6. Success summary displayed after import
7. Error toast shown on upload failure

## Do NOT

- Implement export UI (that's 19d)
- Change backend endpoints
- Add new dependencies
