Status: ready-for-agent

## Parent

`.scratch/video-material/PRD.md`

## What to build

管理员在 Admin 页面创建和编辑 Video Material 的完整工作流。

AdminPage 素材创建表单增加切换按钮："文本素材" / "视频素材"。切换到视频模式后，表单从"文本输入区"变为"视频文件上传 + 字幕文件上传"。点击上传/解析后，调用后端解析字幕，展示解析后的 Segment 预览列表。

预览列表支持轻量编辑：
- 删除某条字幕条目（如 `[音乐]`、`(笑声)` 等噪音）
- 修改某条字幕的文字内容（修正错别字）
- 不支持合并或拆分

保存时，前端将视频文件 + 字幕文件 + title + tags 通过 multipart form 提交到 `POST /api/materials/video`。

同名视频文件冲突处理：后端返回冲突状态码 → 前端显示确认弹窗"文件 xxx 已存在，是否覆盖？" → 用户确认后重新提交（带 overwrite 标志）。

Video Material 在素材列表中和文本 Material 混合展示，不做区分（可通过标签筛选）。编辑 Video Material 时，可以修改 title、tags、字幕内容（重新解析或编辑现有 Segment），但不替换视频文件。

## Acceptance criteria

- [ ] AdminPage 有"文本素材"/"视频素材"切换按钮
- [ ] 视频模式下显示视频文件和字幕文件上传字段，隐藏文本输入区
- [ ] 上传字幕后，显示解析后的 Segment 预览（含时间戳和文字内容）
- [ ] 可以在预览中删除某条字幕条目
- [ ] 可以在预览中修改某条字幕的文字内容
- [ ] 保存时通过 multipart form 上传视频文件 + 字幕文件 + 元数据
- [ ] 同名视频文件冲突时显示确认弹窗
- [ ] 确认覆盖后提交成功
- [ ] Video Material 在素材列表中和文本 Material 混合展示
- [ ] 可以编辑 Video Material 的 title、tags
- [ ] Admin 页面视频上传组件测试通过（参考 `AdminPage.test.ts` 模式）

## Blocked by

- `.scratch/video-material/issues/01-subtitle-parser-video-api.md`
