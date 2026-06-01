## Parent

Issue 17: Pinyin Mode

## What to build

端到端拼音模式的最小可行路径：后端 config 新增 `typingMode` 字段（`"typing"` | `"pinyin"`，默认 `"typing"`），前端新建 PinyinEngine 类处理最简场景（纯中文字），TypingSegment 接受 mode prop 在拼音模式下渲染拼音标注并使用 PinyinEngine，Settings 页面添加模式选择器（打字模式/拼音模式），PlayPage 从 config 读取 mode 传给 TypingSession。

PinyinEngine 的最简实现：给定一段纯中文文本，用 pinyin-pro 获取每个字的拼音（不带声调作为匹配目标，带声调作为显示），用户逐字母输入拼音，打完一个字的拼音自动跳到下一个字。API 与 TypingEngine 一致（chars, cursor, isComplete, input, backspace, hint, skip）。

## Acceptance criteria

- [ ] 后端 config 新增 `typingMode` 字段，默认 `"typing"`，可通过设置 API 读写
- [ ] Settings 页面显示模式选择器（打字模式 / 拼音模式），可保存
- [ ] PinyinEngine 对纯中文文本：输入拼音字母逐字匹配，打完自动跳下一个字
- [ ] TypingSegment 接受 mode prop，拼音模式下用 PinyinEngine 并显示拼音标注
- [ ] PlayPage 从 config 读取 typingMode 传给 TypingSession
- [ ] TypingSession 将 mode 传给 TypingSegment
- [ ] 端到端：选择拼音模式后，看到"你好"上方显示拼音，输入"nihao"完成匹配

## Blocked by

None - can start immediately
