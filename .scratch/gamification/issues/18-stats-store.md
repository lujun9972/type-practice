Status: ready-for-agent

## Parent

Gamification — 游戏化激励系统

## What to build

后端 Stats Store 模块：管理所有游戏化状态的 JSON 持久化存储。这是整个游戏化系统的基础，后续 issue 依赖此模块。

### 数据模型

`stats.json` 结构：
```json
{
  "totalXp": 0,
  "streak": {
    "current": 0,
    "lastCompletedDate": null,
    "longest": 0,
    "repairItems": 0
  },
  "dailyGoals": {},
  "xpHistory": {}
}
```

- `totalXp`: 累计 XP
- `streak.current`: 当前连续打卡天数
- `streak.lastCompletedDate`: 最近一个完成每日目标的日期（YYYY-MM-DD）
- `streak.longest`: 历史最长连续天数
- `streak.repairItems`: 当前修复道具数量（最多 3 个）
- `dailyGoals`: `{ "YYYY-MM-DD": { target, earned, difficulty } }` 每日目标记录
- `xpHistory`: `{ "YYYY-MM-DD": number }` 每日 XP 获得记录

### 等级阈值表

| Level | XP      | Title   |
|-------|---------|---------|
| 1     | 0       | 打字新手 |
| 2     | 500     | 打字学徒 |
| 3     | 1,500   | 打字熟手 |
| 4     | 3,000   | 打字达人 |
| 5     | 5,000   | 打字高手 |
| 6     | 8,000   | 打字大师 |
| 7     | 12,000  | 键盘侠 |
| 8     | 18,000  | 指尖飞舞 |
| 9     | 25,000  | 打字宗师 |
| 10    | 35,000  | 传说 |

### 每日目标预设

| Difficulty | XP Target |
|-----------|-----------|
| easy       | 80        |
| normal     | 150       |
| challenge  | 300       |

### StatsStore 类接口

- `get_stats()` → 返回完整 stats 快照（含计算出的 level、title、今日状态）
- `add_xp(amount, date=None)` → 累加 XP，更新每日 XP 记录，检查今日目标是否完成，自动更新 streak
- `set_daily_goal(difficulty)` → 设置今日目标（easy/normal/challenge）
- `use_repair(date)` → 消耗 1 个修复道具，将指定日期标记为已完成
- `_compute_level(xp)` → 根据 XP 返回 (level, title, next_level_xp)
- `_check_streak()` → 根据每日目标历史重新计算 streak，每 7 天奖励修复道具

### Streak 计算逻辑

1. 从今天往前回溯，检查每天是否有每日目标且 earned >= target
2. 连续满足条件的天数 = current streak
3. 如果今天还没完成，从昨天开始回溯
4. 每当 current 达到 7 的倍数，repairItems += 1（上限 3）
5. repair 标记某天为已完成后需要重新计算 streak

### 文件位置

- `backend/app/stats.py` — StatsStore 类
- `backend/tests/test_stats.py` — 单元测试

### 遵循的模式

参考 `backend/app/store.py`（MaterialStore）的实现模式：
- 构造函数接收 JSON 文件路径
- `init()` 加载/创建文件
- `flush()` 写回文件
- 线程安全不需要（单用户本地应用）

## Acceptance criteria

- [ ] StatsStore 初始化时创建空的 stats.json
- [ ] `add_xp(100)` 后 totalXp 为 100
- [ ] `add_xp` 自动更新 dailyGoals 中今日的 earned 值
- [ ] XP 到达阈值时 `_compute_level` 返回正确的 level 和 title
- [ ] `set_daily_goal("normal")` 设置今日 target 为 150
- [ ] 当 earned >= target 时自动判定今日目标完成
- [ ] 连续 7 天完成每日目标，repairItems 增加 1
- [ ] `use_repair` 消耗 1 个修复道具，指定日期标记为已完成
- [ ] repairItems 上限为 3，超出不再增加
- [ ] streak.longest 正确记录历史最长连续天数
- [ ] 数据持久化到 stats.json，重启后可恢复

## Blocked by

None
