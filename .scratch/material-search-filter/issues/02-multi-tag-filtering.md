Status: ready-for-agent

## Parent

PRD: `.scratch/material-search-filter/PRD.md`

## What to build

Extend `MaterialBrowser` with a tag bar and multi-tag AND filtering.

Tag bar:
- Displayed between the search box and the material card list
- Shows all unique tags extracted from the `materials` prop
- Tags are sorted by material count descending (tags used on the most materials appear first)
- Clicking a tag selects it (highlighted visual state); clicking again deselects it
- Multiple tags can be selected simultaneously

Filtering logic:
- When tags are selected, only materials that have ALL selected tags are shown (AND logic)
- Search filter and tag filter work together with AND logic — a material must match the search query AND have all selected tags
- When no tags are selected and no search query, all materials are shown

The old `activeTag` single-tag toggle behavior in PlayPage is already removed (done in issue #01). This issue adds the new multi-tag capability inside MaterialBrowser.

Current filter state should be visible above the card list — show selected tags as chips with ✕ to deselect individually.

## Acceptance criteria

- [ ] Tag bar renders between search box and card list
- [ ] All unique tags from materials are displayed
- [ ] Tags are sorted by material count descending
- [ ] Clicking a tag selects it (visual highlight); clicking again deselects
- [ ] Multiple tags can be selected simultaneously
- [ ] Filtering uses AND logic — only materials with ALL selected tags appear
- [ ] Search + tag filters combine with AND logic
- [ ] Selected tags shown as filter chips above card list, each with ✕ to remove
- [ ] Deselecting all tags restores unfiltered (search-only) view
- [ ] `MaterialBrowser.test.ts` updated with tests for: multi-tag selection, AND filtering, tag ordering, individual tag deselect, search + tag combination

## Blocked by

- `.scratch/material-search-filter/issues/01-material-browser-search.md` — MaterialBrowser component must exist with search and card rendering first.
