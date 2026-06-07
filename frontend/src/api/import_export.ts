/** Import / export API. */
import type { ExportRequest, ExportData, ImportDetectResult, ImportResolveResult } from "./types";
import { authHeader } from "./auth";

const API_BASE = "/api";

export async function exportMaterials(req: ExportRequest): Promise<ExportData> {
  const res = await fetch(`${API_BASE}/materials/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Export failed (${res.status})`);
  }
  return res.json();
}

export async function importMaterials(file: File): Promise<ImportDetectResult> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/materials/import`, {
    method: "POST",
    headers: authHeader(),
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Import failed (${res.status})`);
  }
  return res.json();
}

export async function importResolve(
  uploadId: string,
  decisions: { index: number; action: "keep_local" | "use_imported" | "keep_both" }[],
): Promise<ImportResolveResult> {
  const res = await fetch(`${API_BASE}/materials/import/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ upload_id: uploadId, decisions }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Resolve failed (${res.status})`);
  }
  return res.json();
}
