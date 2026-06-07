<script setup lang="ts">
import { ref, reactive } from "vue";
import { getToken } from "@/api/auth";
import type { Segment } from "@/api/types";

const form = reactive({ title: "", tags: "" });
const videoFile = ref<File | null>(null);
const subtitleFile = ref<File | null>(null);
const videoParsedSegments = ref<Segment[]>([]);
const videoConflictMsg = ref("");
const loading = ref(false);

const emit = defineEmits<{
  created: [];
  error: [msg: string];
}>();

function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function onVideoFileSelect(e: Event) {
  const target = e.target as HTMLInputElement;
  videoFile.value = target.files?.[0] ?? null;
  videoConflictMsg.value = "";
  target.value = "";
}

function onSubtitleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement;
  subtitleFile.value = target.files?.[0] ?? null;
  videoParsedSegments.value = [];
  target.value = "";
}

function onRemoveSubtitleSegment(index: number) {
  videoParsedSegments.value.splice(index, 1);
}

function onEditSubtitleSegment(index: number, value: string) {
  videoParsedSegments.value[index] = { ...videoParsedSegments.value[index], content: value };
}

function formatMs(ms?: number): string {
  if (ms === undefined || ms === null) return "--:--";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function onCreateVideo(overwrite = false) {
  if (!videoFile.value || !subtitleFile.value) return;
  try {
    loading.value = true;
    videoConflictMsg.value = "";
    const formData = new FormData();
    formData.append("video", videoFile.value);
    formData.append("subtitle", subtitleFile.value);
    formData.append("title", form.title);
    formData.append("tags", form.tags);

    const query = overwrite ? "?overwrite=true" : "";
    const res = await fetch(`/api/materials/video${query}`, {
      method: "POST",
      headers: { ...authHeader() },
      body: formData,
    });

    if (res.status === 409) {
      const body = await res.json();
      videoConflictMsg.value = body.detail || "文件已存在，是否覆盖？";
      return;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || `上传失败 (${res.status})`);
    }

    const material = await res.json();
    videoParsedSegments.value = material.segments || [];
    form.title = "";
    form.tags = "";
    videoFile.value = null;
    subtitleFile.value = null;
    videoConflictMsg.value = "";
    emit("created");
  } catch (e) {
    const msg = "视频上传失败：" + (e instanceof Error ? e.message : String(e));
    emit("error", msg);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <form class="create-form" @submit.prevent="onCreateVideo()">
    <div>
      <label>标题</label>
      <input name="video-title" v-model="form.title" required />
    </div>
    <div>
      <label>标签（逗号分隔）</label>
      <input name="video-tags" v-model="form.tags" />
    </div>
    <div>
      <label>视频文件</label>
      <div class="file-input-wrapper">
        <input
          type="file"
          accept="video/*"
          @change="onVideoFileSelect"
          :disabled="loading"
          class="file-input-overlay"
        />
        <span class="file-select-btn">{{ videoFile ? videoFile.name : '选择视频文件...' }}</span>
      </div>
    </div>
    <div>
      <label>字幕文件（SRT / VTT）</label>
      <div class="file-input-wrapper">
        <input
          type="file"
          accept=".srt,.vtt"
          @change="onSubtitleFileSelect"
          :disabled="loading"
          class="file-input-overlay"
        />
        <span class="file-select-btn">{{ subtitleFile ? subtitleFile.name : '选择字幕文件...' }}</span>
      </div>
    </div>
    <div v-if="videoConflictMsg" class="conflict-warning">
      {{ videoConflictMsg }}
      <button type="button" @click="videoConflictMsg = ''">取消</button>
      <button type="button" @click="onCreateVideo(true)">覆盖</button>
    </div>
    <div class="form-actions">
      <button type="submit" :disabled="loading || !videoFile || !subtitleFile">
        {{ loading ? "上传中..." : "上传并创建" }}
      </button>
    </div>
  </form>

  <!-- Video subtitle preview with editing -->
  <div v-if="videoParsedSegments.length > 0" class="segment-preview">
    <h3>字幕预览（{{ videoParsedSegments.length }} 条）</h3>
    <div v-for="(seg, i) in videoParsedSegments" :key="i" class="preview-segment video-segment">
      <span class="segment-time">{{ formatMs(seg.startTimeMs) }} → {{ formatMs(seg.endTimeMs) }}</span>
      <input
        class="segment-edit-input"
        :value="seg.content"
        @input="(e) => onEditSubtitleSegment(i, (e.target as HTMLInputElement).value)"
      />
      <button type="button" class="btn-remove-segment" @click="onRemoveSubtitleSegment(i)">删除</button>
    </div>
  </div>
</template>

<style scoped>
form.create-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

form label {
  display: block;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
  color: #aaa;
}

form input {
  width: 100%;
  padding: 0.5rem;
  background: #2a2a4a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #eee;
  font-size: 1rem;
  box-sizing: border-box;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
}

.form-actions button {
  padding: 0.5rem 1rem;
  background: #1e3a5f;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  color: #93c5fd;
  cursor: pointer;
  font-size: 0.9rem;
}

.form-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.segment-preview {
  margin-top: 1rem;
  padding: 1rem;
  background: #1e293b;
  border-radius: 8px;
}

.segment-preview h3 {
  margin-top: 0;
  color: #93c5fd;
}

.preview-segment {
  padding: 0.5rem;
  border-left: 3px solid #3b82f6;
  margin-bottom: 0.5rem;
  color: #ddd;
}

.video-segment {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: nowrap;
}

.segment-time {
  font-size: 0.8rem;
  color: #93c5fd;
  white-space: nowrap;
  min-width: 6rem;
}

.segment-edit-input {
  flex: 1;
  padding: 0.3rem 0.5rem;
  background: #2a2a4a;
  border: 1px solid #444;
  border-radius: 4px;
  color: #eee;
  font-size: 0.9rem;
}

.btn-remove-segment {
  padding: 0.25rem 0.6rem;
  background: #7f1d1d;
  border: none;
  border-radius: 4px;
  color: #fca5a5;
  cursor: pointer;
  font-size: 0.8rem;
  white-space: nowrap;
}

.conflict-warning {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: #78350f;
  border: 1px solid #f59e0b;
  border-radius: 6px;
  color: #fde68a;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.conflict-warning button {
  padding: 0.3rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}

.conflict-warning button:first-of-type {
  background: #444;
  border: 1px solid #666;
  color: #ccc;
}

.conflict-warning button:last-of-type {
  background: #7f1d1d;
  border: 1px solid #f87171;
  color: #fca5a5;
}

.file-input-wrapper {
  position: relative;
  overflow: hidden;
}

.file-input-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 1;
  font-size: 0;
}

.file-input-overlay:disabled {
  cursor: not-allowed;
}

.file-select-btn {
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: #2a2a4a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #ccc;
  font-size: 0.95rem;
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-sizing: border-box;
  transition: border-color 0.15s, background 0.15s;
  pointer-events: none;
}

.file-input-wrapper:hover .file-select-btn {
  border-color: #3b82f6;
  background: #2e2e5a;
}

.file-input-overlay:disabled + .file-select-btn {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
