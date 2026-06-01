## Parent

Issue 17: Pinyin Mode

## What to build

完善 PinyinEngine 处理所有字符类型：标点符号自动跳过（初始化时标记为 skipped），英文字母和数字直接匹配（与打字模式相同），中英数标混合内容的完整支持。Backspace 在当前拼音目标内逐字母撤销。完成判定：所有非标点目标正确或跳过时 isComplete 为 true。

## Acceptance criteria

- [ ] 纯标点文本（如"！！"）自动全部跳过，isComplete 为 true
- [ ] 英文字母直接匹配，输入正确字母标绿
- [ ] 数字直接匹配
- [ ] 混合内容"你好abc！"：先打"ni""hao"匹配中文，再打"abc"匹配英文，标点自动跳过
- [ ] Backspace 在当前拼音目标内逐字母撤销，不会跨越到上一个字
- [ ] Backspace 打完当前目标的最后一个字母后再按 backspace，回到当前目标继续修改
- [ ] 全部正确输入后 isComplete 为 true

## Blocked by

- Issue 17a: Pinyin Mode Tracer Bullet
