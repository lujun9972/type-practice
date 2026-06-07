<template>
  <div class="admin-page">
    <h1>素材管理</h1>

    <!-- Error banner -->
    <div v-if="error" class="error-banner">{{ error }}</div>

    <!-- Auth gate -->
    <AuthGate ref="authGateRef" @authenticated="onAuthenticated" @error="(msg: string) => { error = msg }" />

    <template v-if="authenticated">
    <!-- Detail view -->
    <div v-if="detailMaterial && !editingMaterial" class="detail-view">
      <button class="btn-back" @click="detailMaterial = null">← 返回列表</button>
      <h2>{{ detailMaterial.title }}</h2>
      <div class="detail-tags">
        <span v-for="tag in detailMaterial.tags" :key="tag" class="tag">{{ tag }}</span>
      </div>
      <div class="detail-content">{{ detailMaterial.content }}</div>
      <div class="detail-meta">{{ detailMaterial.content.length }} 字</div>
      <div class="detail-segments">
        <h3>分段（{{ detailMaterial.segments.length }} 段）</h3>
        <div v-for="(seg, i) in detailMaterial.segments" :key="i" class="preview-segment">
          {{ seg.content }}
        </div>
      </div>
      <div class="detail-actions">
        <button class="btn-edit" @click="onEdit(detailMaterial)">编辑</button>
        <button v-if="pendingDeleteId !== detailMaterial.id" class="btn-delete" @click="requestDelete(detailMaterial.id)">删除</button>
        <template v-else>
          <span class="confirm-hint">确定删除？</span>
          <button class="btn-confirm-action" @click="confirmDelete">确定</button>
          <button class="btn-cancel-action" @click="cancelDelete">取消</button>
        </template>
      </div>
    </div>

    <!-- Edit form -->
    <div v-if="editingMaterial" class="detail-view">
      <button class="btn-back" @click="editingMaterial = null">← 取消编辑</button>
      <form class="edit-form" @submit.prevent="onSaveEdit">
        <div>
          <label>标题</label>
          <input name="title" v-model="editForm.title" required />
        </div>
        <div>
          <label>标签（逗号分隔）</label>
          <input name="tags" v-model="editForm.tags" />
        </div>
        <div v-if="editHasImages">
          <label>内容（含图片，不可编辑）</label>
          <div class="edit-content-readonly">{{ editForm.content }}</div>
        </div>
        <div v-else>
          <label>内容</label>
          <textarea name="content" v-model="editForm.content" rows="4" required></textarea>
        </div>
        <div class="form-actions">
          <button type="submit" :disabled="loading">{{ loading ? "保存中..." : "保存" }}</button>
          <button type="button" @click="editingMaterial = null">取消</button>
        </div>
      </form>
    </div>

    <!-- Material list -->
    <div v-else>
      <div v-if="materials.length === 0 && !loading" class="empty">暂无素材</div>
      <MaterialBrowser
        v-else
        :materials="materials"
        @select="onView"
      >
        <template #card-actions="{ material }">
          <input
            v-if="showExportPanel && exportMode === 'ids'"
            type="checkbox"
            :value="material.id"
            v-model="exportSelectedIds"
            @click.stop
            class="export-checkbox"
          />
          <button v-if="pendingDeleteId !== material.id" class="btn-delete" @click.stop="requestDelete(material.id)">删除</button>
          <template v-else>
            <button class="btn-confirm-action" @click.stop="confirmDelete">确定删除</button>
            <button class="btn-cancel-action" @click.stop="cancelDelete">取消</button>
          </template>
        </template>
      </MaterialBrowser>
    </div>

    <!-- Export / Import controls -->
    <div class="import-export-bar">
      <button class="btn-export-toggle" @click="showExportPanel = !showExportPanel; showImportPanel = false">
        {{ showExportPanel ? "关闭导出" : "导出" }}
      </button>
      <button class="btn-import-toggle" @click="showImportPanel = !showImportPanel; showExportPanel = false">
        {{ showImportPanel ? "关闭导入" : "导入" }}
      </button>
    </div>

    <!-- Export panel -->
    <div v-if="showExportPanel" class="export-panel">
      <div class="export-mode-row">
        <label>
          <input type="radio" v-model="exportMode" value="all" /> 全部
        </label>
        <label>
          <input type="radio" v-model="exportMode" value="tags" /> 按标签
        </label>
        <label>
          <input type="radio" v-model="exportMode" value="ids" /> 手动选择
        </label>
      </div>

      <div v-if="exportMode === 'tags'" class="tag-filter-row">
        <label v-for="tag in allTags" :key="tag" class="tag-chip-label">
          <input type="checkbox" :value="tag" v-model="exportTagFilter" />
          <span class="tag">{{ tag }}</span>
        </label>
      </div>

      <div v-if="exportMode === 'ids'" class="select-all-row">
        <label>
          <input type="checkbox" v-model="exportSelectAll" @change="toggleExportSelectAll" />
          全选 / 取消全选
        </label>
      </div>

      <button class="btn-confirm-export" @click="onExport" :disabled="loading">
        {{ loading ? "导出中..." : "确认导出" }}
      </button>
    </div>

    <!-- Import panel -->
    <div v-if="showImportPanel" class="import-panel">
      <div class="import-file-row">
        <input
          type="file"
          accept=".json"
          @change="onImportFileSelect"
          class="import-file-input"
          :disabled="loading"
        />
      </div>

      <div v-if="importSummary" class="import-summary">
        {{ importSummary }}
      </div>

      <div v-if="importMissingVideos.length > 0" class="missing-videos-panel">
        <h4>视频素材需要重新上传</h4>
        <p class="missing-videos-hint">以下素材关联的视频文件未包含在导入中，请上传视频文件或跳过。</p>
        <div v-for="mat in importMissingVideos" :key="mat.id" class="missing-video-row">
          <span class="missing-video-title">{{ mat.title }} <small>({{ mat.videoUrl }})</small></span>
          <div class="file-input-wrapper-sm">
            <input
              type="file"
              accept="video/*"
              @change="(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) onReuploadVideo(mat, f); (e.target as HTMLInputElement).value = ''; }"
              :disabled="loading"
              class="file-input-overlay"
            />
            <span class="file-select-btn file-select-btn-sm">选择视频文件</span>
          </div>
          <button type="button" class="btn-skip-reupload" @click="onSkipReupload(mat)">跳过</button>
        </div>
      </div>
    </div>

    <!-- Conflict resolution dialog -->
    <div v-if="importConflicts.length > 0 && importCurrentConflictIdx < importConflicts.length" class="conflict-dialog">
      <h3>素材冲突 ({{ importCurrentConflictIdx + 1 }}/{{ importConflicts.length }})</h3>
      <div class="conflict-sides">
        <div class="conflict-side">
          <h4>本地版本</h4>
          <div class="conflict-field"><strong>标题:</strong> {{ importConflicts[importCurrentConflictIdx].local.title }}</div>
          <div class="conflict-field"><strong>标签:</strong> {{ importConflicts[importCurrentConflictIdx].local.tags.join(", ") || "无" }}</div>
          <div class="conflict-field"><strong>内容:</strong> {{ importConflicts[importCurrentConflictIdx].local.content.slice(0, 100) }}{{ importConflicts[importCurrentConflictIdx].local.content.length > 100 ? "..." : "" }}</div>
        </div>
        <div class="conflict-side">
          <h4>导入版本</h4>
          <div class="conflict-field"><strong>标题:</strong> {{ importConflicts[importCurrentConflictIdx].imported.title }}</div>
          <div class="conflict-field"><strong>标签:</strong> {{ importConflicts[importCurrentConflictIdx].imported.tags.join(", ") || "无" }}</div>
          <div class="conflict-field"><strong>内容:</strong> {{ importConflicts[importCurrentConflictIdx].imported.content.slice(0, 100) }}{{ importConflicts[importCurrentConflictIdx].imported.content.length > 100 ? "..." : "" }}</div>
        </div>
      </div>
      <div class="conflict-actions">
        <button class="btn-keep-local" @click="onConflictDecision('keep_local')">保留本地</button>
        <button class="btn-use-imported" @click="onConflictDecision('use_imported')">使用导入的</button>
        <button class="btn-keep-both" @click="onConflictDecision('keep_both')">两个都保留</button>
      </div>
    </div>

    <!-- Create form -->
    <h2>添加素材</h2>
    <div class="create-mode-toggle">
      <button
        :class="{ active: createMode === 'text' }"
        @click="createMode = 'text'"
      >文本素材</button>
      <button
        :class="{ active: createMode === 'video' }"
        @click="createMode = 'video'"
      >视频素材</button>
    </div>

    <!-- Text create form -->
    <TextMaterialForm v-if="createMode === 'text'" @created="onCreated" @error="(msg: string) => { error = msg }" />

    <!-- Video create form -->
    <VideoMaterialForm v-if="createMode === 'video'" @created="onCreated" @error="(msg: string) => { error = msg }" />

    <!-- URL fetch -->
    <h2>URL 抓取</h2>
    <form class="url-fetch-form" @submit.prevent="onFetchUrl">
      <div class="fetch-row">
        <input name="admin-url" v-model="urlInput" placeholder="输入 URL..." :disabled="loading" />
        <button type="submit" :disabled="loading || !urlInput">{{ loading ? "抓取中..." : "抓取" }}</button>
      </div>
    </form>

    <!-- AI generate -->
    <h2>AI 生成</h2>
    <form class="topic-gen-form" @submit.prevent="onGenerate">
      <div class="fetch-row">
        <input name="admin-topic" v-model="topicInput" placeholder="输入话题..." :disabled="loading" />
        <select v-model="topicLang" :disabled="loading">
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>
        <label class="auto-label">
          <input type="checkbox" v-model="topicAuto" />
          自动字数
        </label>
        <template v-if="!topicAuto">
          <input type="number" v-model.number="topicMin" placeholder="最少" class="length-input" />
          <span class="length-sep">~</span>
          <input type="number" v-model.number="topicMax" placeholder="最多" class="length-input" />
        </template>
        <button type="submit" :disabled="loading || !topicInput">{{ loading ? "生成中..." : "生成" }}</button>
      </div>
    </form>

    <!-- Fetch/generate preview -->
    <MaterialPreview
      v-if="previewMaterial"
      :material="previewMaterial"
      @saved="onSavePreview"
      @discard="previewMaterial = null"
      @error="(msg: string) => { error = msg }"
    />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import {
  listMaterials,
  deleteMaterial,
  updateMaterial,
  fetchUrl,
  fetchTopic,
  exportMaterials,
  importMaterials,
  importResolve,
  getToken,
  clearToken,
} from "@/api/materials";
import type { Material, ExportRequest, ImportConflict } from "@/api/materials";
import MaterialBrowser from "@/components/MaterialBrowser.vue";
import AuthGate from "@/components/admin/AuthGate.vue";
import TextMaterialForm from "@/components/admin/TextMaterialForm.vue";
import VideoMaterialForm from "@/components/admin/VideoMaterialForm.vue";
import MaterialPreview from "@/components/admin/MaterialPreview.vue";

