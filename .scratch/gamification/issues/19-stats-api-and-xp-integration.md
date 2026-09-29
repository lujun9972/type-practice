Status: ready-for-agent

## Parent

Gamification — 游戏化激励系统

## What to build

后端 Stats API 端点 + XP 与现有 progress 保存流程的集成。

### API 端点

在 `backend/app/main.py` 中新增：

1. `GET /api/stats` — 返回当前游戏化状态
   - 调用 `stats_store.get_stats()`
   - 返回 JSON：`{ totalXp, level, title, nextLevelXp, streak, todayGoal, todayEarned }`

2. `POST /api/stats/daily-goal` — 设置今日每日目标
   - 请求体：`{ "difficulty": "easy" | "normal" | "challenge" }`
   - 调用 `stats_store.set_daily_goal(difficulty)`
   - 返回更新后的 stats

3. `POST /api/stats/repair` — 使用修复道具
   - 请求体：`{ "date": "YYYY-MM-DD" }`
   - 调用 `stats_store.use_repair(date)`
   - 返回更新后的 stats

### XP 集成

在现有的 progress 保存流程中加入 XP 结算：

当 `PUT /api/progress/:materialId` 被调用时（每次 Segment 完成都会触发），后端从 `segmentResults` 中计算本段正确字符数，调用 `stats_store.add_xp(correct_count)`。

具体位置：在 `save_progress` 函数中，保存 progress 后，取出本次新增的 segment result（列表最后一个），计算其正确字符数。

正确字符数计算方式：segment result 中已有 `accuracy` 百分比和已知该 segment 的总字符数。正确字符 = `round(total_chars * accuracy / 100)`。但更精确的做法是在 segment result 中直接携带正确字符数——需要在前端发送 progress 时在 segment result 中增加 `correctChars` 字段。

前端 `TypingSession.vue` 在 `segment-complete` 事件中已有 `accuracy` 计算。在此基础上增加 `correctChars`：遍历 engine.chars 数组统计 status === "correct" 的数量。

### 后端初始化

在 `main.py` 的启动流程中：
- 初始化 StatsStore，路径为 `{data_dir}/stats.json`
- Stats 路由不需要认证（玩家数据，非管理功能）

### 文件位置

- `backend/app/main.py` — 新增路由和 XP 集成
- `backend/app/stats.py` — 已在 Issue 18 创建
- `frontend/src/components/TypingSession.vue` — segment-complete 事件增加 correctChars
- `backend/tests/test_stats_api.py` — API 集成测试

## Acceptance criteria

- [ ] `GET /api/stats` 返回正确的 XP、等级、称号、streak、今日目标状态
- [ ] `POST /api/stats/daily-goal` 设置今日目标，再次 GET 能看到更新
- [ ] `POST /api/stats/repair` 消耗修复道具，指定日期标记为已完成
- [ ] 保存 progress 时自动结算 XP（从 segment result 中提取正确字符数）
- [ ] 前端 segment-complete 事件携带 correctChars 字段
- [ ] Stats API 不需要认证即可访问
- [ ] 连续完成几个 segment 后，GET /api/stats 的 totalXp 正确累加

## Blocked by

- Issue 18: Stats Store
