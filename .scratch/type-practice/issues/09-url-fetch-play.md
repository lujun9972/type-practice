Status: ready-for-agent

## Parent

`.scratch/type-practice/PRD.md`

## What to build

Add URL-based content fetching to the home page and backend. The user can paste a URL, the backend fetches the page, extracts readable text and images, splits into Segments, and the user plays through the content.

**Backend**:
- `POST /api/fetch/url` endpoint accepting `{ url: string }`
- Fetches the page, extracts main readable content and images (readability-style extraction)
- Strips navigation, ads, scripts, and other non-content elements
- Passes extracted content through Segment Splitter
- Returns the Material (with Segments and images) without persisting it

**Home page**:
- Add a "Paste URL" tab/input on the home page
- URL input field + "Start" button
- Loading state while fetching
- Error handling for invalid URLs, unreachable pages, or empty content
- On success, immediately starts typing session with fetched content

Write tests: URL fetcher with sample HTML (extraction, image handling), error cases, backend endpoint.

## Acceptance criteria

- [ ] `POST /api/fetch/url` fetches and extracts readable content from a given URL
- [ ] Images are extracted and included in the response
- [ ] Non-content elements (nav, ads, scripts) are stripped
- [ ] Extracted content is split into Segments automatically
- [ ] Home page has URL input field with loading state
- [ ] Successful fetch starts a typing session with the content
- [ ] Error states handled gracefully (invalid URL, unreachable, empty content)
- [ ] Tests pass for URL fetcher and extraction logic

## Blocked by

- Issue 08 (Browse & play from library)
