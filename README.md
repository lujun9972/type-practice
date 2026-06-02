# Type Practice

面向小学生的中英文打字练习游戏。从素材库选择文章，逐段打字练习，实时显示准确率和速度。通过 XP 经验值、等级、连击、每日目标等游戏化机制激励持续练习。

## Features

- **素材管理** — 手动创建、URL 抓取、AI 生成三种方式，支持查看详情、编辑、删除
- **分段打字** — 文章自动按句号分段，逐段解锁，图片在打完前置段落后显示
- **拼音模式** — 切换到拼音输入模式，练习汉字拼音输入，支持声调显示和 IME 组合处理
- **拼音提示** — 遇到不会读的汉字，点击 Hint 显示拼音（不限次数）
- **进度保存** — 关闭浏览器后再次打开，提示继续或重新开始
- **URL 抓取** — 粘贴网页链接，自动提取正文和图片作为打字素材
- **AI 生成** — 输入话题，LLM 自动生成适合小学生的阅读内容，可指定字数范围
- **打字统计** — 每段显示准确率、用时，完成后汇总速度（字/分钟）

### 游戏化系统

- **XP 经验值** — 每打对一个字获得 1 XP，即时反馈
- **等级系统** — Lv.1（打字新手）到 Lv.10（传说），10 个等级逐步成长
- **每日目标** — 每天自选轻松（80 XP）、正常（150 XP）、挑战（300 XP）三档目标
- **连击奖励** — 连续练习天数记录，每坚持 7 天获得 1 个修复道具（最多 3 个）
- **修复道具** — 断连时可消耗道具修复连击记录

### 管理保护

管理页面支持密码认证，防止误操作修改素材库。

## Tech Stack

| 层 | 技术 |
|---|------|
| Frontend | Vue 3 + TypeScript + Vite |
| Backend | Python FastAPI + uvicorn |
| Testing | Vitest (frontend, 114 tests) + pytest (backend, 95 tests) |
| Content Extraction | readability + custom extractor |
| Pinyin | pinyin-pro |
| LLM | DeepSeek / OpenAI-compatible API |

## Project Structure

```
type-practice/
├── frontend/                # Vue 3 SPA
│   ├── src/
│   │   ├── api/             # API client (materials, stats, config)
│   │   ├── components/      # TypingSegment, TypingSession
│   │   ├── engine/          # TypingEngine + PinyinEngine
│   │   └── pages/           # HomePage, PlayPage, AdminPage, SettingsPage
│   └── tests/               # Vitest unit + component tests
├── backend/                 # FastAPI server
│   ├── app/
│   │   ├── main.py          # API endpoints + auth
│   │   ├── stats.py         # Gamification data layer (XP, levels, streaks)
│   │   ├── extractor.py     # URL content extraction
│   │   ├── splitter/        # Text → segment splitting
│   │   └── store.py         # JSON file persistence
│   └── tests/               # pytest integration tests
└── package.json             # Dev script orchestration
```

## Getting Started

### Prerequisites

- Node.js >= 18
- Python >= 3.11

### Install

```bash
# Frontend
cd frontend && npm install && cd ..

# Backend
cd backend && pip install -e ".[dev]" && cd ..
```

### Run

```bash
npm run dev
```

Frontend runs at `http://localhost:5173`, backend at `http://localhost:8000`.

### Test

```bash
npm test
```

## Configuration

### Application Settings

访问设置页面 (`/settings`) 可配置：

- **打字模式** — 普通打字 / 拼音输入
- **跳过标点** — 打字时是否忽略标点符号
- **跳过限制** — 每篇素材最多可 Skip 几段

### Admin Auth

管理页面 (`/admin`) 需要密码认证。密码通过设置页面配置，服务端以 token 验证。

### LLM Integration

AI 生成功能需要一个 OpenAI-compatible LLM API：

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `LLM_BASE_URL` | `https://api.deepseek.com` | API base URL |
| `LLM_API_KEY` | — | API Key（也可在设置页面配置） |
| `LLM_MODEL` | `deepseek-v4-flash` | 模型名称 |

```bash
LLM_API_KEY=your-key-here npm run dev
```

## Author

DarkSun ([@lujun9972](https://github.com/lujun9972))
