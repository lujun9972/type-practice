Status: ready-for-agent

# PRD: Material Search & Tag Filtering

## Problem Statement

When the Material Library grows large (e.g., 300+ items from the built-in Tang 300 poems collection plus user-added materials), finding and selecting a specific Material becomes tedious. The current interface only supports single-tag filtering by clicking a tag chip embedded inside a material card, and there is no text search. Users must scroll through a long unsorted list to find what they want. This affects both the practice page (PlayPage) where students select materials to type, and the management page (AdminPage) where administrators manage the library.

## Solution

Add a unified search and multi-tag filtering capability to both the practice page and the management page. A new shared `MaterialBrowser` component will provide:

- A search box that filters Materials by title and tag name (with debounced input and a clear button)
- A tag bar showing all available tags sorted by material count (descending), with the top 8 visible and a "more/less" toggle for the rest
- Multi-tag AND filtering — selecting multiple tags narrows results to materials that have ALL selected tags
- Search and tag filters combined with AND logic (intersection)
- An empty-state message with a "clear all filters" button when no materials match
- Filter state persistence when navigating away and back (e.g., returning from a typing session)

All filtering is performed client-side on the full material list, with no backend API changes required.

## User Stories

1. As a student, I want to type a keyword in a search box to see only Materials whose title or tag name matches, so that I can quickly find a specific material without scrolling.
2. As a student, I want to see a search clear button (✕) when the search box has text, so that I can reset my search in one click.
3. As a student, I want the search to update results automatically as I type (after a short pause), so that I get instant feedback without pressing Enter.
4. As a student, I want to see all available tags in a tag bar above the material cards, so that I know what categories exist without opening individual cards.
5. As a student, I want the most popular tags (by material count) to appear first in the tag bar, so that the most useful filters are immediately visible.
6. As a student, I want to click multiple tags to filter materials, so that I can narrow down results precisely (e.g., "李白" + "七言").
7. As a student, I want selected tags to be highlighted visually, so that I can see my active filters at a glance.
8. As a student, I want to click a selected tag again to deselect it, so that I can remove filters individually.
9. As a student, I want search + tag filters to work together with AND logic, so that combining them narrows results further rather than widening them.
10. As a student, I want to see the first 8 tags by default with a "more" toggle to show all, so that the tag bar doesn't overwhelm the screen when there are many tags.
11. As a student, I want to toggle the tag bar expanded/collapsed, so that I can see all tags when needed but keep the UI compact normally.
12. As a student, I want to see a helpful message and a "clear all filters" button when no materials match my search + tag combination, so that I'm not stuck on an empty screen.
13. As a student, I want my search text and selected tags to persist when I return from a typing session to the material list, so that I can continue browsing from where I left off.
14. As a student, I want the 🎲 random button to only select from currently filtered materials, so that random practice respects my active filters.
15. As an administrator, I want the same search and tag filtering on the management page, so that I can find materials to edit or delete quickly when the library is large.
16. As a student, I want the search to match both Chinese and English text, so that it works regardless of material language.
17. As a student, I want the search to be case-insensitive, so that I don't have to worry about capitalization when searching.
18. As an administrator, I want the export checkbox and delete button to still appear on material cards in the management page, so that my existing workflows are preserved.
19. As a student, I want the tag bar to collapse back to 8 tags when I clear all filters, so that the UI resets to its default compact state.

## Implementation Decisions

### New component: `MaterialBrowser`

A reusable Vue 3 component that encapsulates all material browsing UI and filter logic.

**Props:**
- `materials: Material[]` — full list of materials from the API
- `showRandomButton?: boolean` — whether to show the 🎲 random practice button (default: false)

**Events:**
- `@select(material: Material)` — emitted when a material card is clicked

**Slots:**
- `#card-actions="{ material }"` — optional slot for per-card action buttons (used by AdminPage for delete/export)

**Internal state (managed entirely by the component):**
- `searchQuery: string` — current search text
- `selectedTags: string[]` — currently selected tags for filtering
- `tagBarExpanded: boolean` — whether the tag bar shows all tags or just the top 8

**Computed properties (internal):**
- `allTags: string[]` — unique tags from all materials, sorted by material count descending
- `visibleTags: string[]` — first 8 tags (or all if expanded)
- `filteredMaterials: Material[]` — materials matching search AND all selected tags

**Filtering logic:**
1. Start with full `materials` array
2. If `searchQuery` is non-empty (case-insensitive): keep materials where title OR any tag name includes the search query
3. If `selectedTags` is non-empty: keep materials where tags include ALL selected tags (AND)
4. Result is the intersection of both filters

**Debounce:** Search input is debounced at 300ms using a watch with `watchDebounced` or manual `setTimeout`/`clearTimeout` pattern.

### PlayPage modification

Replace the inline material browser section (`<div v-else-if="!activeMaterial" class="material-browser">`) with:
```html
<MaterialBrowser
  v-else-if="!activeMaterial"
  :materials="materials"
  :show-random-button="true"
  @select="onSelect"
/>
```

Remove from PlayPage:
- The `activeTag` ref and `filteredMaterials` computed (now inside MaterialBrowser)
- The `onTagClick` and `clearFilter` functions
- The inline material cards, tag chips, and active-filter display
- The inline URL form and topic form move OUTSIDE MaterialBrowser (they are creation tools, not browsing tools)

