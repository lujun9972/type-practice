Status: ready-for-agent

## Parent

`.scratch/type-practice/PRD.md`

## What to build

Add a configuration/settings page and backend endpoints so the parent can adjust game behavior without editing code.

**Backend**:
- `GET /api/config` — returns current config
- `PUT /api/config` — updates config
- Config options:
  - `skipPunctuation` (boolean, default true) — auto-advance past punctuation
  - `skipLimit` (number, default 3) — max skips per Material
  - `llm.baseUrl` (string, default `https://api.deepseek.com`) — OpenAI-compatible API base URL
  - `llm.apiKey` (string) — API key for the LLM provider
  - `llm.model` (string, default `deepseek-v4-flash`) — model name
- Config persisted so it survives backend restart

**Frontend**:
- Settings page accessible via a gear icon or nav link
- Toggle for "Require punctuation input" (inverse of skipPunctuation)
- Number input for "Skip limit per Material"
- LLM settings section: base URL, API key, model name (with defaults pre-filled)
- Changes save immediately (no separate save button needed)

**Typing Engine integration**:
- Typing Engine reads config at session start
- When `skipPunctuation` is true, punctuation characters in Segments are auto-advanced (typed automatically, shown in a neutral color)
- Skip limit from config applies to the current session

## Acceptance criteria

- [ ] `GET /api/config` and `PUT /api/config` endpoints work
- [ ] Config persisted across backend restarts
- [ ] Settings page shows current config values
- [ ] "Require punctuation" toggle works and persists
- [ ] "Skip limit" number input works and persists
- [ ] Typing Engine respects punctuation config — auto-advances past punctuation when skip mode is on
- [ ] Typing Engine respects skip limit from config
- [ ] Punctuation characters shown in a visually distinct style when auto-advanced

## Blocked by

- Issue 08 (Browse & play from library)
