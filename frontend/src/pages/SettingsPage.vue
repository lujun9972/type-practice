<template>
  <div>
    <h1>设置</h1>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-if="error" class="error-banner">{{ error }}</div>
    <div v-if="saved" class="success-banner">已保存</div>

    <form v-if="config" @submit.prevent="onSave" class="settings-form">
      <fieldset>
        <legend>练习设置</legend>

        <label class="field">
          <input type="checkbox" v-model="config.skipPunctuation" />
          跳过标点符号
        </label>

        <label class="field">
          连续跳过次数上限
          <input type="number" v-model.number="config.skipLimit" min="0" max="20" />
        </label>
      </fieldset>

      <fieldset>
        <legend>LLM 设置</legend>

        <label class="field">
          Base URL
          <input type="text" v-model="config.llm.baseUrl" placeholder="https://api.deepseek.com" />
        </label>

        <label class="field">
          API Key
          <input type="password" v-model="config.llm.apiKey" placeholder="sk-..." />
        </label>

        <label class="field">
          Model
          <input type="text" v-model="config.llm.model" placeholder="deepseek-v4-flash" />
        </label>
      </fieldset>

      <button type="submit" :disabled="saving">
        {{ saving ? "保存中..." : "保存" }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getConfig, updateConfig } from "@/api/materials";
import type { AppConfig } from "@/api/materials";

const config = ref<AppConfig | null>(null);
const loading = ref(false);
const saving = ref(false);
const error = ref("");
const saved = ref(false);

async function refresh() {
  try {
    loading.value = true;
    error.value = "";
    config.value = await getConfig();
  } catch (e) {
    error.value = "加载失败：" + (e instanceof Error ? e.message : String(e));
  } finally {
    loading.value = false;
  }
}

onMounted(refresh);

async function onSave() {
  if (!config.value) return;
  try {
    saving.value = true;
    error.value = "";
    saved.value = false;
    config.value = await updateConfig(config.value);
    saved.value = true;
    setTimeout(() => { saved.value = false; }, 2000);
  } catch (e) {
    error.value = "保存失败：" + (e instanceof Error ? e.message : String(e));
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
h1 {
  text-align: center;
  margin-bottom: 1rem;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

fieldset {
  border: 1px solid #333;
  border-radius: 8px;
  padding: 1rem;
}

legend {
  color: #93c5fd;
  font-weight: bold;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-bottom: 0.75rem;
  color: #ccc;
}

.field input[type="text"],
.field input[type="password"],
.field input[type="number"] {
  padding: 0.5rem;
  background: #2a2a4a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #eee;
  font-size: 1rem;
}

.field input[type="checkbox"] {
  width: 1.2rem;
  height: 1.2rem;
  margin-right: 0.5rem;
  vertical-align: middle;
}

button[type="submit"] {
  padding: 0.6rem 1.5rem;
  background: #1e3a5f;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  color: #93c5fd;
  cursor: pointer;
  font-size: 1rem;
}

button[type="submit"]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-banner {
  padding: 0.75rem;
  background: #7f1d1d;
  border-radius: 6px;
  color: #fca5a5;
  margin-bottom: 1rem;
}

.success-banner {
  padding: 0.75rem;
  background: #14532d;
  border-radius: 6px;
  color: #86efac;
  margin-bottom: 1rem;
}

.loading {
  text-align: center;
  color: #888;
}
</style>
