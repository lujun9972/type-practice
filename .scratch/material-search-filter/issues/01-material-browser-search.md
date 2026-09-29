Status: ready-for-agent

## Parent

PRD: `.scratch/material-search-filter/PRD.md`

## What to build

Create a new `MaterialBrowser` Vue 3 component and integrate it into PlayPage, replacing the inline material browser section.

The component receives a `materials` array prop and manages its own search state. It renders:
- A search input box at the top with a ✕ clear button (visible when search text is non-empty)
- A list of material cards showing title + tags
- Clicking a card emits `@select(material)`

Search behavior:
- Filters materials where the title OR any tag name contains the search query (case-insensitive)
- Input is debounced at 300ms to avoid excessive re-filtering during typing
- The clear button resets the search query and restores the full list
- IME composition: do not trigger filtering during IME composition (Chinese input)

PlayPage integration:
- Replace the `<div v-else-if="!activeMaterial" class="material-browser">` section with `<MaterialBrowser>`
- The URL fetch form and AI topic generation form stay OUTSIDE MaterialBrowser (they are creation tools, not browsing)
- Layout order: URL form → AI form → MaterialBrowser
- The `showRandomButton` prop is set to `true`, and the random button is rendered inside MaterialBrowser
- The `@select` event connects to the existing `onSelect` handler
- Error banner (`error` ref) stays in PlayPage, displayed above MaterialBrowser

Remove from PlayPage: the `activeTag` ref, `filteredMaterials` computed, `onTagClick` function, `clearFilter` function, and the inline `.material-cards` / `.tag` / `.active-filter` template code.

Component interface:
- Props: `materials: Material[]`, `showRandomButton?: boolean` (default false)
- Events: `@select(material: Material)`
- Slots: `#card-actions="{ material }"` (unused in this slice, but the slot outlet exists for future slices)

Prior art for tests: `frontend/tests/PlayPage.test.ts` — same mount + mock API + interaction pattern.

## Acceptance criteria

- [ ] New `MaterialBrowser` component created with search box, clear button, and material card list
- [ ] Search filters materials by title and tag name (case-insensitive, substring match)
- [ ] Search input is debounced at 300ms
- [ ] Clear button (✕) resets search and shows all materials
- [ ] IME composition does not trigger mid-composition filtering
- [ ] PlayPage renders MaterialBrowser in place of the old inline browser
- [ ] URL fetch and AI generation forms remain functional above MaterialBrowser
- [ ] Clicking a material card triggers `onSelect` and starts a typing session
- [ ] Random button (🎲) visible and works, selecting from filtered results
- [ ] Error banner still displays correctly
- [ ] Existing PlayPage tests updated to pass with new component structure
- [ ] New `MaterialBrowser.test.ts` covers: search filtering, clear button, card click emission, random button behavior

## Blocked by

None — can start immediately.
