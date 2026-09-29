# Continuous Video Playback

**Status**: ready-for-agent

## Problem Statement

Video Material 的播放体验不连贯：

1. **片头空白被跳过**：字幕文件的第一条字幕通常不是从 0 秒开始（如第 1 秒），当前代码只在用户打完第一个 Segment 后才触发视频播放，且直接 seek 到第一条字幕时间点，视频开头的无字幕部分被完全跳过。
2. **Segment 之间视频跳跃**：每打完一段，视频 seek 到下一段字幕的 startTimeMs。如果两段字幕之间有时间间隙（如 4s-5s），这个间隙被跳过，播放体验不连贯。

用户希望视频像正常看视频一样连续播放，不要有突然的跳跃。

## Solution

采用 **Continuous Playback** 策略：视频在 Segment 之间不做 seek（不跳跃），始终从当前位置连续播放到目标时间点后暂停。

核心行为：
- 进入打字时，视频从 0 秒播放到第一条字幕的 startTimeMs，暂停等待用户打字
- 用户打完 Segment N 后，视频从当前位置连续播放到 Segment N+1 的 endTimeMs，暂停
- 最后一个 Segment 打完后，视频播放到结尾
- 打字和视频并行——用户可以边打字边看视频
- 用户比视频快时，等待视频播到终点再进入下一轮
- 恢复 Progress 时例外——允许 seek 到断点位置
- Skip 与打完触发相同的视频行为

## User Stories

1. As a student, I want the video to play from the beginning when I start a video exercise, so that I can see the intro content before subtitles begin
2. As a student, I want the video to play continuously between subtitles without jumping, so that the viewing experience feels natural
3. As a student, I want to be able to type while the video is playing, so that I can practice typing along with the video
4. As a student, when I finish typing faster than the video reaches the end of the next subtitle, I want to wait for the video to catch up, so that I stay in sync with the video content
5. As a student, when I finish the last subtitle segment, I want the video to play to the end, so that I can see the ending content
6. As a student, when I skip a segment, I want the video to behave the same as if I completed it, so that the video stays continuous
7. As a student, when I resume a saved progress, I want the video to jump to where I left off, so that I don't have to rewatch earlier content
8. As a student, I want the video to pause at the end of each subtitle segment while I type, so that I have time to type without the video running ahead
9. As a student, I want the video playback to work correctly even when subtitles have gaps between them (e.g., subtitle A ends at 4s, subtitle B starts at 5s), so that the silent gaps play naturally
10. As a student, I want the video progress bar to reflect real-time playback position even during continuous playback, so that I can see where I am in the video

## Implementation Decisions

### Module 1: VideoPlayer — replace seek-based playSegment with playUntil

**Current interface:**
- Props: `startTimeMs`, `nextStartTimeMs`
- `playSegment()`: seek to startTimeMs, play until nextStartTimeMs, then pause
- `seekTo(timeMs)`: seek to a time and pause
- Watcher on `startTimeMs`: triggers playSegment on change

**New interface:**
- Props: `playUntilMs` (number | null) — the target time to play to, then pause
- `playFromStart`: boolean — when true on mount, play from 0 to playUntilMs
- `playUntil(targetMs)`: play from current position to targetMs, then pause. No seeking.
- `seekTo(timeMs)`: unchanged — used only for resume scenarios
- Remove `startTimeMs` and `nextStartTimeMs` props
- Remove `playSegment()` method
- Watcher on `playUntilMs`: when it changes to a new non-null value, start playing from current position to that value
- Use `timeupdate` event to detect when currentTime >= target, then pause
- Emit `reachedTarget` when playback reaches playUntilMs (replaces `segmentPlaybackComplete`)

**Timeout vs timeupdate decision:** The current code uses `setTimeout` to stop playback. This is fragile — video buffering can cause drift. The new implementation should use `timeupdate` event to check if `currentTime >= targetTime`, then pause. This is more robust and accurate.

### Module 2: TypingSession — rewrite triggerVideoPlayback

**Current behavior:**
- `triggerVideoPlayback(textIndex)`: sets `currentStartTimeMs` and `currentNextStartTimeMs`, which triggers VideoPlayer watcher → playSegment
- `onVideoBuffered()`: seeks to current segment start if startIndex > 0

