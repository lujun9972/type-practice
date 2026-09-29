Status: ready-for-agent

## Parent

Gamification — 游戏化激励系统

## What to build

前端"我的主页"(HomePage) + Stats API Client + 路由调整。这是用户直接看到的界面。

### Stats API Client

在 `frontend/src/api/` 中新增 stats 相关函数：

- `getStats()` → GET /api/stats，返回 `{ totalXp, level, title, nextLevelXp, streak, todayGoal, todayEarned }`
- `setDailyGoal(difficulty)` → POST /api/stats/daily-goal
- `useRepair(date)` → POST /api/stats/repair

可以新建 `frontend/src/api/stats.ts` 或追加到 `materials.ts`。

### HomePage 组件

新文件 `frontend/src/pages/HomePage.vue`，路由为 `/`。

#### 布局

页面分为以下区域（从上到下）：

1. **等级区域** — 大字显示 "Lv.3"，下方显示称号 "打字熟手"
2. **XP 进度条** — 显示当前 XP / 下一级 XP，带进度条
3. **每日目标区域**
   - 未选择时：显示三个按钮 "轻松(80XP)" / "正常(150XP)" / "挑战(300XP)"
   - 已选择时：显示进度条 "今日：80 / 150 XP"
   - 已完成时：显示"今日目标已完成！"的提示
4. **连续打卡区域** — 显示火焰图标 + 天数 + 修复道具数量
5. **开始练习按钮** — 大按钮，点击跳转到 /play

#### 数据流

- 页面加载时调用 `getStats()` 获取所有数据
- 选择每日目标时调用 `setDailyGoal(difficulty)`，然后刷新 stats
- 使用修复道具时调用 `useRepair(date)`
- 打字过程中 XP 变化：从 PlayPage 返回时重新获取 stats（或在 PlayPage 中通过事件通知）

### 路由调整

修改 `frontend/src/main.ts`（或 App.vue 中的路由定义）：

- `/` → HomePage（新增）
- `/play` → PlayPage（从 `/` 移到 `/play`）
- `/admin` → AdminPage（不变）
- `/settings` → SettingsPage（不变）

### PlayPage 适配

- 打字返回后（onComplete 或点击返回），携带 XP 变化信息回到 HomePage
- 简单做法：PlayPage 每次保存 progress 后在本地记录今日新增 XP，返回 HomePage 时 HomePage 重新拉取 stats

### 文件位置

- `frontend/src/pages/HomePage.vue` — 新页面
- `frontend/src/api/stats.ts` — API 客户端（新文件）
- `frontend/src/main.ts` — 路由调整
- `frontend/tests/HomePage.test.ts` — 组件测试

## Acceptance criteria

- [ ] 打开应用首屏显示 HomePage
- [ ] HomePage 显示当前等级、称号、XP 进度条
- [ ] 未选每日目标时显示三个选项按钮
- [ ] 点击选项后显示进度条和今日获得 XP
- [ ] 连续打卡天数正确显示
- [ ] 修复道具数量正确显示
- [ ] "开始练习"按钮跳转到素材列表页
- [ ] 从打字页返回后 HomePage 数据刷新
- [ ] `/play` 路径可正常访问素材列表
- [ ] `/admin` 和 `/settings` 路径不受影响

## Blocked by

- Issue 19: Stats API + XP Integration
