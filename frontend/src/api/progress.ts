/** Progress and config API. */
import type { AppConfig, Progress } from "./types";
import { authHeader } from "./auth";

const API_BASE = "/api";

export async function getConfig(): Promise<AppConfig> {
  const res = await fetch(`${API_BASE}/config`);
  return res.json();
}

export async function updateConfig(config: AppConfig): Promise<AppConfig> {
  const res = await fetch(`${API_BASE}/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Save failed (${res.status})`);
  }
  return res.json();
}

export async function getProgress(materialId: string): Promise<Progress | null> {
  const res = await fetch(`${API_BASE}/progress/${materialId}`);
  if (res.status === 404) return null;
  return res.json();
}

export async function saveProgress(progress: Progress): Promise<Progress> {
  const res = await fetch(`${API_BASE}/progress/${progress.materialId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(progress),
  });
  return res.json();
}

export async function deleteProgress(materialId: string): Promise<void> {
  await fetch(`${API_BASE}/progress/${materialId}`, {
    method: "DELETE",
    headers: authHeader(),
  });
}
