Status: ready-for-agent

## Parent

`.scratch/type-practice/PRD.md`

## What to build

Build the home page (Material Browser) that connects to the backend Material Library and provides the full end-to-end play experience: browse → select → type through a complete Material with all features (unlock, hint, skip, images, results).

**Home page**:
- Material cards in a grid, each showing title and tags
- Tag filter: clickable tags or a tag dropdown to filter the list
- Clicking a material card starts the typing session

**Integration**:
- Fetch material from `GET /api/materials/:id` on selection
- Feed the material's Segments and images into the Typing Engine
- Full typing experience: segment unlock, hint, skip, image unlock, result display
- "Choose New Material" button on results page navigates back to home

## Acceptance criteria

- [ ] Home page fetches and displays materials from the backend API
- [ ] Material cards show title and tags
- [ ] Tag filtering works (click a tag, list filters)
- [ ] Clicking a material starts a typing session with real data
- [ ] Full typing experience works end-to-end: unlock, hint, skip, images, results
- [ ] "Choose New Material" returns to the home page
- [ ] Empty library state shows a helpful message (direct to admin)

## Blocked by

- Issue 06 (Image unlock + Results)
- Issue 07 (Material Library + Admin)
