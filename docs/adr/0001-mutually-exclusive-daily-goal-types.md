# ADR 0001: Daily Goal Types Are Mutually Exclusive Per Day

## Status

Accepted

## Context

The app originally had a single daily goal type: accumulate a target amount of XP. We are adding a second goal type based on accumulated practice time (minutes). A design decision is needed on whether the two goal types can coexist on the same day.

Options considered:

- **Mutually exclusive (chosen)**: User selects either XP Goal or Time Goal for the day. Switching mid-day is allowed but preserves accumulated progress in the new metric.
- **Coexisting**: User can have both an XP Goal and a Time Goal active simultaneously. Both must be met for the day to count as "completed."
- **Independent tracking**: Two separate streak counters, one for each goal type.

## Decision

Daily Goal types are **mutually exclusive per day**. The user picks one at a time via a tab-based UI ("按 XP" / "按时间"). Switching mid-day is allowed; when switching to Time Goal, already-completed segments' `timeMs` is summed as the starting earned value (and vice versa for XP).

## Consequences

### Positive
- **Simple data model**: `dailyGoals[date]` remains a single entry with one `{target, earned, type}` tuple, not a collection.
- **Streak logic unchanged**: `_check_daily_completed()` continues to compare `earned >= target` regardless of type.
- **Low cognitive load for the target audience** (primary school students): one goal to focus on.

### Negative
- Power users who want to track both XP and time simultaneously cannot do so.
- Switching types mid-day may confuse users who don't realize their progress carries over — needs clear UI feedback.

### Mitigations
- When switching goal type, the UI shows the carried-over progress (e.g., "你已经累积了 6 分钟").
- Future: if coexistence is requested, the data model can be extended by making `dailyGoals[date]` an array without breaking existing data (each entry gains a `type` field).
