Status: ready-for-agent

## Parent

`.scratch/type-practice/PRD.md`

## What to build

Two features added to the typing flow:

**Image unlock**: Segments can include image nodes between text Segments. Images are hidden (locked) initially. When the user finishes typing the Segment immediately before an image, the image is revealed as an unlock reward with a visual transition. Images display at full width within the typing flow.

**Result display**: After completing all Segments in a Material, show a results overlay/page with:
- Total time (mm:ss format)
- Accuracy: (correct characters / total characters) x 100%
- Speed: total characters / total minutes (chars/min)
- "Play Again" and "Choose New Material" buttons (the buttons can be non-functional placeholders for now)

Use hardcoded data with a few Segments and at least one image to test both features.

## Acceptance criteria

- [ ] Image nodes hidden initially during typing
- [ ] Image revealed with visual transition after preceding Segment is completed
- [ ] Multiple images at different positions in the Material work correctly
- [ ] Images display at full width in the typing flow
- [ ] Results overlay appears after completing all Segments
- [ ] Results show total time in mm:ss format
- [ ] Results show accuracy percentage calculated correctly
- [ ] Results show typing speed in chars/min calculated correctly
- [ ] "Play Again" and "Choose New Material" buttons visible (can be placeholders)

## Blocked by

- Issue 02 (Segment Splitter)
- Issue 05 (Hint + Skip)
