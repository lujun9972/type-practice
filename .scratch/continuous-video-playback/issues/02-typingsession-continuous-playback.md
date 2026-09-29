# Issue 02: TypingSession — rewrite video coordination for Continuous Playback

**Status**: ready-for-agent

## Depends on
- Issue 01 (VideoPlayer playUntil)

## Task

Rewrite TypingSession's video coordination logic to use Continuous Playback strategy.

## What to do

### Remove
- Refs: `currentStartTimeMs`, `currentNextStartTimeMs`
- Current `triggerVideoPlayback()` logic that sets startTimeMs/nextStartTimeMs

### Add
- Ref: `playUntilMs` (number | null) — passed to VideoPlayer
- Ref: `pendingAdvance` (boolean) — true when user finishes typing before video reaches target
- Ref: `pendingTargetMs` (number | null) — stores the next target when pendingAdvance is true

### New behavior

**On mount (video material, videoUrl present):**
- Set `playUntilMs = seg[0].startTimeMs` — VideoPlayer plays from 0 to first subtitle start, then pauses

**`triggerVideoPlayback(textIndex)`:**
- If video is still playing (hasn't reached current target yet):
  - Set `pendingAdvance = true`, store next target in `pendingTargetMs`
  - Return — don't interrupt current playback
- Else:
  - Compute target: next segment's `endTimeMs`, or null for last segment
  - Set `playUntilMs = target`

**`onReachedTarget()` (replaces `onSegmentPlaybackComplete`):**
- If `pendingAdvance` is true:
  - Set `playUntilMs = pendingTargetMs`
  - Reset `pendingAdvance` and `pendingTargetMs`
- Else: video stays paused, waiting for user to finish typing

**`onVideoBuffered()` (resume scenario):**
- If `startIndex > 0`: seek to current segment's `startTimeMs`, then set `playUntilMs = currentSegment.endTimeMs`

**Skip:** triggers same `triggerVideoPlayback` as complete

### VideoPlayer prop changes
- Replace `:startTimeMs` and `:nextStartTimeMs` with `:playUntilMs`
- Add `:playFromStart="true"`
- Replace `@segmentPlaybackComplete` with `@reachedTarget`

### Tests to add in TypingSession.test.ts
New describe block "TypingSession — video continuous playback":
1. On mount with video segments, sets playUntilMs to first segment's startTimeMs
2. Completing segment 0 sets playUntilMs to segment 1's endTimeMs
3. Last segment sets playUntilMs to null
4. Skip triggers same video behavior as complete
5. User finishes typing before video reaches target → pending advance is set
6. When video reaches target with pending advance → immediately sets next playUntilMs
7. Resume with startIndex > 0: seeks then plays to current segment endTimeMs

### Verification
```bash
cd frontend && npx vitest run TypingSession.test.ts
```