**New behavior:**
- On mount (when videoUrl present): set `playUntilMs` to first segment's `startTimeMs`. This triggers VideoPlayer to play from 0 to first subtitle start, then pause.
- `triggerVideoPlayback(textIndex)`: compute `targetMs`:
  - If next segment exists: `targetMs = nextSegment.endTimeMs`
  - If last segment: `targetMs = null` (play to video end)
  - Set `playUntilMs = targetMs` on VideoPlayer
- `onVideoBuffered()`: if startIndex > 0, use `seekTo(currentSegment.startTimeMs)` then set `playUntilMs = currentSegment.endTimeMs` to play from seek position to end of current segment
- Skip triggers the same `triggerVideoPlayback` as complete
- Remove `currentStartTimeMs` and `currentNextStartTimeMs` refs
- Add `playUntilMs` ref

### Module 3: Coordination — user-faster-than-video case

When user finishes typing Segment N+1 before video reaches `endTimeMs(N+1)`:
- TypingSession should NOT immediately trigger the next playback
- Instead, set a `pendingAdvance` flag
- When VideoPlayer emits `reachedTarget`, check `pendingAdvance`:
  - If true: immediately trigger the next `playUntilMs`
  - If false: pause and wait for user to finish typing

This means:
- `triggerVideoPlayback` should store the "next target" even if video is still playing
- `onReachedTarget` should check if there's a pending advance and execute it immediately

### Data flow summary

```
Mount (video material)
  → playUntilMs = seg[0].startTimeMs
  → VideoPlayer: play from 0 to seg[0].startTimeMs, pause
  → emit reachedTarget

User finishes seg[0]
  → triggerVideoPlayback(0)
  → playUntilMs = seg[1].endTimeMs
  → VideoPlayer: play from current pos to seg[1].endTimeMs, pause

User finishes seg[1] before video reaches seg[1].endTimeMs
  → pendingAdvance = true (store next target)
  → When video reaches seg[1].endTimeMs → emit reachedTarget
  → onReachedTarget sees pendingAdvance → immediately set next playUntilMs

Last segment:
  → playUntilMs = null
  → VideoPlayer: play to end, emit ended
```

## Testing Decisions

### What makes a good test
- Test external behavior (props in → events out), not internal implementation details
- Use fake timers to control video currentTime progression in tests
- Mock HTMLVideoElement methods (play, pause, currentTime setter)

### Modules to test

**VideoPlayer.test.ts** — rewrite/extend existing tests:
- playUntil plays from current position to target, then pauses and emits reachedTarget
- playUntil with null target plays to video end
- seekTo still works (resume scenario)
- timeupdate-based stopping (not setTimeout)
- playFromStart plays from 0 to target on initial load
- No seeking during playUntil — currentTime only moves forward

**TypingSession.test.ts** — add new describe blocks:
- Video material: on mount, sets playUntilMs to first segment's startTimeMs
- Completing segment triggers playUntilMs to next segment's endTimeMs
- Last segment sets playUntilMs to null (play to end)
- Skip triggers same video behavior as complete
- User-faster-than-video: completing next segment before video reaches target queues pending advance
- Resume with startIndex > 0: seeks then plays to current segment's endTimeMs

### Prior art
- Existing `VideoPlayer.test.ts` uses mount + trigger events pattern
- Existing `StickyVideo.test.ts` stubs VideoPlayer and tests TypingSession integration
- Existing `TypingSession.test.ts` uses `completeSegment` helper to emit complete events

## Out of Scope

- Backend changes (subtitle parsing, segment creation unchanged)
- Non-video materials (text-only materials unaffected)
- Video player UI changes (progress bar, volume, collapse/expand)
- New user-facing settings or configuration
- Mobile-specific video handling

## Further Notes

- ADR-0002 documents this decision with rationale and consequences
- CONTEXT.md updated with "Continuous Playback" glossary term
- The setTimeout-based playback in current VideoPlayer is fragile — replacing with timeupdate is a reliability improvement regardless of this feature
- Resume/continue is the ONLY scenario where seeking is allowed — this is intentional because the user's continuous session was broken by closing the browser