const materials = ref<Material[]>([]);
const loading = ref(false);
const error = ref("");
const detailMaterial = ref<Material | null>(null);
const editingMaterial = ref<Material | null>(null);
const editForm = reactive({ title: "", tags: "", content: "" });
const authenticated = ref(false);
const authGateRef = ref<InstanceType<typeof AuthGate> | null>(null);
const pendingDeleteId = ref<string | null>(null);
const createMode = ref<"text" | "video">("text");
const urlInput = ref("");
const topicInput = ref("");
const topicLang = ref("zh");
const topicAuto = ref(true);
const topicMin = ref<number | undefined>(undefined);
const topicMax = ref<number | undefined>(undefined);
const previewMaterial = ref<Material | null>(null);

// ── Export state ──
const exportMode = ref<"all" | "tags" | "ids">("all");
const exportTagFilter = ref<string[]>([]);
const exportSelectedIds = ref<string[]>([]);
const exportSelectAll = ref(false);
const showExportPanel = ref(false);

// ── Import state ──
const showImportPanel = ref(false);
const importUploadId = ref("");
const importConflicts = ref<ImportConflict[]>([]);
const importConflictDecisions = ref<Record<number, "keep_local" | "use_imported" | "keep_both">>({});
const importCurrentConflictIdx = ref(0);
const importNewCount = ref(0);
const importTotal = ref(0);
const importSummary = ref<string | null>(null);
const importMissingVideos = ref<Material[]>([]);

