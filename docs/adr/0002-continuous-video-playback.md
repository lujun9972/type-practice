# 0002: Continuous Video Playback

**Status**: Accepted

**Date**: 2026-06-06

## Context

Video Material 的播放机制存在两个问题：

1. **片头空白被跳过**：字幕文件的第一条字幕通常不是从 0 秒开始的（比如从第 1 秒开始），当前代码只在用户打完第一个 Segment 后才触发视频播放，且直接 seek 到第一条字幕时间点，导致视频开头的无字幕部分被完全跳过。

2. **Segment 之间视频跳跃**：每打完一段，视频 seek 到下一段字幕的 startTimeMs。如果两段字幕之间有时间间隙（如 4s-5s），这个间隙被跳过，播放体验不连贯。

## Decision

采用 **Continuous Playback** 策略：

1. 进入打字时，视频从 0 秒播放到第一条字幕的 startTimeMs，然后暂停等待用户
2. 用户打完 Segment N 后，视频从当前位置**连续播放**（不 seek）到 Segment N+1 的 endTimeMs，然后暂停
3. 最后一个 Segment 打完后，视频播放到结尾
4. 打字和视频并行——用户可以边打字边看视频
5. 用户比视频快时，等待视频播到终点再进入下一轮
6. **恢复 Progress 时例外**——允许 seek 到断点位置，因为连续性已断裂
7. Skip 与打完触发相同的视频行为

## Consequences

### 正面

- 视频播放体验连贯，没有突然的跳跃
- 片头内容不会被遗漏
- 用户边打字边看视频，体验更沉浸

### 负面

- Segment 之间的空白期（无字幕）也会播放，用户可能觉得"没什么在播"
- 用户打得快时需要等视频追上来，有等待感
- VideoPlayer 的 playSegment 逻辑需要重构：从"seek + play + timeout"变为"play until + pause"

### 技术影响

- `VideoPlayer.playSegment()` 不再执行 `video.currentTime = startSec`
- 新增 `playUntil(timeMs)` 方法：从当前位置播放到指定时间点后暂停
- `TypingSession.triggerVideoPlayback()` 改为设置 `playUntilMs` 而非 `startTimeMs`
- 初始化时需要触发"从 0 播放到第一条字幕"的逻辑
