# Type Practice

一款面向小学生的打字练习游戏。用户通过逐段解锁的方式打字阅读由 LLM 生成或从网页抓取的感兴趣内容，核心动机是「打完才能看到更多」。

## Language

**Segment**:
一段待打的文字，以句号、逗号等自然断点切分，约 20-40 字。是打字练习和内容解锁的最小单位。
_Avoid_: 行、段落、句子

**Material**:
一篇完整的打字练习素材，由多个 Segment 和可选的图片组成。来源包括素材库、URL 抓取和 LLM 生成。
_Avoid_: 文章、内容、题目

**Material Library**:
预置的 Material 集合，通过浏览器管理页面添加和维护。
_Avoid_: 题库、素材库（作为技术术语时）

**Unlock**:
用户打完当前 Segment 后，下一个 Segment（或图片）变为可见状态。图片作为解锁奖励出现。
_Avoid_: 显示、展开

**Hint**:
显示当前待打字的拼音（中文）或字母提示，帮助用户完成输入。不限制使用次数。
_Avoid_: 提示词、帮助

**Skip**:
跳过当前 Segment，标记为未完成。每篇 Material 有使用次数限制（默认 3 次）。
_Avoid_: 跳跃、忽略

**Correction Mode**:
打字判定模式——打错的字符标红，用户可退格修正，以退格后的最终结果判定对错。
_Avoid_: 纠错模式、严格模式、宽松模式

## Relationships

- 一篇 **Material** 由多个 **Segment** 和可选的图片组成，按顺序排列
- 每个 **Segment** 必须被 **Unlock**（打完）后才能看到下一个
- 图片在用户打完其前方 **Segment** 后 **Unlock**
- 用户可以随时使用 **Hint**（无限制）或 **Skip**（有限制）来应对困难
- **Material** 有三个来源：**Material Library**、URL 抓取、LLM 话题生成
- LLM 话题生成需要用户选择语言（中文/英文）和长度（短/中/长/自动）

## Example dialogue

> **Dev:** "用户输入了一个 Minecraft 的 URL，抓取下来的内容有 5000 字和 20 张图片，怎么变成 Segment？"
> **Domain expert:** "后端解析内容，按自然断点切分成 Segment，图片保留在相邻 Segment 之间。用户逐段 Unlock，图片作为奖励出现。"

> **Dev:** "用户打 Segment 时遇到不会读的字，一直卡着怎么办？"
> **Domain expert:** "可以点 Hint 看拼音，不限次数。也可以 Skip 跳过这段，但每篇 Material 只能跳过 3 次。"

## Configuration

以下参数可在设置中配置：
- **标点模式**：是否需要在打字时输入标点符号（默认：跳过标点）
- **Skip 次数限制**：每篇 Material 允许跳过的次数（默认：3 次）
- **语言**：中文 / 英文（由用户在选素材时决定）

## Flagged ambiguities

- "打字" 同时指中文输入和英文输入——已明确：两者都支持，中文仅比对最终输出汉字，不关心输入法按键序列。
- "一行" 指视觉行还是内容段——已明确：不使用视觉行，使用 **Segment**（自然断点切分）。
