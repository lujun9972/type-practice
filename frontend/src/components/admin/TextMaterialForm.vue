<script setup lang="ts">
import { ref, reactive } from "vue";
import {
  createMaterial,
  previewSegments as previewSplit,
  getToken,
} from "@/api/materials";
import type { Segment } from "@/api/materials";

const form = reactive({ title: "", tags: "", content: "" });
const previewData = ref<Segment[]>([]);
const loading = ref(false);
const error = ref("");

const emit = defineEmits<{
  created: [];
  error: [msg: string];
}>();

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
    emit("created");
  } catch (e) {
    error.value = "创建失败：" + (e instanceof Error ? e.message : String(e));
    emit("error", error.value);
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
    emit("error", error.value);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
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
</style>
