Status: ready-for-agent

## Parent

`.scratch/type-practice/PRD.md`

## What to build

Implement the Segment Splitter module on the backend. This is a pure function that takes raw text content (and optional images) and returns an ordered list of Segments. Each Segment targets 20-40 characters, split on natural sentence boundaries (Chinese/English periods, exclamation marks, question marks, comma-based breath points). Images are preserved as separate nodes between Segments at their original positions. The module handles mixed Chinese/English text and strips/normalizes problematic content (HTML tags, script content).

Expose this via a backend utility (not yet as an HTTP endpoint — that comes in later slices). Write comprehensive unit tests covering: pure Chinese text, pure English text, mixed text, text with images, edge cases (very long sentences, no punctuation, single character), and segment length bounds.

## Acceptance criteria

- [ ] `splitIntoSegments(rawContent, images)` returns an ordered array of Segment nodes
- [ ] Each text Segment is 20-40 characters, split on natural boundaries
- [ ] Image nodes are preserved in correct order between text Segments
- [ ] Mixed Chinese/English text handled correctly
- [ ] HTML tags and script content stripped from input
- [ ] Unit tests pass covering all text formats, edge cases, and segment length bounds

## Blocked by

- Issue 01 (Project scaffold)
