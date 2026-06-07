<script setup lang="ts">
import { reactive } from "vue";
import { createMaterial } from "@/api/materials";
import type { Material } from "@/api/types";

const props = defineProps<{ material: Material }>();
const previewForm = reactive({ title: "", tags: "" });
const loading = ref(false);

import { ref } from "vue";

const emit = defineEmits<{
  saved: [];
  discard: [];
  error: [msg: string];
}>();

// Initialize form from material
import { watch } from "vue";
watch(
  () => props.material,
  (mat) => {
    if (mat) {
      previewForm.title = mat.title;
      previewForm.tags = mat.tags.join(", ");
    }
  },
  { immediate: true },
);

async function onSavePreview() {
  if (!props.material) return;
  try {
    loading.value = true;
    await createMaterial({
      title: previewForm.title,
      tags: previewForm.tags,
      content: props.material.content,
      segments: props.material.segments,
    });
    emit("saved");
  } catch (e) {
    emit("error", "保存失败：" + (e instanceof Error ? e.message : String(e)));
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="fetch-preview">
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
    <div class="preview-content">{{ material.content }}</div>
    <div class="preview-segs">
      <div v-for="(seg, i) in material.segments" :key="i" class="preview-segment">
        {{ seg.content }}
      </div>
    </div>
    <div class="preview-actions">
      <button class="btn-save-preview" @click="onSavePreview" :disabled="loading">
        {{ loading ? "保存中..." : "保存到素材库" }}
      </button>
      <button class="btn-discard-preview" @click="emit('discard')">丢弃</button>
    </div>
  </div>
</template>

<style scoped>
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

.preview-segment {
  padding: 0.5rem;
  border-left: 3px solid #3b82f6;
  margin-bottom: 0.5rem;
  color: #ddd;
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
</style>
