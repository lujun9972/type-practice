Status: ready-for-agent

## Parent
Type Practice — Material Library 管理

## What to build
AdminPage 增加 URL 抓取和 AI 生成素材的能力，生成后预览、编辑标题/标签、保存到 Material Library。

### 流程
1. 管理页新增"URL 抓取"和"AI 生成"两个入口（与现有创建表单并列）
2. URL 抓取：输入 URL → 后端抓取 → 显示预览（标题、内容、分段）
3. AI 生成：输入话题、选择语言、设定字数范围 → 后端生成 → 显示预览
4. 预览后用户可编辑标题和标签
5. 点击"保存到素材库"调用 `POST /api/materials` 保存
6. 也可"丢弃"取消

### 后端
- 复用现有 `POST /api/fetch/url` 和 `POST /api/fetch/topic` 端点
- 无需新增后端端点

### 前端
- AdminPage 新增 URL 抓取表单和 AI 生成表单
- 生成后显示预览面板（标题可编辑、标签可编辑、内容只读、分段预览）
- 预览面板底部"保存到素材库"和"丢弃"按钮

## Acceptance criteria
- [ ] 管理页有 URL 抓取入口，输入 URL 后能预览内容
- [ ] 管理页有 AI 生成入口，输入话题后能预览内容
- [ ] 预览后可编辑标题和标签
- [ ] 点击"保存到素材库"后素材出现在列表中
- [ ] 点击"丢弃"后预览消失，不保存

## Blocked by
- Issue 12（AdminPage 需要先有详情/编辑布局，避免重复改造）
- Issue 13（AI 生成表单需要新的字数范围输入）
