<template>
  <div class="admin-page">
    <h1>素材管理</h1>

    <!-- Error banner -->
    <div v-if="error" class="error-banner">{{ error }}</div>

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
          <span class="title">{{ mat.title }}</span>
          <span v-for="tag in mat.tags" :key="tag" class="tag">{{ tag }}</span>
          <button class="btn-delete" @click.stop="onDelete(mat.id)">删除</button>
        </div>
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
} from "@/api/materials";
import type { Material, Segment } from "@/api/materials";

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

async function refresh() {
  try {
    error.value = "";
    materials.value = await listMaterials();
  } catch (e) {
    error.value = "加载素材列表失败：" + (e instanceof Error ? e.message : String(e));
  }
}

onMounted(refresh);

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
    error.value = "保存失败：" + (e instanceof Error ? e.message : String(e));
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
    error.value = "创建失败：" + (e instanceof Error ? e.message : String(e));
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
    error.value = "预览失败：" + (e instanceof Error ? e.message : String(e));
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
    error.value = "删除失败：" + (e instanceof Error ? e.message : String(e));
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
    error.value = "抓取失败：" + (e instanceof Error ? e.message : String(e));
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
    previewForm.title = mat.title;
    previewForm.tags = mat.tags.join(", ");
  } catch (e) {
    error.value = "生成失败：" + (e instanceof Error ? e.message : String(e));
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
    error.value = "保存失败：" + (e instanceof Error ? e.message : String(e));
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
</style>
