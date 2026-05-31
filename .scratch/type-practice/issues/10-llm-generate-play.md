Status: ready-for-agent

## Parent

`.scratch/type-practice/PRD.md`

## What to build

Add LLM-based content generation to the home page and backend. The user enters a topic, selects language (Chinese/English) and length (short/medium/long/auto), and the backend calls an LLM API to generate age-appropriate content, which is then split into Segments and played through.

**Backend**:
- `POST /api/fetch/topic` endpoint accepting `{ topic: string, language: "zh"|"en", length: "short"|"medium"|"long"|"auto" }`
- Uses OpenAI-compatible chat completions API as the standard interface
- Default provider: DeepSeek (base_url: `https://api.deepseek.com`, model: `deepseek-v4-flash`)
- Provider is configurable via config: `base_url`, `api_key`, `model` — supports any OpenAI-compatible API (DeepSeek, OpenAI, Moonshot, local Ollama, etc.)
- System prompt specifies 11-year-old audience, age-appropriate vocabulary
- For "auto" length, the system picks an appropriate length based on topic complexity
- Passes generated text through Segment Splitter
- Returns the Material without persisting
- LLM API key and base_url read from config file or environment variables

**Home page**:
- Add a "Generate" tab/input on the home page
- Topic text field, language dropdown (Chinese/English), length dropdown (short/medium/long/auto)
- Loading state while generating
- On success, immediately starts typing session with generated content

**Note**: This issue is HITL because it requires the parent to configure an LLM API key before it can be tested end-to-end.

Write tests with mocked LLM API: prompt construction, response parsing, error handling.

## Acceptance criteria

- [ ] `POST /api/fetch/topic` generates content via LLM API
- [ ] System prompt specifies 11-year-old audience and age-appropriate content
- [ ] Language selection (Chinese/English) controls output language
- [ ] Length selection controls generated content length
- [ ] "Auto" length picks reasonable default
- [ ] Generated text is split into Segments automatically
- [ ] Uses OpenAI-compatible chat completions API interface
- [ ] Default provider is DeepSeek (`deepseek-v4-flash` model)
- [ ] Provider configurable via `base_url`, `api_key`, `model` in config
- [ ] Home page has topic input with language and length dropdowns
- [ ] Loading state shown during generation
- [ ] Successful generation starts typing session
- [ ] Error handling for API failures and invalid inputs
- [ ] Tests pass with mocked LLM API responses

## Blocked by

- Issue 08 (Browse & play from library)
