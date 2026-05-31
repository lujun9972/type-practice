Status: ready-for-agent

## Parent
Type Practice — LLM 内容生成

## What to build
LLM 生成内容时的字数设置从"短/中/长/自动"改为数字范围输入。

### 后端
- `TopicFetch` 模型新增可选字段 `lengthMin: int | None` 和 `lengthMax: int | None`
- 保留 `length: Literal["short","medium","long","auto"]` 字段，"auto" 表示让 LLM 自行决定
- 当用户提供 lengthMin/lengthMax 时，忽略 length 字段，将具体范围传入 prompt
- 当用户选"auto"时，使用 length 字段，行为不变

### 前端
- PlayPage 的生成表单：去掉短/中/长选项，改为两个数字输入框（最少/最多字数）+ "自动"复选框
- 自动勾选时隐藏数字输入框

## Acceptance criteria
- [ ] 生成表单有"最少字数"和"最多字数"输入框
- [ ] 有"自动"选项，勾选后隐藏数字输入
- [ ] 指定范围时，LLM prompt 使用具体字数范围
- [ ] 选"自动"时行为与现有一致
- [ ] 后端 API 向后兼容（不传 lengthMin/lengthMax 时走旧逻辑）

## Blocked by
None
