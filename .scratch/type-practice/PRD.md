# Type Practice — 打字练习游戏 PRD

Status: ready-for-agent

## Problem Statement

11 岁的小学生在练习打字时缺乏动力——传统打字练习软件的内容枯燥无趣，与他喜欢的游戏、动漫、侦探小说毫无关系。家长需要一个能让孩子主动想打字的工具，让打字练习变成「解锁喜欢的内容」的奖励过程。

## Solution

一个浏览器端的打字游戏。用户可以选择预置素材、输入网页 URL 或输入话题由 LLM 生成内容。游戏逐段解锁——打完当前 Segment 才能看到下一段内容和图片，核心驱动力是「想知道后面发生了什么」。支持中文和英文打字，提供 Hint（拼音/字母提示）和 Skip（跳过）机制，打完后展示成绩统计。

## User Stories

### 素材选择

1. As a player, I want to see a list of available materials when I open the game, so that I can pick something I'm interested in
2. As a player, I want to filter materials by tag (e.g. "侦探", "Minecraft", "科幻"), so that I can quickly find what I like
3. As a player, I want to enter a URL of a webpage I like, so that the game fetches the content for me to type
4. As a player, I want to enter a topic (e.g. "Minecraft 红石教程"), so that the game generates content via LLM
5. As a player, I want to choose the language (Chinese/English) when generating content via LLM, so that I can practice the right language
6. As a player, I want to choose the length (short/medium/long/auto) when generating content via LLM, so that the material fits my available time

### 打字核心

7. As a player, I want to see the current Segment text displayed on screen, so that I know what to type
8. As a player, I want correctly typed characters to turn green, so that I get immediate positive feedback
9. As a player, I want incorrectly typed characters to turn red, so that I know I made a mistake
10. As a player, I want to be able to press backspace to correct mistakes, so that I can fix errors before moving on
11. As a player, I want the next Segment to appear only after I finish typing the current one correctly, so that I'm motivated to keep going to see what happens next
12. As a player, I want images to appear as unlock rewards after I type the preceding Segment, so that I get visual surprises

### 中英文支持

13. As a player, I want to practice Chinese typing by comparing the final output characters (not keystrokes), so that it works regardless of my input method (全拼/双拼)
14. As a player, I want to practice English typing with direct character-by-character comparison, so that I improve my English keyboarding

### 辅助机制

15. As a player, I want a Hint button that shows pinyin for the current Chinese character, so that I can learn characters I don't know how to type
16. As a player, I want a Hint button that shows the next letter for English words, so that I can get unstuck
17. As a player, I want unlimited Hints with no score penalty, so that I'm encouraged to learn rather than feel punished
18. As a player, I want a Skip button to skip the current Segment, so that I'm not permanently stuck on a difficult part
19. As a player, I want Skip to be limited (default 3 per Material), so that I still practice typing most of the content
20. As a player, I want to see how many Skips I have remaining, so that I know when to use them carefully

### 成绩反馈

21. As a player, I want to see my total time after completing a Material, so that I know how fast I typed
22. As a player, I want to see my accuracy percentage after completing a Material, so that I know how precise I am
23. As a player, I want to see my typing speed (characters per minute) after completing a Material, so that I can track improvement

### 配置

24. As a parent, I want to configure whether punctuation needs to be typed or auto-filled, so that I can adjust difficulty for my child's level
25. As a parent, I want to configure the Skip limit per Material, so that I can adjust how much flexibility my child has
26. As a parent, I want settings to persist across sessions, so that I don't need to reconfigure each time

### 素材管理

27. As a parent, I want a management page to add new materials by pasting text, so that I can curate content for my child
28. As a parent, I want to add a title and tags when creating a material, so that it's organized and discoverable
29. As a parent, I want to include images in materials, so that the unlock-reward mechanic works with visual content
30. As a parent, I want to edit or delete existing materials, so that I can maintain the library over time
31. As a parent, I want to preview a material before saving, so that I can verify the content and segment splitting

## Implementation Decisions

### Architecture: Browser frontend + small backend

- **Frontend**: Single-page application served in browser. Handles all game UI, typing state machine, and user interaction.
- **Backend**: Lightweight local service. Handles LLM API calls (API key security), URL content fetching, and material library storage.

This split exists because: (1) LLM API keys must not be exposed in frontend code, (2) web scraping is more reliable server-side, and (3) material storage needs persistence.

### Module: Segment Splitter (backend)

Deep module. Pure function that takes raw text + images and returns an ordered list of Segments.

- Splits on Chinese/English sentence boundaries (periods, exclamation marks, question marks, commas at natural breath points)
- Each Segment targets 20-40 characters
- Images are preserved as separate nodes between Segments
- Handles mixed Chinese/English text
- Skips or normalizes problematic content (HTML tags, script content from web pages)

Interface: `splitIntoSegments(rawContent: string, images: Image[]) → Segment[]`

### Module: Material Fetcher (backend)

Two sub-responsibilities:

1. **URL Fetcher**: Given a URL, fetches the page, extracts readable text and images (using readability-style extraction), passes to Segment Splitter.
2. **LLM Generator**: Given a topic + language + length, calls LLM API with a system prompt tuned for child-appropriate content, returns generated text to Segment Splitter. Uses OpenAI-compatible chat completions API as the standard interface. Default provider: DeepSeek (`base_url: https://api.deepseek.com`, `model: deepseek-v4-flash`). Provider is configurable — supports any OpenAI-compatible API (DeepSeek, OpenAI, Moonshot, local Ollama, etc.).

