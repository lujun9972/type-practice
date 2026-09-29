# Gamification — 游戏化激励系统 PRD

Status: ready-for-agent

## Problem Statement

孩子打完一篇素材后就没有理由再打开应用了。打字练习的核心体验已经完善（双引擎、渐进解锁、提示/跳过、素材管理），但缺乏长期激励机制——没有"明天还想玩"的拉力。

## Solution

新增游戏化激励层：经验值（XP）+ 等级 + 每日目标 + 连续打卡 + 修复道具。所有数据本地存储，不依赖外部服务。新增"我的主页"作为首屏，孩子每天打开应用时看到自己的等级、选择今日目标、查看连续打卡天数，形成每日仪式感。

## User Stories

### 等级与经验值

1. As a player, I want to earn XP for every correct character I type, so that my effort is rewarded
2. As a player, I want to see my current level and title on the home page, so that I feel a sense of progression
3. As a player, I want to see an XP progress bar showing how far I am from the next level, so that I know how close I am to leveling up
4. As a player, I want to level up after accumulating enough XP, so that I earn a new title
5. As a player, I want to see my title change when I level up, so that I feel recognized for my progress
6. As a player, I want to earn XP even when replaying a material I've already completed, so that I'm not punished for practicing with content I enjoy

### 每日目标

7. As a player, I want to choose a daily goal difficulty (easy/normal/challenge) every time I open the app, so that I can decide how much I want to practice today
8. As a player, I want to see my daily progress bar (earned XP vs target XP), so that I know how much more I need to type today
9. As a player, I want to see a celebration when I complete my daily goal, so that I feel accomplished
10. As a player, I want to see today's daily goal auto-reset at midnight, so that each day is a fresh start

### 连续打卡

11. As a player, I want to see my current streak (consecutive days completing daily goal), so that I'm motivated to keep going
12. As a player, I want to see my longest streak record, so that I can try to beat it
13. As a player, I want to earn a repair item every 7 consecutive days, so that one missed day doesn't destroy my progress
14. As a player, I want to use a repair item to retroactively mark a missed day as completed, so that my streak is preserved
15. As a player, I want to see how many repair items I have, so that I know if I can afford to miss a day

### 我的主页

16. As a player, I want a "My Home" page as the first thing I see when I open the app, so that I'm greeted with my progress and goals
17. As a player, I want to see my level, XP progress, streak, and daily goal all in one place, so that I get a quick overview of where I stand
18. As a player, I want a prominent "Start Practice" button on the home page, so that I can quickly jump into typing
19. As a player, I want the daily goal selection to be the first thing I do if I haven't chosen one today, so that I commit to my practice plan

## Implementation Decisions

### Module: Stats Store (backend)

Deep module. Manages all gamification state in a single JSON file (`stats.json`).

State:
- `totalXp`: cumulative XP earned
- `level`: derived from totalXp via threshold lookup
- `streak`: `{ current, lastCompletedDate, longest, repairItems }`
- `dailyGoals`: `{ "YYYY-MM-DD": { target, earned, difficulty } }`

Level threshold table (XP → level → title):

```
Lv.1:  0 XP      — 打字新手
Lv.2:  500 XP    — 打字学徒
Lv.3:  1,500 XP  — 打字熟手
Lv.4:  3,000 XP  — 打字达人
Lv.5:  5,000 XP  — 打字高手
Lv.6:  8,000 XP  — 打字大师
Lv.7:  12,000 XP — 键盘侠
Lv.8:  18,000 XP — 指尖飞舞
Lv.9:  25,000 XP — 打字宗师
Lv.10: 35,000 XP — 传说
```

Daily goal presets:
- easy: 80 XP (≈ 1 short material)
- normal: 150 XP (≈ 1-2 materials)
- challenge: 300 XP (≈ 2-3 materials)

Interface:
- `add_xp(amount)` — add XP, auto-update level, auto-check daily goal completion
- `set_daily_goal(difficulty)` — set today's target
- `use_repair(date)` — spend a repair item to cover a missed day
- `get_stats()` — return full stats snapshot
- `check_streak()` — update streak based on daily goal history, award repair items at 7-day milestones

