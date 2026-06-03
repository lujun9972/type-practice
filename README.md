# Type Practice

面向小学生的中英文打字练习游戏。从素材库选择文章，逐段打字练习，实时显示准确率和速度。通过 XP 经验值、等级、连击、每日目标等游戏化机制激励持续练习。

## Features

### 素材管理

- **素材库** — 手动创建、URL 抓取、AI 生成三种方式添加素材，支持查看详情、编辑、删除
- **素材导入导出** — 一键导出为 JSON 文件，支持全部/按标签/手动选择三种导出范围；导入时自动检测冲突，逐个选择保留本地、使用导入的或两个都保留
- **唐诗300首** — 内置300首经典唐诗（白居易、李白、孟浩然、王勃等），开箱即练
- **标签分类** — 按标签筛选素材，随机练习模式一键开始

### 打字练习

- **分段打字** — 文章自动按句号分段，逐段解锁，图片在打完前置段落后显示
- **拼音模式** — 切换到拼音输入模式，练习汉字拼音输入，支持声调显示和 IME 组合处理
- **拼音提示** — 遇到不会读的汉字，点击 Hint 显示拼音（不限次数）
- **随机练习** — 🎲 按钮从当前筛选结果中随机选一篇，增加练习多样性
- **进度保存** — 关闭浏览器后再次打开，提示继续或重新开始

### 内容获取

- **URL 抓取** — 粘贴网页链接，自动提取正文和图片作为打字素材
- **AI 生成** — 输入话题，LLM 自动生成适合小学生的阅读内容，可指定字数范围

### 打字统计

- 每段显示准确率、用时，完成后汇总速度（字/分钟）

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
| Testing | Vitest (frontend, 128 tests) + pytest (backend, 114 tests) |
| Content Extraction | readability + custom extractor |
| Pinyin | pinyin-pro |
| LLM | DeepSeek / OpenAI-compatible API |

## Architecture

```
┌─────────────────┐       ┌─────────────────────────────┐
│   Browser SPA   │       │        FastAPI Server        │
│   (Vue 3)       │──────▶│                              │
│                 │ REST  │  ┌─────┐  ┌──────┐  ┌─────┐ │
│  Pages:         │  API  │  │Store│  │Stats │  │LLM  │ │
│  - Home         │◀──────│  │(JSON│  │Store │  │Proxy│ │
│  - Play         │       │  │ File)│  │(JSON)│  │     │ │
│  - Admin        │       │  └─────┘  └──────┘  └─────┘ │
│  - Settings     │       │                              │
│                 │       │  Auth Middleware (token)      │
└─────────────────┘       └─────────────────────────────┘
```

- **Frontend**: Vue 3 SPA，Vite 开发服务器代理 `/api` 到后端
- **Backend**: FastAPI 单文件应用，JSON 文件持久化，无数据库依赖
- **Auth**: 密码设置后生成 token，受保护端点通过中间件验证
- **Production**: 后端直接 serve 前端 `dist/` 静态文件

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
│   │   ├── main.py          # API endpoints + auth + import/export
│   │   ├── stats.py         # Gamification data layer (XP, levels, streaks)
│   │   ├── extractor.py     # URL content extraction
│   │   ├── splitter/        # Text → segment splitting
│   │   └── store.py         # JSON file persistence
│   ├── data/
│   │   └── tang300-export.json  # 唐诗300首导入文件
│   └── tests/               # pytest integration tests
├── dev.sh                   # Development start/stop script
├── prod.sh                  # Production build & deploy script
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

### Run (Development)

```bash
npm run dev
```

Frontend runs at `http://localhost:5173`, backend at `http://localhost:8000`.

Alternatively, use the dev script:

```bash
./dev.sh start    # Start both servers
./dev.sh status   # Check if running
./dev.sh stop     # Stop both servers
```

### Run (Production)

```bash
./prod.sh build   # Build frontend
./prod.sh start   # Start production server (serves frontend + API on port 8000)
```

### Test

```bash
npm test
```

Runs both backend (pytest) and frontend (Vitest) test suites.

## Configuration

### Application Settings

访问设置页面 (`/settings`) 可配置：

- **打字模式** — 普通打字 / 拼音输入
- **跳过标点** — 打字时是否忽略标点符号
- **跳过限制** — 每篇素材最多可 Skip 几段

### Admin Auth

管理页面 (`/admin`) 需要密码认证。首次访问时设置密码，之后每次需要登录。Token 存储在 `sessionStorage`，关闭标签页即失效。

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

## Security

- **Admin 认证** — 管理页面密码保护，token 存储在服务端内存，重启后清空
- **前端 token** — `sessionStorage` 存储，标签页关闭即失效
- **受保护端点** — 所有写操作（创建/编辑/删除素材、导入导出、修改配置）均需有效 token
- **密码存储** — SHA-256 + salt，不明文存储

## Author

DarkSun ([@lujun9972](https://github.com/lujun9972))
