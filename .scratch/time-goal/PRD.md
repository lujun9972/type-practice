# Time Goal — 按练习时间完成今日目标 PRD

Status: ready-for-agent

## Problem Statement

现有的每日目标只有一种度量方式：累积 XP。对于一些孩子来说，「今天打了多少字」不如「今天练了多少分钟」来得直观——尤其是不确定自己能打多少字的小学生，时间目标降低了心理门槛，让「每天练 10 分钟」成为更容易坚持的承诺。

## Solution

新增「按时间」目标类型，与现有「按 XP」目标互斥选择。用户在首页通过 Tab 切换选择目标度量方式，当天只激活一种目标。练习时间来自已完成 Segment 的 `timeMs` 字段加总，不需要新增计时机制。连击逻辑不变——完成当日目标即为完成，无论度量方式。

## User Stories

### 目标选择

1. As a player, I want to see two tabs ("按 XP" / "按时间") on the home page when choosing my daily goal, so that I can pick the measurement that motivates me today
2. As a player, I want the "按 XP" tab to be selected by default, so that existing behavior is preserved
3. As a player, I want to see three preset buttons under "按时间" tab (轻松 5分钟 / 正常 10分钟 / 挑战 20分钟), so that I can quickly choose a time goal
4. As a player, I want to see a "自定义" button under "按时间" tab with a number input (5–60 minutes), so that I can set my own target
5. As a player, I want the number input to reject values below 5 or above 60, so that I don't accidentally set an impossible or meaningless goal
6. As a player, I want the "按 XP" tab to show the existing three buttons (轻松 80 XP / 正常 150 XP / 挑战 300 XP), so that the XP goal experience is unchanged
7. As a player, I want selecting a goal to immediately start tracking, so that I don't need an extra confirmation step

### 进度追踪

8. As a player, I want my daily goal progress bar to show minutes (e.g., "6 / 10 分钟") when I chose a time goal, so that the unit matches what I committed to
9. As a player, I want my daily goal progress bar to show XP (e.g., "60 / 80 XP") when I chose an XP goal, so that the unit matches what I committed to
10. As a player, I want each completed Segment's typing time to count toward my time goal, so that my actual practice effort is measured
11. As a player, I want the progress bar to update in real-time after each Segment completion, so that I see how close I am to my goal
12. As a player, I want a celebration message ("今日目标已完成！") when my time goal is met, so that I feel accomplished

### 中途切换

13. As a player, I want to switch from XP goal to time goal mid-day, so that I can change my mind if my original goal doesn't fit
14. As a player, I want to switch from time goal to XP goal mid-day, so that I can change my mind
15. As a player, I want my already-accumulated practice time to count when switching to a time goal, so that my earlier effort isn't wasted
16. As a player, I want my already-accumulated XP to count when switching to an XP goal, so that my earlier effort isn't wasted
17. As a player, I want to see the carried-over progress displayed when I switch goal types, so that I understand my progress was preserved

### 连击与持久化

18. As a player, I want completing a time goal to count toward my streak, exactly the same as completing an XP goal, so that streaks work regardless of goal type
19. As a player, I want my daily goal choice (type + difficulty) to persist if I close and reopen the browser, so that I don't lose my commitment
20. As a player, I want my goal to auto-reset at midnight, so that each day is a fresh start (same as current behavior)
21. As a player, I want repair items to work on time goals the same way as XP goals, so that I can fix a missed day regardless of what goal type I used

### 边界场景

22. As a player, I want setting a 5-minute time goal and practicing for exactly 5 minutes to show as completed, so that edge cases are handled correctly
23. As a player, I want my time goal progress to not count time from segments I skip, so that only genuine typing practice is measured
24. As a player, I want the custom minute input to only accept integers, so that I don't enter fractional minutes

## Implementation Decisions

### Data model: unified `target`/`earned` with `type` discriminator

The `dailyGoals[date]` entry gains a `type` field. `target` and `earned` remain single numeric fields — their unit is determined by `type`:

- `type: "xp"` → `target` and `earned` are in XP units
- `type: "time"` → `target` and `earned` are in seconds (displayed as minutes)

This preserves the `earned >= target` completion check and the entire streak calculation without change.

### Time source: Segment `timeMs` field

The frontend already reports `timeMs` (milliseconds) per completed Segment in `segmentResults`. The backend `save_progress` function will sum `timeMs` across newly completed segments, convert to seconds, and call `add_time()` on the StatsStore. No new frontend timing mechanism is needed.

### StatsStore new method: `add_time(seconds, date)`

Analogous to `add_xp(amount, date)`. Increments `dailyGoals[date]["earned"]` (in seconds) when the active goal type is `"time"`. Also tracks total daily practice time in a new `timeHistory` map (analogous to `xpHistory`) for potential future use and mid-day switch calculations.

