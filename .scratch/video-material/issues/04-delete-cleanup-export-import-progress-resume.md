Status: ready-for-agent

## Parent

`.scratch/video-material/PRD.md`

## What to build

Video Material 的完整生命周期管理：删除清理、导入导出、进度恢复的视频 seek 行为。

**删除清理**：已由 01 实现后端逻辑（删除 Material 时同时删除视频文件）。此 slice 确保前端删除确认弹窗提示"关联的视频文件也将被删除"。

**导入导出**：导出时 Video Material 的 JSON 包含 `videoUrl` 字段（但不含视频文件本身）。导入时，如果检测到 Material 有 `videoUrl` 但本地没有对应视频文件，前端显示提示"此素材关联视频文件 {filename}，请重新上传"并提供上传入口。用户可以选择上传视频文件（恢复完整功能）或跳过（仅保留字幕数据，作为纯文本 Material 使用）。

**进度恢复的视频 seek**：当用户选择"继续"恢复 Video Material 进度时，PlayPage 在 TypingSession 初始化后将视频 seek 到 `startIndex` 对应 Segment 的 `startTimeMs`。视频停在那一帧，等待用户开始打字。

## Acceptance criteria

- [ ] 删除 Video Material 时，前端确认弹窗提示视频文件将一并删除
- [ ] 删除后，磁盘上的视频文件不存在
- [ ] JSON 导出包含 Video Material 的 `videoUrl` 和字幕 Segment 数据
- [ ] 导出文件中不包含视频文件本身
- [ ] 导入 Video Material 时，如果本地缺少视频文件，显示重新上传提示
- [ ] 用户可以上传视频文件恢复完整的 Video Material
- [ ] 用户可以跳过视频上传，Material 作为纯文本使用
- [ ] 进度恢复时，视频自动 seek 到当前 Segment 对应的时间点
- [ ] seek 后视频暂停在对应帧，等待用户开始打字
- [ ] 导入导出的集成测试通过
- [ ] 进度恢复的视频 seek 行为测试通过

## Blocked by

- `.scratch/video-material/issues/02-video-player-typing-playback.md`
- `.scratch/video-material/issues/03-admin-video-upload-subtitle-editing.md`
