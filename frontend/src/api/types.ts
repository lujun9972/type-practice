/** Shared type definitions for the type-practice API. */

export interface Segment {
  type: string;
  content?: string;
  url?: string;
  position?: number;
  startTimeMs?: number;
  endTimeMs?: number;
}

export interface Material {
  id: string;
  title: string;
  tags: string[];
  content: string;
  segments: Segment[];
  videoUrl?: string;
}

export interface TopicOptions {
  language: string;
  lengthAuto: boolean;
  lengthMin?: number;
  lengthMax?: number;
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

export interface ExportRequest {
  mode: "all" | "tags" | "ids";
  tags?: string[];
  ids?: string[];
}

export interface ExportData {
  version: number;
  exportedAt: string;
  materials: { id: string; title: string; tags: string[]; content: string }[];
}

export interface ImportConflict {
  index: number;
  imported: { id: string; title: string; tags: string[]; content: string };
  local: { id: string; title: string; tags: string[]; content: string };
}

export interface ImportNewItem {
  index: number;
  material: { id: string; title: string; tags: string[]; content: string };
}

export interface ImportDetectResult {
  upload_id: string;
  total: number;
  conflicts: ImportConflict[];
  new: ImportNewItem[];
}

export interface ImportResolveResult {
  imported: number;
  skipped: number;
  updated: number;
  total: number;
}