### StatsStore method extension: `set_daily_goal(difficulty, goal_type, custom_minutes?, date)`

- `goal_type`: `"xp"` or `"time"`
- `custom_minutes`: optional, only valid when `goal_type` is `"time"` and `difficulty` is `"custom"`
- Sets the `type` field on the daily goal entry
- When switching goal types mid-day, recalculates `earned` from `xpHistory` or `timeHistory` for that date

### StatsStore response: `get_stats()` extension

Returns a new `goalType` field (`"xp" | "time" | null`). The existing `todayTarget` and `todayEarned` remain — the frontend uses `goalType` to determine display units.

### API contract: `POST /api/stats/daily-goal`

Request body extended:

```
{
  "difficulty": "easy" | "normal" | "challenge" | "custom",
  "goal_type": "xp" | "time",
  "custom_minutes": number | null   // required when difficulty is "custom"
}
```

### API contract: `GET /api/stats`

Response extended with:

```
{
  ...existing fields,
  "goalType": "xp" | "time" | null,
  "todayTimeEarned": number  // total seconds practiced today, always present regardless of goal type
}
```

### Backend: `save_progress` time accumulation

In `save_progress`, after the existing XP calculation loop, add a parallel loop that sums `timeMs` from newly completed segments (same `old_indices` exclusion logic), converts to seconds, and calls `add_time()`.

### Frontend: `Stats` interface extension

```
goalType: "xp" | "time" | null
todayTimeEarned: number  // seconds
```

### Frontend: HomePage Tab UI

Two tabs at the top of the daily goal section. Active tab shows its preset buttons. "按时间" tab shows an additional number input for custom minutes. When a goal is already set, the tab reflects the active type and shows progress in the appropriate unit.

### Frontend: `setDailyGoal()` parameter extension

```
setDailyGoal(params: {
  difficulty: "easy" | "normal" | "challenge" | "custom",
  goal_type: "xp" | "time",
  custom_minutes?: number
}): Promise<Stats>
```

### Module inventory

| Module | Type | Change |
|--------|------|--------|
| StatsStore (`stats.py`) | Deep | Add `type` field, `add_time()`, extend `set_daily_goal()`, extend `get_stats()` |
| API endpoints (`main.py`) | Shallow | Extend `DailyGoalBody`, add time accumulation in `save_progress` |
| Stats API (`stats.ts`) | Shallow | Extend `Stats` interface, extend `setDailyGoal()` |
| HomePage (`HomePage.vue`) | UI | Tab component, time goal buttons, custom input, dual-unit progress display |

## Testing Decisions

### What makes a good test

Tests should verify external behavior (observable outcomes) not implementation details. For StatsStore, that means: calling a public method and asserting the return value of `get_stats()` or the persisted JSON structure.

### Backend: StatsStore tests (`test_stats.py`)

Follow existing `TestDailyGoal`, `TestStreak`, `TestRepairItem` class pattern. New test classes:

- **TestTimeGoal**: set time goal, accumulate time via `add_time()`, verify completion at target, verify presets (300/600/1200 seconds)
- **TestGoalTypeSwitch**: set XP goal, earn XP, switch to time goal, verify `earned` reflects accumulated time from `timeHistory`; reverse direction
- **TestCustomTimeGoal**: set custom minutes (5, 60, boundary values), verify target stored in seconds
- **TestTimeGoalStreak**: verify time goal completion triggers streak increment, same as XP goal

### Backend: API tests (`test_stats_api.py`)

- Verify `POST /api/stats/daily-goal` with `goal_type: "time"` creates time goal
- Verify `POST /api/stats/daily-goal` with `goal_type: "time", difficulty: "custom", custom_minutes: 15` creates 900-second goal
- Verify `save_progress` accumulates time toward time goal

### Frontend tests

Existing frontend tests are in `frontend/tests/`. Test the HomePage component's tab switching and time goal selection behavior, following existing component test patterns.

## Out of Scope

- Coexisting XP and time goals on the same day (explicitly decided against — see ADR 0001)
- Historical goal type breakdown in stats (e.g., "you completed 5 XP goals and 3 time goals this month")
- Admin-visible analytics for time goals
- Wall-clock or active-typing timer (beyond Segment `timeMs`)
- Changing preset values (easy/normal/challenge minutes are hardcoded, same as XP presets)
- Offline/delta sync for time accumulation (single-user local app, not needed)

## Further Notes

- ADR 0001 documents the mutual exclusivity decision and its reversibility path
- The `timeHistory` map in stats data enables future features (e.g., "total practice time" stat, practice time charts) without schema migration
- Time data from Skipped segments is excluded because skipped segments do not produce `timeMs` in `segmentResults`
- The existing `xpHistory` and new `timeHistory` both track daily totals, enabling the mid-day switch feature to recalculate `earned` from the appropriate history
