## Agent skills

### Issue tracker

Issues live as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: CONTEXT.md + docs/adr/ at repo root. See `docs/agents/domain.md`.

## Architecture notes

### Frontend ↔ Backend 配置同步

- `backend/app/main.py` 的 `ConfigUpdate` Pydantic model 和 `CONFIG_DEFAULTS` 必须与前端 `AppConfig` 接口保持一致
- 新增配置字段时三处都要改：`ConfigUpdate` model、`CONFIG_DEFAULTS`、前端 `AppConfig` interface
- 遗漏 `ConfigUpdate` 会导致 Pydantic 静默丢弃字段，前端配置丢失但不报错

### 认证 (Auth)

- Token 存储在服务端内存 (`_valid_tokens` set)，重启后清空
- 前端用 `sessionStorage` 存 token，标签页关闭即失效
- **所有调用受保护端点的 API 函数都必须带 `...authHeader()`**（`PUT /api/config` 是已踩过的坑）
- 前端收到 "Invalid token" 错误时必须清除 token 并重置认证状态，引导用户重新登录
- 受保护端点列表：`_PROTECTED_PREFIXES` 元组，新增写端点时记得同步

### IME 输入处理 (TypingSegment)

- `onKeydown` 中必须检查 `composing` 状态，IME 组合期间的按键（含退格）应交给 IME 处理
- `compositionstart` → 中间 `input` 事件忽略 → `compositionend` 处理提交的文字
- 拼音模式下 `compositionend` 直接清空输入，不处理 IME 结果

### PinyinEngine 设计要点

- 标点/符号：`matchPinyin === ""`，status 为 `"correct"`（绿色），不需要用户输入
- **判断是否需要用户输入用 `matchPinyin !== ""`，不要用 status**（status 会被 input 改变，matchPinyin 不会）
- `_currentTarget()` 和 `_advanceToNext()` 用 `matchPinyin` 过滤，跳过标点
- 退格(backspace)支持跨字回退：当前字 `typedCount === 0` 时回退到上一个已完成的字
- 汉字：`matchPinyin` 为无声调拼音（如 `"ni"`），`pinyin` 为带声调拼音（如 `"nǐ"`，仅显示用）
