# Issue 17: Pinyin Mode

## Problem Statement

当前打字练习要求用户直接输入中文原文（通过 IME 输入汉字），这对刚刚学习键盘、还不会用输入法的小朋友门槛太高。需要一种更入门的模式，让小朋友只需输入拼音字母就能完成练习，逐步熟悉键盘布局。

## Solution

新增"拼音模式"（Pinyin Mode），与现有的"打字模式"并列。拼音模式下：
- 中文字上方显示带声调的拼音标注
- 用户只需输入拼音字母（不带声调）
- 英文字母和数字正常输入
- 标点符号自动跳过
- 逐字匹配——打完一个字的拼音自动跳到下一个字

模式可在设置页面切换，存储在后端配置中。

## User Stories

1. As a parent, I want to switch the app to pinyin mode, so that my child who can't use IME yet can still practice typing
2. As a parent, I want to switch back to typing mode, so that my child can practice real character input when ready
3. As a child in pinyin mode, I want to see pinyin annotations above each Chinese character, so that I know what letters to type
4. As a child in pinyin mode, I want each character's pinyin to be highlighted as I type it, so that I get immediate visual feedback
5. As a child in pinyin mode, I want punctuation to be automatically skipped, so that I don't need to figure out how to type punctuation marks
6. As a child in pinyin mode, I want to type English letters and numbers directly as they appear, so that mixed-content materials work naturally
7. As a child in pinyin mode, I want the current target character to be clearly indicated, so that I know which character I'm working on
8. As a child in pinyin mode, I want to see the pinyin with tone marks displayed above characters for learning purposes, even though I only type the letters
9. As a child, I want the Hint button to show me the next expected input letter, so that I can get help when stuck
10. As a child, I want Skip to still work in pinyin mode, so that I can skip difficult segments
11. As a parent, I want the mode setting to persist in the backend configuration, so that it survives page refreshes
12. As a child, I want completed characters to turn green and incorrect attempts to show in red, just like in typing mode
13. As a child, I want the progress save feature to work in pinyin mode, so that my progress is preserved
14. As a child in pinyin mode, I want to use backspace to correct my pinyin input, so that I can fix mistakes

## Implementation Decisions

### Config Schema Change

Add `typingMode` field to backend config with values `"typing"` (default) or `"pinyin"`. The existing `LlmConfig`, `ConfigUpdate` Pydantic models and frontend `AppConfig` interface all gain this field. Default is `"typing"` to maintain backward compatibility.

### Module 1: Pinyin Typing Engine (deep module)

A new `PinyinEngine` class that encapsulates all pinyin-mode logic in a testable interface matching the same surface API as `TypingEngine`:

Key interface:
- Constructor accepts a text string
- Internally builds a list of "targets": for each character, either a pinyin string (Chinese) or the character itself (English/number). Punctuation targets are auto-skipped during construction.
- Uses `pinyin-pro` library (already a dependency) to get pinyin for Chinese characters
- Properties: `chars` (display characters with status), `cursor`, `isComplete`
- Methods: `input(char)`, `backspace()`, `hint()`, `skip()`
- `hint()` returns the next expected input letter (not the full pinyin)
- Display info exposed: each target has `display` (original char), `pinyin` (with tones, for annotation), and `status`

The engine handles the "逐字" matching: when the user has typed all letters of one target's pinyin, the engine auto-advances to the next target. Backspace goes back one letter within the current target.

### Module 2: TypingSegment Mode Support

TypingSegment component accepts an optional `mode` prop (`"typing"` | `"pinyin"`, default `"typing"`). When mode is `"pinyin"`:
- Creates `PinyinEngine` instead of `TypingEngine`
- Renders pinyin annotations above each character using a CSS layout
- Input handling uses direct key input (no IME composition needed — user types raw Latin letters)

### Module 3: Settings Page Mode Selector

Settings page gains a radio or select for typing mode ("打字模式" / "拼音模式"). The value is saved to backend config as `typingMode`.

### Module 4: Mode Propagation

PlayPage fetches config on mount and passes `mode` as prop to TypingSession. TypingSession passes it to each TypingSegment.

### Data Flow

```
Backend config (typingMode)
  → PlayPage fetches config, passes mode prop
    → TypingSession passes mode prop
      → TypingSegment creates PinyinEngine or TypingEngine based on mode
```

## Testing Decisions

### What makes a good test

Tests verify the engine's external behavior: given a text and a sequence of inputs, what are the cursor position, char statuses, and completion state. No testing of internal pinyin lookup.

### Modules to test

**PinyinEngine (unit tests, high priority):**
- Chinese characters: input pinyin letters one by one, verify status changes
- Punctuation: auto-skipped, not included in targets
- English/numbers: typed directly as single characters
- Mixed content: Chinese + English + punctuation
- Backspace: undo within current target
- Completion: all targets done → isComplete
- Hint: returns next expected letter

**TypingSegment (integration tests):**
- Pinyin mode renders pinyin annotations
- Pinyin mode input matches pinyin
- Mode prop switches behavior

**Settings (existing test patterns):**
- Config saves and loads typingMode
- Settings page shows mode selector

**Prior art:** `engine.test.ts` and `TypingSegment.test.ts` already test the existing engine and component in exactly this pattern.

## Out of Scope

- Tone mark input (user never types tones)
- Custom pinyin override per character
- Pinyin mode for English-only materials (no-op, works same as typing mode)
- Teaching stroke order or character writing
- Multi-character pinyin grouping (e.g., typing "zh" as one unit for a character — user types letter by letter)

## Further Notes

- The `pinyin-pro` library is already a project dependency, used for Hint functionality. It will also power the pinyin lookup in PinyinEngine.
- PinyinEngine has the same surface API as TypingEngine (chars, cursor, isComplete, input, backspace, hint, skip) so that TypingSegment can use either engine interchangeably.
- In pinyin mode, the IME composition handling (`onCompositionStart`/`onCompositionEnd`) is irrelevant since users type raw Latin letters. The component should handle this gracefully.
