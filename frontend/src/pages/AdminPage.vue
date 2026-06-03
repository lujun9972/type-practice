<template>
  <div class="admin-page">
    <h1>素材管理</h1>

    <!-- Error banner -->
    <div v-if="error" class="error-banner">{{ error }}</div>

    <!-- Auth gate -->
    <div v-if="!authenticated" class="auth-form-wrapper">
      <form class="auth-form" @submit.prevent="onAuthSubmit">
        <label>{{ passwordSet ? "输入密码" : "设置密码" }}</label>
        <input
          name="auth-password"
          type="password"
          v-model="authPassword"
          :placeholder="passwordSet ? '密码' : '设置管理密码'"
          required
        />
        <button type="submit">{{ passwordSet ? "确认" : "设置" }}</button>
      </form>
    </div>

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
        <button class="btn-delete" @click="onDelete(detailMaterial.id)">删除</button>
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
      <div v-else class="material-list">
        <div v-for="mat in materials" :key="mat.id" class="material-item" @click="onView(mat)">
          <input
            v-if="showExportPanel && exportMode === 'ids'"
            type="checkbox"
            :value="mat.id"
            v-model="exportSelectedIds"
            @click.stop
            class="export-checkbox"
          />
          <span class="title">{{ mat.title }}</span>
          <span v-for="tag in mat.tags" :key="tag" class="tag">{{ tag }}</span>
          <button class="btn-delete" @click.stop="onDelete(mat.id)">删除</button>
        </div>
      </div>
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

      <!-- Import summary -->
      <div v-if="importSummary" class="import-summary">
        {{ importSummary }}
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
    <form class="create-form" @submit.prevent="onCreate">
      <div>
        <label>标题</label>
        <input name="title" v-model="form.title" required />
      </div>
      <div>
        <label>标签（逗号分隔）</label>
        <input name="tags" v-model="form.tags" />
      </div>
      <div>
        <label>内容</label>
        <textarea name="content" v-model="form.content" rows="4" required></textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="preview-btn" @click="onPreview" :disabled="loading">
          {{ loading ? "加载中..." : "预览分段" }}
        </button>
        <button type="submit" :disabled="loading">
          {{ loading ? "创建中..." : "创建" }}
        </button>
      </div>
    </form>

    <!-- Segment preview -->
    <div v-if="previewData.length > 0" class="segment-preview">
      <h3>分段预览（{{ previewData.length }} 段）</h3>
      <div v-for="(seg, i) in previewData" :key="i" class="preview-segment">
        {{ seg.content }}
      </div>
    </div>

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
    <div v-if="previewMaterial" class="fetch-preview">
      <h3>预览</h3>
      <div class="preview-fields">
        <div>
          <label>标题</label>
          <input name="preview-title" v-model="previewForm.title" />
        </div>
        <div>
          <label>标签（逗号分隔）</label>
          <input name="preview-tags" v-model="previewForm.tags" />
        </div>
      </div>
      <div class="preview-content">{{ previewMaterial.content }}</div>
      <div class="preview-segs">
        <div v-for="(seg, i) in previewMaterial.segments" :key="i" class="preview-segment">
          {{ seg.content }}
        </div>
      </div>
      <div class="preview-actions">
        <button class="btn-save-preview" @click="onSavePreview" :disabled="loading">
          {{ loading ? "保存中..." : "保存到素材库" }}
        </button>
        <button class="btn-discard-preview" @click="previewMaterial = null">丢弃</button>
      </div>
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import {
  listMaterials,
  createMaterial,
  deleteMaterial,
  updateMaterial,
  fetchUrl,
  fetchTopic,
  previewSegments as previewSplit,
  getAuthStatus,
  authSetup,
  authLogin,
  setToken,
  clearToken,
  getToken,
  exportMaterials,
  importMaterials,
  importResolve,
} from "@/api/materials";
import type { Material, Segment, ExportRequest, ImportConflict } from "@/api/materials";

const materials = ref<Material[]>([]);
const previewData = ref<Segment[]>([]);
const loading = ref(false);
const error = ref("");
const detailMaterial = ref<Material | null>(null);
const editingMaterial = ref<Material | null>(null);
const editForm = reactive({ title: "", tags: "", content: "" });

const editHasImages = computed(() =>
  editingMaterial.value?.segments.some((s) => s.type === "image") ?? false,
);

function handleAuthError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("Invalid token") || msg.includes("Not authenticated")) {
    clearToken();
    authenticated.value = false;
  }
  return msg;
}

const form = reactive({
  title: "",
  tags: "",
  content: "",
});

const urlInput = ref("");
const topicInput = ref("");
const topicLang = ref("zh");
const topicAuto = ref(true);
const topicMin = ref<number | undefined>(undefined);
const topicMax = ref<number | undefined>(undefined);
const previewMaterial = ref<Material | null>(null);
const previewForm = reactive({ title: "", tags: "" });
const passwordSet = ref(false);
const authenticated = ref(false);
const authPassword = ref("");

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