The URL fetch form and AI topic generation form remain in PlayPage, positioned above the MaterialBrowser component.

Layout order:
1. URL fetch form
2. AI topic generation form
3. MaterialBrowser (contains: search box → tag bar → filter state → random button → card list)

### AdminPage modification

Replace the inline material list (`<div v-else class="material-list">`) with:
```html
<MaterialBrowser
  v-else
  :materials="materials"
  @select="onView"
>
  <template #card-actions="{ material }">
    <input v-if="showExportPanel && exportMode === 'ids'" type="checkbox" :value="material.id" v-model="exportSelectedIds" @click.stop class="export-checkbox" />
    <button v-if="pendingDeleteId !== material.id" class="btn-delete" @click.stop="requestDelete(material.id)">删除</button>
    <template v-else>
      <button class="btn-confirm-action" @click.stop="confirmDelete">确定删除</button>
      <button class="btn-cancel-action" @click.stop="cancelDelete">取消</button>
    </template>
  </template>
</MaterialBrowser>
```

### Filter state persistence

MaterialBrowser emits filter state changes so the parent can persist them. However, for simplicity in this iteration:
- When the user navigates away (enters a typing session) and back, the MaterialBrowser component is conditionally rendered (`v-else-if="!activeMaterial"`). When it re-appears, it remounts.
- To preserve state across remounts, the parent (PlayPage) holds the search query and selected tags as refs, passing them as initial values via props to MaterialBrowser. When the user returns from typing, the parent passes the same values back.
- Alternative simpler approach: use `<KeepAlive>` on the MaterialBrowser. This preserves all internal state automatically without prop-passing.

Decision: Use `<KeepAlive>` for state persistence. It's the simplest approach and Vue's built-in mechanism for exactly this use case.

### No backend changes

All filtering happens client-side. The existing `listMaterials()` API (which returns all materials) is used as-is. No new API endpoints or parameters are needed.

## Testing Decisions

### What makes a good test

Tests should verify external behavior (what the user sees and does), not implementation details (which computed property runs first, internal ref names). A good test:
- Mounts the component with realistic props
- Simulates user actions (typing, clicking tags, clicking cards)
- Asserts on visible output (DOM content, emitted events)
- Does NOT assert on internal reactive state

### Modules to test

1. **`MaterialBrowser.test.ts`** — The new shared component, tested in isolation:
   - Search filtering: typing narrows results, clear button resets, debounce behavior
   - Multi-tag filtering: selecting multiple tags AND-filters, deselecting a tag widens results
   - Combined search + tag filtering: AND logic verified
   - Tag bar: shows top 8, "more" expands to all, "less" collapses back
   - Tag ordering: tags sorted by material count descending
   - Empty state: shows message + clear button when no results
   - Card click: emits `@select` with correct material
   - Slot rendering: `#card-actions` slot content appears in cards
   - Random button: only shown when prop is true, only selects from filtered results

2. **`PlayPage.test.ts`** (update existing tests):
   - The existing "tag filter" tests need updating to work with MaterialBrowser
   - Verify MaterialBrowser renders inside PlayPage
   - Verify URL/AI generation forms still work
   - Verify filter state persists across back navigation (KeepAlive)

3. **`AdminPage.test.ts`** (update existing tests):
   - Verify MaterialBrowser renders inside AdminPage
   - Verify card-actions slot renders delete buttons
   - Verify export checkboxes still work in the slot

### Prior art

The existing `PlayPage.test.ts` follows the same pattern:
- `vi.mock("@/api/materials")` to mock API calls
- `mount()` with router plugin for full component mounting
- `wrapper.findAll(".material-card")` to check filtered results
- `wrapper.find(".tag")` to find and click tags
- Testing filter behavior by checking card count after tag click

The new `MaterialBrowser.test.ts` will use the same mount + interaction + assertion pattern, but simpler (no router needed since MaterialBrowser doesn't use routing).

## Out of Scope

- Backend API changes (search server-side, pagination, etc.)
- Searching within material body/content text (only title and tag names)
- Persisting filter state across browser sessions (sessionStorage, etc.)
- Tag management (creating, renaming, deleting tags as a standalone entity)
- Sorting materials by name, date, or progress
- Pagination or lazy loading of material cards
- Keyboard shortcuts for tag selection
- AdminPage-only features like tag filtering for the export panel (the export panel already has its own tag filter)

## Further Notes

- The CONTEXT.md has been updated to record the new filtering relationship: "用户在练习页和管理页均可通过搜索标题/标签名和多标签 AND 过滤缩小素材范围，搜索与标签过滤取交集"
- No ADR is needed for this change — the decisions are standard UI patterns with no surprising trade-offs
- The `<KeepAlive>` approach for state persistence may need adjustment if MaterialBrowser is also used inside AdminPage's tab-like views (currently AdminPage doesn't have conditional rendering of the material list, so this is only a concern for PlayPage)
- IME composition: the search input must not trigger filtering during IME composition (中文输入法组合期间). The debounce naturally handles this, but the input handler should check `composing` state if using `@input` instead of a debounced watcher
