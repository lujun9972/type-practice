Status: ready-for-agent

## Parent

Time Goal — 按练习时间完成今日目标 (`.scratch/time-goal/PRD.md`)

## What to build

在首页实现 Tab 切换 UI，支持选择时间目标、显示时间进度、中途切换目标类型并保留累积。

**Tab 切换 UI**：每日目标选择区域顶部新增两个 Tab —「按 XP」和「按时间」。默认选中「按 XP」（向后兼容）。Tab 样式与现有按钮风格统一。切换 Tab 不触发任何操作，仅切换下方展示的按钮组。

**时间目标按钮组**：「按时间」Tab 下显示三个预设按钮（轻松 5分钟 / 正常 10分钟 / 挑战 20分钟）和一个「自定义」按钮 + 数字输入框。数字输入框 min=5 max=60 step=1，点击后直接设置目标（无需额外确认）。按钮颜色方案与 XP 按钮对应（轻松绿色、正常蓝色、挑战红色）。

**XP 目标按钮组**：「按 XP」Tab 下显示现有三个按钮，行为完全不变。

**进度显示**：目标已设置时，进度条和文字根据 `goalType` 显示对应单位：
- `goalType: "xp"` → 显示 "60 / 80 XP"（现有行为）
- `goalType: "time"` → 显示 "6 / 10 分钟"（`todayEarned / 60` 取整，`todayTarget / 60` 取整）

**中途切换**：用户已设目标后，Tab 仍可点击。切换到另一类型时，调用 `setDailyGoal` 设置新类型，后端从历史数据回算 earned，前端刷新 stats 显示已累积的进度。UI 不需要额外弹窗确认。

**前端 Stats API 扩展**：

- `Stats` 接口新增 `goalType: "xp" | "time" | null` 和 `todayTimeEarned: number`（秒）
- `setDailyGoal()` 参数扩展为 `{ difficulty, goal_type, custom_minutes? }`

**遵循的模式**：参考现有 HomePage 的 `selectGoal()`、`loadStats()`、`dailyPercent` computed 属性风格。

## Acceptance criteria

- [ ] 首页每日目标区域显示「按 XP」和「按时间」两个 Tab
- [ ] 未设目标时默认选中「按 XP」Tab，显示 XP 三档按钮
- [ ] 点击「按时间」Tab 显示时间三档按钮 + 自定义输入
- [ ] 点击「轻松 5分钟」按钮设置时间目标，API 调用参数正确
- [ ] 自定义输入框接受 5–60 的整数，超出范围时拒绝
- [ ] 目标已设后进度条显示正确单位（XP 或 分钟）
- [ ] 时间目标进度条显示 "X / N 分钟" 格式
- [ ] 时间目标完成后显示 "今日目标已完成！"
- [ ] 点击另一个 Tab 切换目标类型，已有累积保留并正确显示
- [ ] 已设目标时 Tab 显示当前激活的类型
- [ ] 现有 XP 目标选择流程完全不受影响
- [ ] `setDailyGoal()` 正确传递 `goal_type` 和 `custom_minutes` 参数

## Blocked by

- `.scratch/time-goal/issues/01-backend-time-goal-statsstore-api.md`（后端 API 必须先就绪）