const editHasImages = computed(() =>
  editingMaterial.value?.segments.some((s) => s.type === "image") ?? false,
);

const allTags = computed(() => {
  const tagSet = new Set<string>();
  for (const m of materials.value) {
    for (const t of m.tags) tagSet.add(t);
  }
  return Array.from(tagSet).sort();
});

function handleAuthError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("Invalid token") || msg.includes("Not authenticated")) {
    clearToken();
    authenticated.value = false;
  }
  return msg;
}

async function refresh() {
  try {
    error.value = "";
    materials.value = await listMaterials();
  } catch (e) {
    error.value = "加载素材列表失败：" + (e instanceof Error ? e.message : String(e));
  }
}

function onAuthenticated() {
  authenticated.value = true;
  refresh();
}

async function onView(mat: Material) {
  detailMaterial.value = mat;
}

function onEdit(mat: Material) {
  editingMaterial.value = mat;
  editForm.title = mat.title;
  editForm.tags = mat.tags.join(", ");
  editForm.content = mat.content;
}

async function onSaveEdit() {
  if (!editingMaterial.value) return;
  try {
    loading.value = true;
    error.value = "";
    const payload: Record<string, unknown> = {
      title: editForm.title,
      tags: editForm.tags,
      content: editForm.content,
    };
    if (editHasImages.value) {
      payload.segments = editingMaterial.value.segments;
    }
    const updated = await updateMaterial(editingMaterial.value.id, payload);
    editingMaterial.value = null;
    detailMaterial.value = updated;
    await refresh();
    const found = materials.value.find((m) => m.id === updated.id);
    if (found) detailMaterial.value = found;
  } catch (e) {
    error.value = "保存失败：" + handleAuthError(e);
  } finally {
    loading.value = false;
  }
}

