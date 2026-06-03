Status: ready-for-agent

# 18: Random Material Selection

## Problem Statement

When the Material Library grows (e.g. 300+ Tang poems), users must manually browse and pick a Material each time. For young students who just want to practice typing, this becomes a friction point — they spend time choosing instead of typing.

## Solution

Add a "Random Practice" button to the Material Browser on the PlayPage. One click randomly selects a Material from the currently filtered list and immediately starts the typing session. If the selected Material has existing Progress, the existing continue/restart prompt appears as usual.

## User Stories

1. As a student, I want a "Random Practice" button, so that I can start typing immediately without browsing
2. As a student, I want the random button to only pick from materials matching my active tag filter, so that I can constrain randomness to a topic I want (e.g. only Tang poems)
3. As a student, I want the random button to be hidden when no materials match my filter, so that I don't click a dead button
4. As a student, I want the random button to work even when only one material is available, so that I don't have to scroll and find it
5. As a student, I want to see the progress prompt ("continue or restart") if the randomly selected material has prior Progress, so that I don't lose my previous work
6. As a student, I want the random button to be visually prominent above the material cards, so that it's the first thing I notice when choosing a material
7. As a student, I want to be able to click random again after finishing a session (by pressing back), so that I can chain multiple random practice sessions
8. As a student, I want the random selection to work the same whether I arrived from the tag filter or the full unfiltered list, so that the behavior is consistent

## Implementation Decisions

- **Frontend-only change.** No backend API modifications needed. Random selection operates on the already-loaded `filteredMaterials` computed property.
- **Random button placed between the tag filter bar and the material cards grid**, as a standalone prominent element — not inside the URL/Topic form area.
- **Button label:** `🎲 随机练习` (emoji + Chinese text).
- **On click:** pick a random Material from `filteredMaterials` via `Math.random()`, then call the existing `onSelect(mat)` function. This reuses all existing logic: loading full material, checking Progress, showing continue/restart prompt.
- **Visibility:** button is hidden (`v-if`) when `filteredMaterials.length === 0`. Visible when `≥ 1`.
- **No animation or confirmation step.** One click, direct entry into practice (or progress prompt if applicable).
- **Modules affected:**
  - `PlayPage.vue` (template + script): add button element, add `onRandom()` function
  - No changes to `TypingSession`, `TypingEngine`, `PinyinEngine`, API layer, or backend

## Testing Decisions

- **What makes a good test:** test external behavior — clicking the random button starts a session with a material from the filtered list. Do not test `Math.random()` internals.
- **Modules to test:** `PlayPage.vue` component tests (Vitest + Vue Test Utils)
- **Prior art:** `frontend/tests/PlayPage.test.ts` — existing tests for material selection, URL fetch, topic generate flows
- **Test cases:**
  - Random button is visible when `filteredMaterials.length >= 1`
  - Random button is hidden when `filteredMaterials.length === 0`
  - Clicking random button triggers `onSelect` with a material from `filteredMaterials`
  - Random button respects tag filter (only picks from filtered subset)

## Out of Scope

- Smart/intelligent random (prioritizing unpracticed materials, hardest materials, etc.)
- Animation or visual flair on random selection (dice roll, card flip, etc.)
- Backend random endpoint
- Random selection from HomePage (before navigating to PlayPage)
- Configurable random behavior (user preferences)
- "Re-roll" / "not this one" mechanism

## Further Notes

- This is the simplest viable random selection. Future enhancements could include weighted random (favor unpracticed), random with difficulty filter, or "random queue" (auto-advance to next random material after completion).
- The feature was designed through a grilling session that resolved: random scope (filtered results), interaction model (one-click, no confirmation), progress handling (reuse existing prompt), button placement (above card list), and edge cases (hide when empty).
