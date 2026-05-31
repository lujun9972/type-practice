Status: ready-for-agent

## Parent
Type Practice — 打字练习

## What to build
保存用户打字进度，支持跨会话续打。

### 数据模型
Progress 记录：
- `materialId`: 关联的 Material ID
- `completedSegments`: 已完成的 Segment 索引列表
- `segmentResults`: 每个 Segment 的 { index, accuracy, timeMs }
- `currentSegmentIndex`: 当前打到第几个 Segment
- `isComplete`: 是否全部打完
- `updatedAt`: 最后更新时间

### 后端
- `GET /api/progress` — 返回所有 Progress 记录
- `GET /api/progress/:materialId` — 返回某篇 Material 的 Progress
- `PUT /api/progress/:materialId` — 保存/更新 Progress
- `DELETE /api/progress/:materialId` — 删除 Progress（重新开始时用）
- Material 内容被编辑时（`PUT /api/materials/:id`），自动删除关联 Progress

### 前端
- 每个 Segment 打完时，调用 `PUT /api/progress/:materialId` 保存进度
- 选择 Material 时，检查是否有 Progress：
  - 无进度：直接开始
  - 有进度（未完成）：弹窗提示"继续（到第 N 段）/ 重新开始"
  - 有进度（已完成）：弹窗提示"已完成，重新开始？"
- 继续打时：已打 Segment 显示只读成绩（准确率、用时），从断点开始打
- 重新开始时：调用 `DELETE` 清空旧进度

## Acceptance criteria
- [ ] 打完一个 Segment 后进度自动保存到后端
- [ ] 关闭浏览器后重新打开同一 Material，提示继续或重新开始
- [ ] 继续时已打 Segment 显示只读成绩
- [ ] 重新开始清空旧进度
- [ ] 已完成的 Material 再次打开也提示
- [ ] 编辑 Material 内容后 Progress 被清空

## Blocked by
- Issue 12（编辑 Material 时需联动清空 Progress）
