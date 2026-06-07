/** Auth API — login, setup, token management. */
const API_BASE = "/api";

export function authHeader(): Record<string, string> {
  const token = sessionStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getAuthStatus(): Promise<{ passwordSet: boolean }> {
  const res = await fetch(`${API_BASE}/auth/status`);
  return res.json();
}

export async function authSetup(password: string): Promise<{ token: string }> {
  const res = await fetch(`${API_BASE}/auth/setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Setup failed (${res.status})`);
  }
  return res.json();
}

export async function authLogin(password: string): Promise<{ token: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Login failed (${res.status})`);
  }
  return res.json();
}

export function setToken(token: string): void {
  sessionStorage.setItem("auth_token", token);
}

export function clearToken(): void {
  sessionStorage.removeItem("auth_token");
}

export function getToken(): string | null {
  return sessionStorage.getItem("auth_token");
}

export async function authChangePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Password change failed (${res.status})`);
  }
}
