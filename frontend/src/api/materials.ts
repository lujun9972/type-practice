const API_BASE = "/api";

function authHeader(): Record<string, string> {
  const token = sessionStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface Segment {
  type: string;
  content?: string;
  url?: string;
  position?: number;
}

export interface Material {
  id: string;
  title: string;
  tags: string[];
  content: string;
  segments: Segment[];
}

export async function listMaterials(tag?: string): Promise<Material[]> {
  const params = tag ? `?tag=${encodeURIComponent(tag)}` : "";
  const res = await fetch(`${API_BASE}/materials${params}`);
  return res.json();
}

export async function getMaterial(id: string): Promise<Material> {
  const res = await fetch(`${API_BASE}/materials/${id}`);
  return res.json();
}

export async function createMaterial(data: {
  title: string;
  tags: string;
  content: string;
  segments?: Segment[];
}): Promise<Material> {
  const res = await fetch(`${API_BASE}/materials`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateMaterial(
  id: string,
  data: { title: string; tags: string; content: string; segments?: Segment[] },
): Promise<Material> {
  const res = await fetch(`${API_BASE}/materials/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteMaterial(id: string): Promise<void> {
  await fetch(`${API_BASE}/materials/${id}`, {
    method: "DELETE",
    headers: authHeader(),
  });
}

export async function previewSegments(content: string): Promise<Segment[]> {
  const res = await fetch(`${API_BASE}/split-preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ title: "", tags: "", content }),
  });
  const data = await res.json();
  return data.segments;
}

export async function fetchUrl(url: string): Promise<Material> {
  const res = await fetch(`${API_BASE}/fetch/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Fetch failed (${res.status})`);
  }
  return res.json();
}

export interface TopicOptions {
  language: string;
  lengthAuto: boolean;
  lengthMin?: number;
  lengthMax?: number;
}

export async function fetchTopic(
  topic: string,
  options: TopicOptions,
): Promise<Material> {
  const body: Record<string, unknown> = {
    topic,
    language: options.language,
    length: "auto",
  };
  if (!options.lengthAuto && options.lengthMin != null && options.lengthMax != null) {
    body.lengthMin = options.lengthMin;
    body.lengthMax = options.lengthMax;
  }
  const res = await fetch(`${API_BASE}/fetch/topic`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Generation failed (${res.status})`);
  }
  return res.json();
}

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface AppConfig {
  skipPunctuation: boolean;
  skipLimit: number;
  typingMode: "typing" | "pinyin";
  llm: LlmConfig;
}

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

export interface SegmentResult {
  index: number;
  accuracy: number;
  timeMs: number;
}

export interface Progress {
  materialId: string;
  currentSegmentIndex: number;
  completedSegments: number[];
  segmentResults: SegmentResult[];
  isComplete: boolean;
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

// ── Auth ──────────────────────────────────────────────

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
