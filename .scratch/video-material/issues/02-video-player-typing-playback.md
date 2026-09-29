Status: ready-for-agent

## Parent

`.scratch/video-material/PRD.md`

## What to build

完整打字→播放循环：VideoPlayer 组件 + TypingSession 扩展 + PlayPage 集成。

VideoPlayer 是一个新的 Vue 组件，封装 HTML5 `<video>` 元素，提供逐句播放控制。接收 `startTimeMs` 和 `nextStartTimeMs`（下一句开始时间）→ seek 到 start → 播放到 next start → 暂停。显示只读进度条（不可拖动）和音量控制。视频暂停时停留在最后一帧。页面加载时等第一段字幕对应的视频缓冲完毕后才允许开始打字，显示加载指示。

TypingSession 扩展：新增可选的 `videoUrl` prop。当 videoUrl 存在时，在打字区域上方渲染 VideoPlayer 组件。segment-complete 事件触发时，将已完成 Segment 的 `startTimeMs` 和下一个 Segment 的 `startTimeMs` 传给 VideoPlayer 进行播放。所有现有的 Hint/Skip/XP/打字逻辑不变——字幕 Segment 使用 `type: "text"`，无需新的分支逻辑。

PlayPage 集成：加载 Material 时检测 `videoUrl` 字段。如果存在，将 videoUrl 传给 TypingSession。进度恢复时，视频 seek 到 `startIndex` 对应 Segment 的 `startTimeMs`，停留在那一帧。

## Acceptance criteria

- [ ] VideoPlayer 组件能渲染 `<video>` 元素并加载指定视频
- [ ] 接收 startTimeMs + nextStartTimeMs 后，视频 seek 到 start → 播放 → 在 next start 处暂停
- [ ] 最后一个 Segment 的播放延伸到视频结尾
- [ ] 视频暂停时停留在最后一帧（浏览器默认行为）
- [ ] 进度条显示当前播放位置，不可拖动
- [ ] 音量控制可正常使用
- [ ] 页面加载时等待第一段视频缓冲完毕，显示加载指示
- [ ] 缓冲完成后才允许开始打字
- [ ] TypingSession 在 videoUrl 存在时在打字区域上方渲染 VideoPlayer
- [ ] 打完一个 Segment 后，VideoPlayer 播放对应视频片段
- [ ] Hint、Skip、XP 在视频 Material 上行为与文本 Material 一致
- [ ] 普通打字和拼音模式都能正常工作
- [ ] 进度恢复时视频 seek 到当前 Segment 的 startTimeMs
- [ ] 已完成 Segment 显示只读成绩（现有行为不变）
- [ ] 全部打完后显示标准结果界面（用时、准确率、速度）
- [ ] VideoPlayer 组件测试通过（参考 `TypingSegment.test.ts` 模式）
- [ ] TypingSession 扩展测试通过（扩展现有 `TypingSession.test.ts`）

## Blocked by

- `.scratch/video-material/issues/01-subtitle-parser-video-api.md`
