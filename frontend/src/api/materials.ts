const API_BASE = "/api";

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
}): Promise<Material> {
  const res = await fetch(`${API_BASE}/materials`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateMaterial(
  id: string,
  data: { title: string; tags: string; content: string },
): Promise<Material> {
  const res = await fetch(`${API_BASE}/materials/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteMaterial(id: string): Promise<void> {
  await fetch(`${API_BASE}/materials/${id}`, { method: "DELETE" });
}

export async function previewSegments(content: string): Promise<Segment[]> {
  const res = await fetch(`${API_BASE}/split-preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "", tags: "", content }),
  });
  const data = await res.json();
  return data.segments;
}

export async function fetchUrl(url: string): Promise<Material> {
  const res = await fetch(`${API_BASE}/fetch/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Fetch failed (${res.status})`);
  }
  return res.json();
}

export async function fetchTopic(
  topic: string,
  language: string,
  length: string,
): Promise<Material> {
  const res = await fetch(`${API_BASE}/fetch/topic`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, language, length }),
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
  llm: LlmConfig;
}

export async function getConfig(): Promise<AppConfig> {
  const res = await fetch(`${API_BASE}/config`);
  return res.json();
}

export async function updateConfig(config: AppConfig): Promise<AppConfig> {
  const res = await fetch(`${API_BASE}/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  return res.json();
}