async function onCreated() {
  await refresh();
}

function requestDelete(id: string) {
  pendingDeleteId.value = id;
}

function cancelDelete() {
  pendingDeleteId.value = null;
}

async function confirmDelete() {
  const id = pendingDeleteId.value;
  if (!id) return;
  pendingDeleteId.value = null;
  try {
    error.value = "";
    await deleteMaterial(id);
    if (detailMaterial.value?.id === id) {
      detailMaterial.value = null;
    }
    await refresh();
  } catch (e) {
    error.value = "删除失败：" + handleAuthError(e);
  }
}

async function onFetchUrl() {
  if (!urlInput.value) return;
  try {
    loading.value = true;
    error.value = "";
    const mat = await fetchUrl(urlInput.value);
    previewMaterial.value = mat;
  } catch (e) {
    error.value = "抓取失败：" + handleAuthError(e);
  } finally {
    loading.value = false;
  }
}

async function onGenerate() {
  if (!topicInput.value) return;
  try {
    loading.value = true;
    error.value = "";
    const mat = await fetchTopic(topicInput.value, {
      language: topicLang.value,
      lengthAuto: topicAuto.value,
      lengthMin: topicMin.value,
      lengthMax: topicMax.value,
    });
    previewMaterial.value = mat;
  } catch (e) {
    error.value = "生成失败：" + handleAuthError(e);
  } finally {
    loading.value = false;
  }
}

async function onSavePreview() {
  // Handled by MaterialPreview component — just clear and refresh
  previewMaterial.value = null;
  urlInput.value = "";
  topicInput.value = "";
  await refresh();
}

// ── Export methods ──
async function onExport() {
  try {
    loading.value = true;
    error.value = "";
    const req: ExportRequest = { mode: exportMode.value };
    if (exportMode.value === "tags") {
      req.tags = exportTagFilter.value;
    } else if (exportMode.value === "ids") {
      req.ids = exportSelectedIds.value;
    }
    const data = await exportMaterials(req);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "materials-export.json";
    a.click();
    URL.revokeObjectURL(url);
    showExportPanel.value = false;
  } catch (e) {
    error.value = "导出失败：" + handleAuthError(e);
  } finally {
    loading.value = false;
  }
}

function toggleExportSelectAll() {
  if (exportSelectAll.value) {
    exportSelectedIds.value = materials.value.map((m) => m.id);
  } else {
    exportSelectedIds.value = [];
  }
}

// ── Import methods ──
function onImportFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  handleImportFile(file);
  input.value = "";
}

async function handleImportFile(file: File) {
  try {
    loading.value = true;
    error.value = "";
    importSummary.value = null;
    const result = await importMaterials(file);
    importUploadId.value = result.upload_id;
    importTotal.value = result.total;
    importNewCount.value = result.new.length;
    importConflicts.value = result.conflicts;
    importConflictDecisions.value = {};
    importCurrentConflictIdx.value = 0;

    if (result.conflicts.length === 0) {
      await doImportResolve();
    }
  } catch (e) {
    error.value = "导入失败：" + handleAuthError(e);
  } finally {
    loading.value = false;
  }
}

async function onConflictDecision(action: "keep_local" | "use_imported" | "keep_both") {
  const conflict = importConflicts.value[importCurrentConflictIdx.value];
  importConflictDecisions.value[conflict.index] = action;
  importCurrentConflictIdx.value++;

  if (importCurrentConflictIdx.value >= importConflicts.value.length) {
    await doImportResolve();
  }
}

