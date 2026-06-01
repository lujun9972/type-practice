## Parent

Issue 16: Admin Password Protection

## What to build

将认证保护扩展到设置页面和所有剩余写端点。SettingsPage 加密码表单（复用 useAuth composable）。后端中间件应用到 config 和 progress 的写操作端点。

**新增保护的端点：**
- `PUT /api/config`
- `PUT /api/progress/{id}`
- `DELETE /api/progress/{id}`

**前端行为：**
- SettingsPage 挂载时检查 auth status
- 未认证时显示密码表单（与 AdminPage 相同的流程）
- 已认证时显示正常设置页面

## Acceptance criteria

- [ ] SettingsPage 未认证时显示密码表单
- [ ] SettingsPage 认证后显示正常配置内容
- [ ] `PUT /api/config` 无 token 返回 401
- [ ] `PUT /api/progress/{id}` 无 token 返回 401
- [ ] `DELETE /api/progress/{id}` 无 token 返回 401
- [ ] `GET /api/config` 仍然无需 token（设置页面读取默认配置）
- [ ] AdminPage 的认证状态与 SettingsPage 共享（同一 token）

## Blocked by

- Issue 16a: Auth API + Admin Page Gate
