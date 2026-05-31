Status: ready-for-agent

## Parent
Type Practice — Material Library 管理

## What to build
AdminPage 补齐素材的查看和编辑功能。

### 查看
- 点击素材卡片展开详情面板，显示：标题、标签、完整内容文本、分段列表、字数统计
- 字数统计显示 Material 总字数

### 编辑
- 详情面板有"编辑"按钮，进入编辑态
- 可编辑：标题、标签、内容
- 保存时后端自动重新分段（已有 `PUT /api/materials/:id` 支持此行为）
- Material 内容被编辑后，关联的打字 Progress 自动清空（需求 D 的前置约束）

## Acceptance criteria
- [ ] 点击素材卡片能看到完整详情（标题、标签、内容、分段、字数）
- [ ] 编辑模式下可修改标题、标签、内容并保存
- [ ] 保存后分段自动更新
- [ ] 素材列表仍可正常添加和删除

## Blocked by
None