async function doImportResolve() {
  const decisions = Object.entries(importConflictDecisions.value).map(([idx, action]) => ({
    index: Number(idx),
    action,
  }));
  const result = await importResolve(importUploadId.value, decisions);
  importSummary.value = `导入完成: ${result.imported} 条导入, ${result.skipped} 条跳过, ${result.updated} 条更新`;
  importConflicts.value = [];
  importCurrentConflictIdx.value = 0;
  await refresh();
  importMissingVideos.value = materials.value.filter((m) => m.videoUrl);
}

async function onReuploadVideo(mat: Material, file: File) {
  try {
    loading.value = true;
    error.value = "";
    const formData = new FormData();
    formData.append("video", file);
    const token = getToken();
    const res = await fetch(`/api/materials/${mat.id}/video`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || `上传失败 (${res.status})`);
    }
    importMissingVideos.value = importMissingVideos.value.filter((m) => m.id !== mat.id);
    await refresh();
  } catch (e) {
    error.value = "视频上传失败：" + handleAuthError(e);
  } finally {
    loading.value = false;
  }
}

function onSkipReupload(mat: Material) {
  importMissingVideos.value = importMissingVideos.value.filter((m) => m.id !== mat.id);
}
</script>

<style scoped>
h1, h2 {
  text-align: center;
}

.error-banner {
  padding: 0.75rem;
  background: #7f1d1d;
  border-radius: 6px;
  color: #fca5a5;
  margin-bottom: 1rem;
}

.empty {
  text-align: center;
  color: #888;
  padding: 2rem;
}

.tag {
  padding: 0.15rem 0.5rem;
  background: #2a2a4a;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #93c5fd;
}

.btn-delete {
  margin-left: auto;
  padding: 0.2rem 0.6rem;
  background: #7f1d1d;
  border: none;
  border-radius: 4px;
  color: #fca5a5;
  cursor: pointer;
  font-size: 0.8rem;
}

.confirm-hint {
  color: #fbbf24;
  font-size: 0.85rem;
  margin-right: 0.3rem;
}

.btn-confirm-action {
  padding: 0.2rem 0.6rem;
  background: #7f1d1d;
  border: none;
  border-radius: 4px;
  color: #fca5a5;
  cursor: pointer;
  font-size: 0.8rem;
}

.btn-cancel-action {
  padding: 0.2rem 0.6rem;
  background: #444;
  border: 1px solid #666;
  border-radius: 4px;
  color: #ccc;
  cursor: pointer;
  font-size: 0.8rem;
}

.btn-back {
  background: none;
  border: 1px solid #555;
  border-radius: 6px;
  color: #aaa;
  padding: 0.3rem 0.8rem;
  cursor: pointer;
  margin-bottom: 1rem;
}

.btn-back:hover {
  color: #eee;
  border-color: #888;
}

.detail-view h2 {
  margin: 0 0 0.5rem;
}

.detail-tags {
  margin-bottom: 1rem;
  display: flex;
  gap: 0.4rem;
}

.detail-content {
  padding: 1rem;
  background: #1e293b;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  line-height: 1.8;
  white-space: pre-line;
}

.detail-meta {
  color: #888;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.detail-segments h3 {
  color: #93c5fd;
  margin-bottom: 0.5rem;
}

.detail-actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
}

.btn-edit {
  padding: 0.4rem 1rem;
  background: #1e3a5f;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  color: #93c5fd;
  cursor: pointer;
}

form.edit-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

form label {
  display: block;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
  color: #aaa;
}

form input, form textarea {
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

.preview-segment {
  padding: 0.5rem;
  border-left: 3px solid #3b82f6;
  margin-bottom: 0.5rem;
  color: #ddd;
}

.edit-content-readonly {
  padding: 0.5rem;
  background: #111827;
  border: 1px solid #333;
  border-radius: 6px;
  color: #999;
  line-height: 1.6;
  white-space: pre-line;
}

/* ── Create mode toggle ── */
.create-mode-toggle {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.create-mode-toggle button {
  padding: 0.5rem 1.2rem;
  background: #1e293b;
  border: 1px solid #444;
  border-radius: 6px;
  color: #aaa;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.15s;
}

.create-mode-toggle button.active {
  background: #1e3a5f;
  border-color: #3b82f6;
  color: #93c5fd;
}

.url-fetch-form,
.topic-gen-form {
  margin-bottom: 1rem;
}

.fetch-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.fetch-row input {
  flex: 1;
  min-width: 150px;
  padding: 0.5rem;
  background: #2a2a4a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #eee;
  font-size: 1rem;
}

.fetch-row select {
  padding: 0.5rem;
  background: #2a2a4a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #eee;
}

.fetch-row button {
  padding: 0.5rem 1rem;
  background: #1e3a5f;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  color: #93c5fd;
  cursor: pointer;
  white-space: nowrap;
}

.fetch-row button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auto-label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: #aaa;
  font-size: 0.9rem;
  white-space: nowrap;
}

.auto-label input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
}