Persistence: JSON file, following the same pattern as existing material/progress stores.

### Module: Stats API (backend)

Thin wrapper over Stats Store. Three new endpoints added to `main.py`:

```
GET  /api/stats            — return current stats
POST /api/stats/daily-goal — { difficulty: "easy"|"normal"|"challenge" }
POST /api/stats/repair     — { date: "YYYY-MM-DD" }
```

XP accumulation piggybacks on existing `saveProgress` flow — when the backend receives segment results, it counts correct characters and calls `add_xp()`.

### Module: HomePage (frontend)

New Vue component at route `/`. The daily landing page for the player.

Layout:
- Level badge + title (large, prominent)
- XP progress bar with "current / next_level_threshold" label
- Streak counter with icon
- Repair items count
- Daily goal area: three-choice selector if not yet chosen today; progress bar if chosen
- "Start Practice" button → navigates to `/play`

### Module: Stats API Client (frontend)

New API functions in `materials.ts` (or separate `stats.ts`):
- `getStats()` → GET /api/stats
- `setDailyGoal(difficulty)` → POST /api/stats/daily-goal
- `useRepair(date)` → POST /api/stats/repair

### Route Changes

- `/` → HomePage (new, was PlayPage)
- `/play` → PlayPage (moved from `/`)
- `/admin` → AdminPage (unchanged)
- `/settings` → SettingsPage (unchanged)

### XP Calculation

XP is calculated from segment results already sent to the backend. Each segment completion carries the character array with correct/incorrect status. The backend counts `correct` characters and adds that count as XP.

This happens inside the existing progress save flow — no new frontend event needed. The backend extracts XP from segment data that's already being sent.

### Streak Logic

- Day = calendar date in local timezone
- A day is "completed" when `earned >= target` for that day's daily goal
- `current` streak = count of consecutive completed days ending at today (or yesterday if today isn't done yet)
- Every time `current` reaches a multiple of 7, `repairItems += 1` (capped at 3)
- Using repair: marks the specified date as completed, recalculates streak

### XP on Replay

Replaying a material earns XP just like the first play. No de-duplication. Rationale: material library is parent-curated and limited; restricting XP to first-play would create a "nothing new to earn from" wall.

## Testing Decisions

### What makes a good test

Tests verify external behavior (given input X, output Y), not implementation details. For Stats Store, test state transitions as operations and assert resulting state. For API endpoints, test HTTP responses.

### Modules to test

- **Stats Store**: Unit tests. Test XP accumulation, level-up logic (threshold boundaries), daily goal setting and completion, streak calculation (consecutive days, gap with repair, repair item earning at 7-day milestones, repair item cap at 3, longest streak tracking), day boundary handling.
- **Stats API**: Integration tests. Test GET /api/stats returns current state, POST /api/stats/daily-goal sets target, POST /api/stats/repair spends item, XP updates on progress save.
- **HomePage**: Component tests. Verify level display, XP bar rendering, daily goal selector appears when no goal set today, progress bar appears when goal is set, "Start Practice" navigates to /play.

### Prior art

Existing tests in `backend/tests/` use `pytest` with a temp file fixture for stores. Frontend tests in `frontend/tests/` use `vitest` + `@vue/test-utils`. Follow the same patterns.

## Out of Scope

- Achievement badges beyond level titles — may add later
- UI themes or cosmetic unlocks for leveling up
- Sound effects or visual celebrations (confetti, animations)
- Combo counter during typing
- Keyboard visualization
- Error analysis or typing statistics dashboard
- Material difficulty rating
- Mobile-responsive layout
- Multi-user support
- External service integration (cloud sync, social features)

## Further Notes

- The level-up moment should be visually noticeable (even without animation) — consider a distinct color or size change on the HomePage when the player has just leveled up
- The daily goal selection should feel like a commitment ritual, not a chore — keep it visually simple and quick
- Streak display should make the player feel proud of their consistency, not anxious about losing it — the repair item mechanism is specifically designed to reduce anxiety
- Lv.2 threshold (500 XP) is intentionally low so the child experiences their first level-up within a few practice sessions
