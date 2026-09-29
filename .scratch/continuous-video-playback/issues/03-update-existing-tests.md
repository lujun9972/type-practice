# Issue 03: Update existing tests for new VideoPlayer props

**Status**: ready-for-agent

## Depends on
- Issue 02 (TypingSession changes)

## Task

Update StickyVideo.test.ts and any other tests that reference old VideoPlayer props.

## What to do

### StickyVideo.test.ts
- Update any test that stubs VideoPlayer to use new prop names (`playUntilMs` instead of `startTimeMs`/`nextStartTimeMs`)
- Verify all 7 existing tests still pass

### TypingSession.test.ts (existing tests only)
- Verify existing non-video tests (segment unlock, skip, hint, results) still pass — they should since video logic is only triggered when videoUrl is present
- If any test creates TypingSession with video segments, update props

### Full regression
```bash
cd frontend && npx vitest run
```
All 174+ tests must pass with 0 regressions.
