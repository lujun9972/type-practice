Status: ready-for-agent

## Parent

Time Goal — 按练习时间完成今日目标 (`.scratch/time-goal/PRD.md`)

## What to build

扩展 StatsStore 支持时间目标类型，并贯穿 API 层完成端到端集成。

**数据模型变更**：`dailyGoals[date]` 新增 `type` 字段（`"xp"` 或 `"time"`）。当 `type: "time"` 时，`target` 和 `earned` 的单位为秒。`earned >= target` 判定逻辑不变，streak 计算零改动。新增 `timeHistory` map（`{ "YYYY-MM-DD": seconds }`）追踪每日练习总秒数，用于中途切换时回算 `earned`。

**时间预设**（秒）：
- easy: 300（5 分钟）
- normal: 600（10 分钟）
- challenge: 1200（20 分钟）
- custom: `custom_minutes * 60`，范围 5–60 分钟

**StatsStore 新增/扩展方法**：

- `add_time(seconds, date=None)` — 累加当日 `timeHistory` 和 `dailyGoals[date]["earned"]`（仅当 `type: "time"` 时更新 earned）
- `set_daily_goal(difficulty, goal_type, custom_minutes=None, date=None)` — 扩展接受 `goal_type`（`"xp"` / `"time"`）和可选 `custom_minutes`。设置 `type` 字段，从中途切换时从 `xpHistory` 或 `timeHistory` 回算 `earned`。
- `get_stats()` 扩展返回 `goalType`（`"xp"` / `"time"` / `null`）和 `todayTimeEarned`（总秒数，无论目标类型）

**API 变更**：

- `DailyGoalBody` 扩展：新增 `goal_type: "xp" | "time"` 和可选 `custom_minutes: int | None`。当 `difficulty: "custom"` 时 `custom_minutes` 必填，范围 5–60。
- `save_progress` 扩展：在现有 XP 计算循环后，新增时间累积循环 — 遍历新完成的 Segment（排除 `old_indices`），加总 `timeMs` 转秒，调用 `add_time()`。
- `GET /api/stats` 响应新增 `goalType` 和 `todayTimeEarned` 字段。

**时间来源**：前端已在每个 Segment 完成时上报 `timeMs`（毫秒），`save_progress` 已接收此数据。后端只需读取并加总。跳过的 Segment 不产生 `timeMs`，天然排除。

**遵循的模式**：参考现有 `add_xp()`、`set_daily_goal()` 的实现风格 — 构造函数加载 JSON、方法修改 `_data`、每次变更后 `_flush()`。

## Acceptance criteria

- [ ] `set_daily_goal("easy", goal_type="time", date="...")` 设置 type="time"、target=300 的目标
- [ ] `set_daily_goal("normal", goal_type="xp")` 行为与现有完全一致（向后兼容）
- [ ] `set_daily_goal("custom", goal_type="time", custom_minutes=15)` 设置 target=900
- [ ] `custom_minutes` < 5 或 > 60 时抛出验证错误
- [ ] `add_time(120, date="...")` 在 type="time" 时累加 earned 120 秒
- [ ] `add_time()` 同时更新 `timeHistory`
- [ ] XP 目标激活时 `add_time()` 不影响 earned（但 timeHistory 仍更新）
- [ ] 时间目标 earned >= target 时 `todayCompleted` 为 True
- [ ] `save_progress` 正确加总新 Segment 的 timeMs 并调用 add_time
- [ ] `get_stats()` 返回 `goalType` 和 `todayTimeEarned` 字段
- [ ] 中途从 XP 切换到时间目标时，earned 从 timeHistory 回算
- [ ] 中途从时间切换到 XP 目标时，earned 从 xpHistory 回算
- [ ] 时间目标完成后 streak 正确递增（与 XP 目标行为一致）
- [ ] 现有 XP 目标所有测试不受影响（向后兼容）
- [ ] 数据持久化到 stats.json，重启后可恢复

## Blocked by

None — can start immediately.
