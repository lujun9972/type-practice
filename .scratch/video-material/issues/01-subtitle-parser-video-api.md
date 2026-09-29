Status: ready-for-agent

## Parent

`.scratch/video-material/PRD.md`

## What to build

后端基础：字幕解析模块 + 视频文件存储 + Video Material 创建/删除 API。

字幕解析器是一个纯函数模块，接收字幕文件内容 + 格式提示 → 返回带时间戳的 Segment 列表。支持 SRT 和 VTT 格式，自动检测文件编码（GBK/UTF-8），自动清洗格式标签（`<i>`、`<b>`、`{\an8}` 等）。校验逻辑：必须成功解析且至少有 1 条有效字幕，否则返回具体错误信息。

视频文件存储模块：接收 multipart 上传的视频文件，保存到 `backend/data/videos/` 目录，保留原始文件名。如果同名文件已存在，返回冲突信号让 API 层提示确认。支持 Range 头的视频文件 serve（用于浏览器缓冲/seek）。删除 Material 时同时删除关联的视频文件。

新增 API 端点：
- `POST /api/materials/video` — multipart 上传（视频文件 + 字幕文件 + title + tags），解析字幕为 Segment，创建带 `videoUrl` 字段的 Material
- `GET /api/videos/{filename}` — serve 视频文件，支持 Range 头
- 扩展现有 `DELETE /api/materials/{id}` — 如果 Material 有 `videoUrl`，同时删除视频文件

Segment 数据结构扩展：在现有 Segment 上增加可选的 `startTimeMs` 和 `endTimeMs` 字段。Material 数据结构扩展：增加可选的 `videoUrl` 字段。

## Acceptance criteria

- [ ] SRT 文件能被正确解析为带 `startTimeMs`/`endTimeMs` 的 Segment 列表
- [ ] VTT 文件能被正确解析为带 `startTimeMs`/`endTimeMs` 的 Segment 列表
- [ ] GBK 编码的字幕文件能被自动检测并正确解析
- [ ] 格式标签（`<i>`、`<b>`、`<u>`、`{\an8}` 等）在解析时被自动清洗
- [ ] 空文件或无效格式返回明确的错误信息
- [ ] `POST /api/materials/video` 能通过 multipart 上传创建 Video Material（含 videoUrl 和带时间戳的 Segment）
- [ ] `GET /api/videos/{filename}` 能正确 serve 视频文件，支持 Range 头
- [ ] 删除带 videoUrl 的 Material 时，磁盘上的视频文件同时被删除
- [ ] 删除不带 videoUrl 的 Material 时，不影响任何文件
- [ ] 同名视频文件上传时返回冲突状态码，前端可据此显示确认
- [ ] 字幕解析器有完整的单元测试（参考 `test_splitter.py` 的模式）
- [ ] Video Material API 有完整的集成测试（参考 `test_materials_api.py` 的模式）

## Blocked by

None - can start immediately
