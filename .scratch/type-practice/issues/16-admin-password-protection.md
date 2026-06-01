# Issue 16: Admin Password Protection

## Problem Statement

管理页面（/admin）和设置页面（/settings）完全公开，任何人都能修改素材、删除内容、更改 LLM 配置。对于一个给小孩用的应用，需要防止孩子误操作管理功能。

## Solution

给管理页面和设置页面加密码保护。首次访问时如果没有设置密码，要求先设一个。之后每次访问需要输入密码验证。密码在后端 config.json 中以哈希形式存储，验证通过后发放 token 存入 sessionStorage，关闭标签页自动失效。

## User Stories

1. As a parent, I want to set a password for the admin and settings pages, so that my child cannot accidentally modify materials or configuration
2. As a parent, when I first visit the admin page with no password set, I want to be prompted to create one, so that the setup flow is natural
3. As a parent, I want to enter my password to unlock the admin page, so that I can manage materials
4. As a parent, I want to enter my password to unlock the settings page, so that I can modify configuration
5. As a parent, I want the password session to expire when I close the browser tab, so that I don't need to manually "log out"
6. As a child, I want to freely access the play page without entering any password, so that I can practice typing without friction
7. As a child, I want to browse and select materials without a password, so that the play experience is uninterrupted
8. As a parent, I want to change my password from the settings page, so that I can update it if needed
9. As a parent, I want read-only API access (listing materials, getting config) to work without authentication, so that the play page loads normally

## Implementation Decisions

### Module 1: Backend Auth API

New endpoints:

- `POST /api/auth/setup` — Set password for the first time (only works when no password exists). Body: `{ password: string }`. Stores bcrypt hash in config.json under `adminPasswordHash` key.
- `POST /api/auth/login` — Verify password and return token. Body: `{ password: string }`. Returns `{ token: string }` on success, 401 on failure.
- `GET /api/auth/status` — Returns `{ passwordSet: boolean }`. Frontend uses this to decide whether to show "set password" or "enter password" form.
- `PUT /api/auth/password` — Change password. Body: `{ currentPassword: string, newPassword: string }`. Requires valid token.

Token is a random hex string (e.g., `secrets.token_hex(32)`), stored in an in-memory set on the server. No external session store needed for single-user mode.

### Module 2: Backend Auth Middleware

A dependency or decorator that checks `Authorization: Bearer <token>` header on protected endpoints.

Protected endpoints (all write operations):

- `POST /api/materials`
- `PUT /api/materials/{id}`
- `DELETE /api/materials/{id}`
- `POST /api/split-preview`
- `POST /api/fetch/url`
- `POST /api/fetch/topic`
- `PUT /api/config`
- `PUT /api/progress/{id}`
- `DELETE /api/progress/{id}`
- `PUT /api/auth/password`

Unprotected endpoints (read-only):

- `GET /api/health`
- `GET /api/config`
- `GET /api/materials`
- `GET /api/materials/{id}`
- `GET /api/progress/{id}`
- `GET /api/auth/status`
- `POST /api/auth/setup`
- `POST /api/auth/login`

### Module 3: Frontend Auth Composable

A Vue composable (`useAuth`) that manages:

- Checking auth status on mount (`GET /api/auth/status`)
- Storing token in `sessionStorage`
- Providing `isAuthenticated` reactive ref
- Providing `login(password)` and `logout()` functions
- Providing `passwordSet` ref (whether initial password has been configured)

### Module 4: Frontend Auth Guard

- AdminPage and SettingsPage check `useAuth` on mount
- If `passwordSet` is false → show "set password" form
- If `passwordSet` is true and not authenticated → show "enter password" form
- If authenticated → show normal page content

### Module 5: Frontend API Client Auth

`materials.ts` API functions attach `Authorization: Bearer <token>` header to all write requests. Token read from `sessionStorage`.

### Password Storage

Password hashed with `hashlib.sha256` (stdlib, no extra dependency). Stored as `adminPasswordHash` key in config.json alongside existing `skipPunctuation`, `skipLimit`, `llm` keys.

Decision: Use `hashlib.sha256` with a random salt rather than bcrypt to avoid adding an external dependency. For a single-user local app this provides sufficient protection.

## Testing Decisions

### What makes a good test

Tests verify behavior through the HTTP API — login, setup, token validation, password change. No testing of internal hash functions directly.

### Modules to test

**Backend (pytest):**
- Auth API: setup, login, status, password change
- Middleware: protected endpoints reject missing/invalid tokens, unprotected endpoints work without tokens
- Edge cases: setup when password already exists, login with wrong password, change password with wrong current password

**Frontend (Vitest):**
- AdminPage: shows password form when not authenticated, shows normal content when authenticated
- SettingsPage: shows password form when not authenticated
- Auth flow: set password → login → access admin → close session

### Prior art

Same pattern as existing `test_materials_api.py` — FastAPI `TestClient` with `autouse` fixture for temp paths.

## Out of Scope

- Multi-user support
- Persistent sessions (cookie-based "remember me")
- Role-based access control
- Rate limiting on login attempts
- Password recovery / reset flow

## Further Notes

- This is Issue 16, continuing the existing issue numbering
- The `split-preview` endpoint is protected because it's used exclusively in the admin create form
- Progress write endpoints are protected to prevent tampering, though this is a lower priority — could be relaxed later