.length-input {
  width: 70px !important;
  min-width: 70px !important;
  flex: none !important;
}

.length-sep {
  color: #888;
}

/* ── Export / Import ── */
.import-export-bar {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.btn-export-toggle,
.btn-import-toggle {
  padding: 0.4rem 1rem;
  background: #1e3a5f;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  color: #93c5fd;
  cursor: pointer;
  font-size: 0.9rem;
}

.export-panel,
.import-panel {
  margin-top: 0.75rem;
  padding: 1rem;
  background: #1e293b;
  border: 1px solid #3b82f6;
  border-radius: 8px;
}

.export-mode-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.export-mode-row label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: #ccc;
  cursor: pointer;
}

.tag-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.tag-chip-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
}

.select-all-row {
  margin-bottom: 0.75rem;
  color: #aaa;
}

.select-all-row label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
}

.btn-confirm-export {
  padding: 0.5rem 1rem;
  background: #14532d;
  border: 1px solid #22c55e;
  border-radius: 6px;
  color: #86efac;
  cursor: pointer;
}

.btn-confirm-export:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.export-checkbox {
  margin-right: 0.3rem;
}

.import-file-input {
  font-size: 0.9rem;
  color: #ccc;
}

.import-summary {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: #14532d;
  border-radius: 6px;
  color: #86efac;
}

/* ── Missing video re-upload ── */
.missing-videos-panel {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: #78350f;
  border: 1px solid #f59e0b;
  border-radius: 6px;
}

.missing-videos-panel h4 {
  margin: 0 0 0.3rem;
  color: #fde68a;
}

.missing-videos-hint {
  font-size: 0.85rem;
  color: #fbbf24;
  margin: 0 0 0.75rem;
}

.missing-video-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.missing-video-title {
  font-size: 0.9rem;
  color: #fde68a;
  min-width: 120px;
}

.missing-video-title small {
  color: #d97706;
}

.btn-skip-reupload {
  padding: 0.25rem 0.6rem;
  background: #444;
  border: 1px solid #666;
  border-radius: 4px;
  color: #ccc;
  cursor: pointer;
  font-size: 0.8rem;
}

/* ── Conflict dialog ── */
.conflict-dialog {
  margin-top: 1rem;
  padding: 1rem;
  background: #1e293b;
  border: 2px solid #f59e0b;
  border-radius: 8px;
}

.conflict-dialog h3 {
  margin-top: 0;
  color: #f59e0b;
}

.conflict-sides {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.conflict-side {
  padding: 0.75rem;
  background: #111827;
  border-radius: 6px;
}

.conflict-side h4 {
  margin: 0 0 0.5rem;
  color: #93c5fd;
  font-size: 0.9rem;
}

.conflict-field {
  font-size: 0.85rem;
  color: #ccc;
  margin-bottom: 0.3rem;
}

.conflict-field strong {
  color: #aaa;
}

.conflict-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.btn-keep-local {
  padding: 0.4rem 1rem;
  background: #7f1d1d;
  border: none;
  border-radius: 6px;
  color: #fca5a5;
  cursor: pointer;
}

.btn-use-imported {
  padding: 0.4rem 1rem;
  background: #14532d;
  border: 1px solid #22c55e;
  border-radius: 6px;
  color: #86efac;
  cursor: pointer;
}

.btn-keep-both {
  padding: 0.4rem 1rem;
  background: #1e3a5f;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  color: #93c5fd;
  cursor: pointer;
}

/* ── File input overlay ── */
.file-input-wrapper-sm {
  position: relative;
  overflow: hidden;
  display: inline-block;
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

.file-input-wrapper-sm:hover .file-select-btn {
  border-color: #3b82f6;
  background: #2e2e5a;
}

.file-input-overlay:disabled + .file-select-btn {
  opacity: 0.5;
  cursor: not-allowed;
}

.file-select-btn-sm {
  width: auto;
  padding: 0.3rem 0.6rem;
  font-size: 0.85rem;
}
</style>
