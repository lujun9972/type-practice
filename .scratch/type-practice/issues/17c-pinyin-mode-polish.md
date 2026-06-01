## Parent

Issue 17: Pinyin Mode

## What to build

拼音模式的交互完善：Hint 按钮返回当前预期输入的下一个字母（而非整个拼音），Skip 正常跳过当前 segment，进度保存与拼音模式兼容（PinyinEngine 的 chars 状态正确记录到 progress）。

## Acceptance criteria

- [ ] Hint 按钮在拼音模式下显示下一个预期字母
- [ ] Skip 在拼音模式下跳过整个 segment
- [ ] 拼音模式下 segment 完成后进度正确保存
- [ ] 拼音模式下继续进度时从保存位置恢复

## Blocked by

- Issue 17b: Full PinyinEngine