async function refresh() {
  try {
    error.value = "";
    materials.value = await listMaterials();
  } catch (e) {
    error.value = "加载素材列表失败：" + (e instanceof Error ? e.message : String(e));
  }
}

onMounted(async () => {
  const existingToken = getToken();
  if (existingToken) {
    authenticated.value = true;
  }
  const status = await getAuthStatus();
  passwordSet.value = status.passwordSet;
  if (authenticated.value) {
    await refresh();
  }
});

async function onAuthSubmit() {
  if (!authPassword.value) return;
  try {
    error.value = "";
    let result: { token: string };
    if (passwordSet.value) {
      result = await authLogin(authPassword.value);
    } else {
      result = await authSetup(authPassword.value);
    }
    setToken(result.token);
    authenticated.value = true;
    authPassword.value = "";
    await refresh();
  } catch (e) {
    error.value = "认证失败：" + (e instanceof Error ? e.message : String(e));
  }
}

function onView(mat: Material) {
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

async function onCreate() {
  try {
    loading.value = true;
    error.value = "";
    await createMaterial({
      title: form.title,
      tags: form.tags,
      content: form.content,
    });
    form.title = "";
    form.tags = "";
    form.content = "";
    previewData.value = [];
    await refresh();
  } catch (e) {
    error.value = "创建失败：" + handleAuthError(e);
  } finally {
    loading.value = false;
  }
}

async function onPreview() {
  if (!form.content) return;
  try {
    loading.value = true;
    error.value = "";
    previewData.value = await previewSplit(form.content);
  } catch (e) {
    error.value = "预览失败：" + handleAuthError(e);
  } finally {
    loading.value = false;
  }
}

async function onDelete(id: string) {
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
    previewForm.title = mat.title;
    previewForm.tags = mat.tags.join(", ");
  } catch (e) {
    error.value = "抓取失败：" + handleAuthError(e);
  } finally {
    loading.value = false;
  }
}

// ── Computed ──
const allTags = computed(() => {
  const tagSet = new Set<string>();
  for (const m of materials.value) {
    for (const t of m.tags) tagSet.add(t);
  }
  return Array.from(tagSet).sort();
});

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
    // Trigger download
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
      // No conflicts — auto-resolve
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
    previewForm.title = mat.title;
    previewForm.tags = mat.tags.join(", ");
  } catch (e) {
    error.value = "生成失败：" + handleAuthError(e);
  } finally {
    loading.value = false;
  }
}

async function onSavePreview() {
  if (!previewMaterial.value) return;
  try {
    loading.value = true;
    error.value = "";
    await createMaterial({
      title: previewForm.title,
      tags: previewForm.tags,
      content: previewMaterial.value.content,
      segments: previewMaterial.value.segments,
    });
    previewMaterial.value = null;
    urlInput.value = "";
    topicInput.value = "";
    await refresh();
  } catch (e) {
    error.value = "保存失败：" + handleAuthError(e);
  } finally {
    loading.value = false;
  }
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

.material-item {
  padding: 0.75rem;
  border: 1px solid #333;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  cursor: pointer;
}

.material-item:hover {
  border-color: #3b82f6;
}

.title {
  font-weight: bold;
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

.fetch-preview {
  margin-top: 1rem;
  padding: 1rem;
  background: #1e293b;
  border: 1px solid #3b82f6;
  border-radius: 8px;
}

.fetch-preview h3 {
  margin-top: 0;
  color: #93c5fd;
}

.preview-fields {
  margin-bottom: 1rem;
}

.preview-fields label {
  display: block;
  font-size: 0.85rem;
  color: #aaa;
  margin-bottom: 0.2rem;
}

.preview-fields input {
  width: 100%;
  padding: 0.4rem;
  background: #2a2a4a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #eee;
  font-size: 1rem;
  box-sizing: border-box;
  margin-bottom: 0.5rem;
}

.preview-content {
  padding: 0.75rem;
  background: #111827;
  border-radius: 6px;
  margin-bottom: 0.75rem;
  color: #ddd;
  line-height: 1.6;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-line;
}

.preview-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.btn-save-preview {
  padding: 0.5rem 1rem;
  background: #14532d;
  border: 1px solid #22c55e;
  border-radius: 6px;
  color: #86efac;
  cursor: pointer;
}

.btn-save-preview:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-discard-preview {
  padding: 0.5rem 1rem;
  background: #7f1d1d;
  border: none;
  border-radius: 6px;
  color: #fca5a5;
  cursor: pointer;
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

.auth-form-wrapper {
  display: flex;
  justify-content: center;
  padding: 3rem 0;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 280px;
}

.auth-form label {
  font-size: 1.1rem;
  font-weight: bold;
  text-align: center;
}

.auth-form input {
  padding: 0.5rem;
  background: #2a2a4a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #eee;
  font-size: 1rem;
}

.auth-form button {
  padding: 0.5rem 1rem;
  background: #1e3a5f;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  color: #93c5fd;
  cursor: pointer;
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
</style>
