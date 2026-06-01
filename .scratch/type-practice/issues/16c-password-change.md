## Parent

Issue 16: Admin Password Protection

## What to build

在设置页面添加修改密码功能。后端新增 `PUT /api/auth/password` 端点，验证当前密码后更新哈希。设置页面添加"修改密码"区域，需要输入当前密码和新密码。

**新端点：**
- `PUT /api/auth/password` — Body: `{ currentPassword: string, newPassword: string }`。验证当前密码正确后，重新生成 salt 并存储新哈希。需要 token。

**前端行为：**
- SettingsPage 已认证状态下显示"修改密码"区域
- 两个字段：当前密码 + 新密码
- 提交后验证，成功显示提示，失败显示错误

## Acceptance criteria

- [ ] `PUT /api/auth/password` 当前密码正确时更新成功
- [ ] `PUT /api/auth/password` 当前密码错误时返回 401
- [ ] `PUT /api/auth/password` 无 token 时返回 401
- [ ] 修改密码后旧 token 仍然有效
- [ ] 修改密码后能用新密码登录
- [ ] 设置页面显示修改密码表单
- [ ] 修改密码成功/失败有明确反馈

## Blocked by

- Issue 16a: Auth API + Admin Page Gate
