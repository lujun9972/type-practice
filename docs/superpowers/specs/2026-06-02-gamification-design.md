# Gamification System Design

Status: approved

## Problem

Child finishes one material and doesn't want to open the app again. The core typing experience works, but there's no reason to come back tomorrow.

## Solution

A gamification layer that creates long-term motivation through XP, levels, daily goals, and streaks. All data stored locally (no external services).

## Design Decisions

### XP (Experience Points)

- +1 XP per correct character in a completed segment
- Awarded at segment completion, reusing existing `segment-complete` event
- Replaying a material still earns XP
- XP结算复用现有 progress 保存流程

### Level System

Level up = title change only. No gameplay effects, no theme unlocks.

| Level | XP Threshold | Title |
|-------|-------------|-------|
| Lv.1  | 0           | 打字新手 |
| Lv.2  | 500         | 打字学徒 |
| Lv.3  | 1,500       | 打字熟手 |
| Lv.4  | 3,000       | 打字达人 |
| Lv.5  | 5,000       | 打字高手 |
| Lv.6  | 8,000       | 打字大师 |
| Lv.7  | 12,000      | 键盘侠 |
| Lv.8  | 18,000      | 指尖飞舞 |
| Lv.9  | 25,000      | 打字宗师 |
| Lv.10 | 35,000      | 传说 |

Lv.2 requires ~3-5 short materials, giving quick first-level-up gratification.

### Daily Goal

Child chooses from 3 presets **every day** (not a persistent setting):

| Difficulty | XP Target | Approx. Materials |
|-----------|-----------|-------------------|
| 轻松       | 80 XP     | 1 short material  |
| 正常       | 150 XP    | 1-2 materials     |
| 挑战       | 300 XP    | 2-3 materials     |

Selection happens on the "My Home" page when first opening the app each day. Once selected, shows a progress bar for today.

### Streak & Repair Items

- Consecutive days completing daily goal = streak
- Every 7 consecutive completed days → earn 1 repair item
- Repair item: retroactively marks a missed day as completed, preserving streak
- Max 3 repair items stockpiled
- Day boundary: calendar date (local timezone)

### XP Awarding

- Awarded per segment completion (not per character during typing)
- Leverages existing `segment-complete` event which already carries `{ index, accuracy, timeMs }`
- Frontend calculates correct chars from segment data, sends XP to backend
- Backend accumulates in stats.json

## Data Model

New backend file `stats.json`:

```json
{
  "totalXp": 2350,
  "level": 3,
  "streak": {
    "current": 5,
    "lastCompletedDate": "2026-06-01",
    "longest": 12,
    "repairItems": 1
  },
  "dailyGoals": {
    "2026-06-02": {
      "target": 150,
      "earned": 80,
      "difficulty": "normal"
    }
  }
}
```

## Frontend — HomePage (New)

New page as first screen (`/` route). Contains:

- **Level badge + title**: "Lv.3 打字熟手" in large text
- **XP progress bar**: progress toward next level, e.g. "1350 / 3000 XP"
- **Streak counter**: flame icon + number
- **Repair items**: count display
- **Daily goal area**: three-choice selector if not yet chosen today; progress bar if chosen
- **"Start Practice" button**: navigates to PlayPage

### Route Changes

- `/` → HomePage (new)
- `/play` → PlayPage (was `/`)
- `/admin` → AdminPage (unchanged)
- `/settings` → SettingsPage (unchanged)

## Backend API

```
GET  /api/stats            — return current stats (XP, level, streak, daily goal)
POST /api/stats/daily-goal — set today's goal { difficulty: "easy"|"normal"|"challenge" }
POST /api/stats/repair     — use a repair item (body: { date: "2026-05-30" })
```

XP updates piggyback on existing `saveProgress` calls — no new endpoint needed for XP accumulation.

## Scope — What Does NOT Change

- TypingEngine / PinyinEngine — no changes
- TypingSession / TypingSegment components — no changes
- Existing Progress mechanism — no changes
- Material management, auth, config — no changes

## Implementation Scope

New files:
- Backend: stats route handler (1 file)
- Frontend: HomePage.vue (1 file)

Modified files:
- Backend: main.py (add stats routes, add stats path setup)
- Frontend: router config (add HomePage route, shift PlayPage to `/play`)
- Frontend: PlayPage.vue (report XP on segment-complete)
- Frontend: api/materials.ts (add stats API functions)

## Open Details (implementation phase)

- Level threshold curve beyond Lv.10 (if ever needed)
- Visual design of HomePage (layout, colors, icons)
- Animation for level-up moment
