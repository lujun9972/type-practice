Status: ready-for-agent

## Parent

`.scratch/type-practice/PRD.md`

## What to build

Implement the core Typing Engine on the frontend with a single hardcoded Segment. The user sees the Segment text on screen. As they type, correct characters turn green and incorrect characters turn red. They can press backspace to delete and correct mistakes (correction mode). When the entire Segment is typed correctly, the UI indicates completion.

Chinese input: listen for `compositionend` events to capture final committed characters from IME. Compare against expected characters — ignore keystroke sequence.

English input: listen for `keydown` events, compare directly character-by-character.

Write unit tests for the Typing Engine state machine: correct input sequence, error + backspace + correction, cursor behavior at boundaries, Chinese composition simulation.

## Acceptance criteria

- [ ] Hardcoded Segment displayed on screen with clear visual layout
- [ ] Correct characters turn green as typed
- [ ] Incorrect characters turn red as typed
- [ ] Backspace reverts the last character and moves cursor back
- [ ] Backspace at beginning of Segment is a no-op
- [ ] Segment completion is visually indicated when all characters are correct
- [ ] Chinese input works via compositionend (works with any IME)
- [ ] English input works via keydown events
- [ ] Unit tests pass for the Typing Engine state machine

## Blocked by

- Issue 01 (Project scaffold)
