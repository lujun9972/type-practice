Status: ready-for-agent

## Parent

PRD: `.scratch/material-search-filter/PRD.md`

## What to build

Add two UX refinements to the tag bar and empty state in MaterialBrowser.

Tag bar collapse/expand:
- By default, show only the first 8 tags (the 8 most popular by material count)
- If there are more than 8 tags total, show a "更多…" toggle button at the end of the tag bar
- Clicking "更多…" expands the tag bar to show all tags; button text changes to "收起"
- Clicking "收起" collapses back to 8 tags
- If there are 8 or fewer tags, no toggle button is shown

Empty state:
- When the combination of search query and selected tags produces zero matching materials, show a message instead of an empty card list
- Message: "没有匹配的素材，试试调整搜索词或标签"
- Below the message, a "清除所有过滤" button that clears both the search query and all selected tags in one click
- The empty state replaces the card list area only; search box and tag bar remain visible so the user can adjust filters manually too

## Acceptance criteria

- [ ] Tag bar shows first 8 tags by default
- [ ] "更多…" button appears when more than 8 tags exist
- [ ] Clicking "更多…" expands to show all tags; button changes to "收起"
- [ ] Clicking "收起" collapses back to 8 tags
- [ ] No toggle button when total tags ≤ 8
- [ ] Empty state message shown when filtered results are empty
- [ ] "清除所有过滤" button clears search query AND all selected tags
- [ ] After clearing, full material list is visible again
- [ ] Search box and tag bar remain visible in empty state
- [ ] `MaterialBrowser.test.ts` updated with tests for: collapse/expand toggle, empty state rendering, clear all button behavior

## Blocked by

- `.scratch/material-search-filter/issues/02-multi-tag-filtering.md` — Tag bar with multi-tag filtering must exist first.
