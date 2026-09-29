Status: ready-for-agent

## Parent

PRD: `.scratch/material-search-filter/PRD.md`

## What to build

Preserve MaterialBrowser's filter state when the user enters a typing session and returns to the material list.

Currently, PlayPage conditionally renders MaterialBrowser with `v-else-if="!activeMaterial"`. When a material is selected, MaterialBrowser unmounts. When the user clicks "back", it remounts fresh — losing search query and selected tags.

Solution: Wrap MaterialBrowser in Vue's `<KeepAlive>` component so it stays alive in memory when hidden, preserving all internal reactive state (search query, selected tags, tag bar expanded/collapsed state).

The `<KeepAlive>` should wrap only the MaterialBrowser, not the entire typing session or progress prompt sections. The layout structure becomes:
- When no active material: `<KeepAlive><MaterialBrowser .../></KeepAlive>`
- When active material + showPrompt: progress prompt
- When active material + typing: session area
- When active material + completion: completion screen

The random button must still select from the currently filtered set (which now correctly reflects persisted filters).

## Acceptance criteria

- [ ] MaterialBrowser wrapped in `<KeepAlive>` in PlayPage
- [ ] Search query persists when returning from a typing session
- [ ] Selected tags persist when returning from a typing session
- [ ] Tag bar expanded/collapsed state persists
- [ ] Random button still selects from the filtered set (not the full list)
- [ ] URL fetch and AI generation still work correctly (they are outside KeepAlive)
- [ ] No memory leaks — KeepAlive only keeps one MaterialBrowser instance alive
- [ ] PlayPage tests updated to verify filter state survives back navigation

## Blocked by

- `.scratch/material-search-filter/issues/01-material-browser-search.md` — MaterialBrowser must exist in PlayPage first.
