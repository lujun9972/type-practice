/** Material CRUD, content fetch, and split-preview API. */
import type { Material, Segment, TopicOptions } from "./types";
import { authHeader } from "./auth";

const API_BASE = "/api";

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
  const res = await fetch(`${API_BASE}/materials/${id}`, {
    method: "DELETE",
    headers: authHeader(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Delete failed (${res.status})`);
  }
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