### Module: Material Library (backend)

CRUD operations over a persistent store (file-based or lightweight database).

- Each Material has: id, title, tags, segments, images, source (library/url/llm), created_at
- Tags are simple strings, used for filtering
- Search by title or tag

### Module: Typing Engine (frontend)

Deep module. Core game state machine managing the typing session.

State:
- Current Material and current Segment index
- Input buffer with per-character correctness status
- Cursor position within current Segment
- Remaining Skip count
- Start time for speed calculation
- Total correct/incorrect character counts for accuracy

Transitions:
- `KEY_PRESS(char)`: Compare char with expected character at cursor. If match → green, advance cursor. If mismatch → red, advance cursor (user can backspace later). If cursor reaches end of Segment → Unlock next.
- `BACKSPACE`: Move cursor back, revert character status. If at beginning of Segment, no-op.
- `HINT`: Return pinyin/letter hint for current expected character. No state change.
- `SKIP`: Decrement skip counter, mark current Segment as skipped, Unlock next.
- `UNLOCK`: Make next Segment (or image) visible. If no more Segments → finish Material, show results.

Chinese input handling: Listen for `compositionend` events to capture final committed characters from IME, then compare against expected characters. Ignore `keydown`/`keypress` during composition.

English input handling: Listen for `keydown` events, compare directly.

Punctuation behavior: When "skip punctuation" config is on, the engine auto-advances past punctuation characters without requiring input.

### Module: Material Browser (frontend)

Three entry points on the home screen:
1. **Library grid**: Cards showing title + tags, filterable by tag
2. **URL input**: Text field + submit button, shows loading state while fetching
3. **Topic input**: Text field + language dropdown + length dropdown + submit button

### Module: Admin Page (frontend)

Management interface accessible via a separate route/tab.

- Form: title, tags (comma-separated), content textarea (paste raw text), image upload
- Preview: shows how Segment Splitter would split the content
- List view: all materials with edit/delete actions

### Module: Result Display (frontend)

Simple overlay/page shown after Material completion:

- Total time (mm:ss)
- Accuracy: (correct chars / total chars) × 100%
- Speed: total chars / total minutes
- "Play Again" and "Choose New Material" buttons

### API Contract (backend)

```
GET    /api/materials              — list all materials (with tag filter)
POST   /api/materials              — create material (title, tags, content, images)
GET    /api/materials/:id          — get single material with segments
PUT    /api/materials/:id          — update material
DELETE /api/materials/:id          — delete material
POST   /api/fetch/url              — fetch & split content from URL
POST   /api/fetch/topic            — generate content via LLM (topic, language, length)
GET    /api/config                 — get current config (including LLM provider settings)
PUT    /api/config                 — update config
```

Config schema:
- `skipPunctuation`: boolean (default true)
- `skipLimit`: number (default 3)
- `llm.baseUrl`: string (default `https://api.deepseek.com`)
- `llm.apiKey`: string (required for LLM generation)
- `llm.model`: string (default `deepseek-v4-flash`)

## Testing Decisions

### What makes a good test

Tests should verify external behavior (given input X, output Y), not implementation details. Each test should be independent and repeatable. For stateful modules (Typing Engine), test state transitions as a sequence of actions and assert the resulting state.

### Modules to test

All modules will be tested:

- **Segment Splitter**: Unit tests. Test various text formats (pure Chinese, pure English, mixed, with images, with edge cases like very long sentences, no punctuation, etc.). Verify segment lengths stay in 20-40 char range, images are preserved in order.
- **Typing Engine**: Unit tests. Test the full state machine — correct input sequence, error + backspace + correction, Hint behavior, Skip behavior (with limit enforcement), Unlock sequencing, punctuation-skip mode, Chinese composition handling, mixed content. Test edge cases: empty segment, single-char segment, all-skip scenario.
- **Material Fetcher**: Integration tests with mocked external services. Test URL fetcher with sample HTML (readable extraction, image extraction, error handling for broken URLs). Test LLM generator with mocked API (prompt construction, response parsing).
- **Material Library**: Unit tests over the storage layer. Test CRUD operations, tag filtering, search. Test persistence (data survives restart).
- **Material Browser**: Component tests. Verify library list renders, tag filtering works, URL and topic forms submit correctly.
- **Admin Page**: Component tests. Verify form submission, preview rendering, edit/delete flows.
- **Result Display**: Component tests. Verify correct calculation and display of time, accuracy, speed.

### Prior art

This is a greenfield project — no existing tests to reference.

## Out of Scope

- User accounts / authentication — single-user personal tool
- Historical progress tracking / improvement curves — may add later
- Leaderboard or social features
- Mobile-native app
- Offline support / PWA
- Content moderation / safety filtering (beyond LLM system prompt tuning)
- Audio feedback or text-to-speech
- Keyboard layout customization (DVORAK, etc.)
- Timer / session time limits
- Difficulty auto-adjustment based on performance

## Further Notes

- The LLM system prompt should specify the target audience (11-year-old, 5th grade) to ensure generated content is age-appropriate in vocabulary and complexity.
- Chinese typing accuracy is measured against final committed characters only — the engine does not track or evaluate the pinyin input process.
- The backend is intended to run locally (not deployed to cloud). The parent manages API keys and server startup.
- Image handling for URL-fetched content should gracefully degrade — if images can't be extracted, the text-only Segments should still work.
