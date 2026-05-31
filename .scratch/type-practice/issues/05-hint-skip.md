Status: ready-for-agent

## Parent

`.scratch/type-practice/PRD.md`

## What to build

Add Hint and Skip buttons to the typing interface.

**Hint**: When pressed, displays the pinyin (for Chinese characters) or the next letter (for English) for the current expected character. Unlimited uses, no score penalty. The hint appears near the cursor position and auto-hides after a few seconds or when the user starts typing.

**Skip**: When pressed, skips the current Segment (marks it as skipped), unlocks the next Segment. Limited to a configurable number of uses per Material (default 3). The remaining Skip count is displayed next to the Skip button. When Skips are exhausted, the button is disabled.

Write unit tests: Hint returns correct pinyin/letter, Hint count is unlimited, Skip decrements counter, Skip is blocked when count is zero, Skip unlocks next Segment.

## Acceptance criteria

- [ ] Hint button visible during typing
- [ ] Hint shows pinyin for Chinese characters at cursor position
- [ ] Hint shows next letter for English characters at cursor position
- [ ] Hint auto-hides after a few seconds or on next input
- [ ] Hint can be used unlimited times
- [ ] Skip button visible with remaining count displayed
- [ ] Skip skips current Segment and unlocks next
- [ ] Skip count decrements on each use
- [ ] Skip button disabled when count reaches zero
- [ ] Unit tests pass for Hint and Skip state transitions

## Blocked by

- Issue 04 (Multi-segment unlock)
