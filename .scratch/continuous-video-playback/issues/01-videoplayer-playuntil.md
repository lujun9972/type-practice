# Issue 01: VideoPlayer — replace seek-based playSegment with playUntil

**Status**: ready-for-agent

## Task

Rewrite VideoPlayer's core playback mechanism from seek-based `playSegment` to continuous `playUntil`.

## What to do

### Remove
- Props: `startTimeMs`, `nextStartTimeMs`
- Method: `playSegment()`
- The `playbackTimer` setTimeout mechanism

### Add
- Prop: `playUntilMs` (number | null) — target time to play to, then pause. null = play to video end.
- Prop: `playFromStart` (boolean, default false) — when true, play from 0 on mount if playUntilMs is set
- Method: `playUntil(targetMs: number)` — play from current position to targetMs (no seeking), then pause. Use `timeupdate` event to detect when `currentTime >= targetTime / 1000`, then pause.
- Emit: `reachedTarget` — fires when playback reaches the playUntilMs target (replaces `segmentPlaybackComplete`)
- Keep: `seekTo(timeMs)` unchanged — used for resume scenarios only
- Watcher on `playUntilMs`: when it changes to a new non-null value, start playing from current position

### Key behavior
- `playUntil` must NOT seek — `currentTime` only moves forward via natural playback
- Use `timeupdate` (not setTimeout) to detect arrival at target — more robust against buffering
- When `playUntilMs` is null, play to video end (let `ended` event fire)
- When video hasn't loaded yet (`loading` is true), defer playback until `loadeddata`

### Tests to write in VideoPlayer.test.ts
1. `playUntil` plays from current position to target, pauses, emits `reachedTarget`
2. `playUntil` with null plays to video end
3. `seekTo` still works (resume scenario)
4. `playFromStart` plays from 0 to target on initial load
5. No seeking during `playUntil` — currentTime only moves forward
6. `timeupdate`-based stopping works (not setTimeout)
7. Changing `playUntilMs` prop triggers new playback from current position

### Verification
```bash
cd frontend && npx vitest run VideoPlayer.test.ts
```
