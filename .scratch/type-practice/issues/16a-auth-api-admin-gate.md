## Parent

Issue 16: Admin Password Protection

## What to build

实现完整的密码认证路径：后端 auth API（setup、login、status 三个端点）+ 内存 token 管理 + 中间件验证素材写操作 + 前端 useAuth composable + AdminPage 未认证时显示密码表单 + API client 请求附带 Authorization header。

密码用 hashlib.sha256 + 随机 salt 哈希，存储在 config.json 的 `adminPasswordHash` 和 `adminPasswordSalt` 字段。Token 用 secrets.token_hex(32) 生成，存在后端内存 set 中。前端 token 存 sessionStorage。

**Auth endpoints:**
- `GET /api/auth/status` → `{ passwordSet: boolean }`（无保护）
- `POST /api/auth/setup` → `{ token: string }`（无保护，仅当未设密码时可用）
- `POST /api/auth/login` → `{ token: string }`（无保护）

**中间件保护这些端点：**
- `POST /api/materials`
- `PUT /api/materials/{id}`
- `DELETE /api/materials/{id}`
- `POST /api/split-preview`
- `POST /api/fetch/url`
- `POST /api/fetch/topic`

**前端行为：**
- AdminPage 挂载时检查 auth status
- 未设密码 → 显示"设置密码"表单
- 已设密码未认证 → 显示"输入密码"表单
- 已认证 → 显示正常管理页面
- API client 从 sessionStorage 读 token，写请求附带 `Authorization: Bearer <token>`

## Acceptance criteria

- [ ] `GET /api/auth/status` 返回 `{ passwordSet: false }`（初始状态）
- [ ] `POST /api/auth/setup` 设置密码并返回 token，config.json 中存有哈希和 salt
- [ ] `POST /api/auth/setup` 在密码已存在时返回 409
- [ ] `POST /api/auth/login` 密码正确返回 token，错误返回 401
- [ ] 受保护的端点无 token 返回 401，有有效 token 正常工作
- [ ] 未受保护的 GET 端点无需 token 正常工作
- [ ] AdminPage 未认证时显示密码表单，认证后显示正常内容
- [ ] 前端 API 写请求附带 Authorization header
- [ ] 关闭标签页后 sessionStorage 清除，再次访问需重新输入密码

## Blocked by

None - can start immediately
