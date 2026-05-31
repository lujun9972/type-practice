Status: ready-for-agent

## Parent

`.scratch/type-practice/PRD.md`

## What to build

Extend the Typing Engine to handle multiple Segments with the unlock mechanic. The user sees only the first Segment. After typing it correctly, the next Segment becomes visible (unlocked). This continues until all Segments are typed. Use 3-5 hardcoded Segments for testing.

The unlock transition should have a visual effect to reinforce the "reveal" feeling — the new Segment fades or slides in. Previously typed Segments remain visible above (scrollable if needed) so the user can see what they've already typed.

## Acceptance criteria

- [ ] Only the first Segment is visible when typing starts
- [ ] Completing a Segment unlocks and reveals the next Segment
- [ ] Unlock has a visual transition (fade/slide)
- [ ] Previously typed Segments remain visible above
- [ ] Auto-scroll keeps the current Segment in view as content grows
- [ ] When all Segments are complete, the UI indicates the Material is finished

## Blocked by

- Issue 03 (Type a hardcoded segment)
