<template>
  <div>
    <!-- Empty state -->
    <div v-if="materials.length === 0 && !loading" class="empty-state">
      <h1>Type Practice</h1>
      <p>暂无素材，请先<router-link to="/admin">添加素材</router-link></p>
    </div>

    <!-- Material browser -->
    <div v-else-if="!activeMaterial" class="material-browser">
      <h1>选择素材</h1>

      <!-- URL input -->
      <form class="url-form" @submit.prevent="onFetchUrl">
        <input
          name="url"
          v-model="urlInput"
          placeholder="粘贴 URL 开始练习..."
          :disabled="fetching"
        />
        <button type="submit" :disabled="fetching || !urlInput">
          {{ fetching ? "抓取中..." : "开始" }}
        </button>
      </form>

      <!-- Topic generate -->
      <form class="topic-form" @submit.prevent="onGenerate">
        <input
          name="topic"
          v-model="topicInput"
          placeholder="输入话题，AI 生成练习..."
          :disabled="generating"
        />
        <select v-model="topicLang" :disabled="generating">
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>
        <select v-model="topicLength" :disabled="generating">
          <option value="auto">自动</option>
          <option value="short">短</option>
          <option value="medium">中</option>
          <option value="long">长</option>
        </select>
        <button type="submit" :disabled="generating || !topicInput">
          {{ generating ? "生成中..." : "生成" }}
        </button>
      </form>

      <div v-if="activeTag" class="active-filter">
        筛选：<span class="tag active" @click="clearFilter">{{ activeTag }} ✕</span>
      </div>
      <div v-if="error" class="error-banner">{{ error }}</div>
      <div class="material-cards">
        <div
          v-for="mat in filteredMaterials"
          :key="mat.id"
          class="material-card"
          @click="onSelect(mat)"
        >
          <h3>{{ mat.title }}</h3>
          <div class="tags">
            <span
              v-for="tag in mat.tags"
              :key="tag"
              class="tag"
              :class="{ active: tag === activeTag }"
              @click.stop="onTagClick(tag)"
            >{{ tag }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Typing session -->
    <div v-else>
      <button class="btn-back" @click="onBack">← 返回</button>
      <TypingSession :segments="activeMaterial.segments" @complete="onComplete" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { listMaterials, getMaterial, fetchUrl, fetchTopic } from "@/api/materials";
import type { Material } from "@/api/materials";
import TypingSession from "@/components/TypingSession.vue";

const materials = ref<Material[]>([]);
const activeMaterial = ref<Material | null>(null);
const activeTag = ref("");
const urlInput = ref("");
const fetching = ref(false);
const topicInput = ref("");
const topicLang = ref("zh");
const topicLength = ref("auto");
const generating = ref(false);
const loading = ref(false);
const error = ref("");

const filteredMaterials = computed(() => {
  if (!activeTag.value) return materials.value;
  return materials.value.filter((m) => m.tags.includes(activeTag.value));
});

async function refresh() {
  try {
    loading.value = true;
    error.value = "";
    materials.value = await listMaterials();
  } catch (e) {
    error.value = "加载失败：" + (e instanceof Error ? e.message : String(e));
  } finally {
    loading.value = false;
  }
}

onMounted(refresh);

function onTagClick(tag: string) {
  activeTag.value = activeTag.value === tag ? "" : tag;
}

function clearFilter() {
  activeTag.value = "";
}

async function onSelect(mat: Material) {
  try {
    error.value = "";
    if (mat.segments && mat.segments.length > 0) {
      activeMaterial.value = mat;
    } else {
      activeMaterial.value = await getMaterial(mat.id);
    }
  } catch (e) {
    error.value = "加载素材失败：" + (e instanceof Error ? e.message : String(e));
  }
}

async function onFetchUrl() {
  if (!urlInput.value) return;
  try {
    fetching.value = true;
    error.value = "";
    activeMaterial.value = await fetchUrl(urlInput.value);
  } catch (e) {
    error.value = "抓取失败：" + (e instanceof Error ? e.message : String(e));
  } finally {
    fetching.value = false;
  }
}

async function onGenerate() {
  if (!topicInput.value) return;
  try {
    generating.value = true;
    error.value = "";
    activeMaterial.value = await fetchTopic(topicInput.value, topicLang.value, topicLength.value);
  } catch (e) {
    error.value = "生成失败：" + (e instanceof Error ? e.message : String(e));
  } finally {
    generating.value = false;
  }
}

function onBack() {
  activeMaterial.value = null;
}

function onComplete() {
  alert("全部完成！");
}
</script>

<style scoped>
h1 {
  text-align: center;
  margin-bottom: 1rem;
}

.error-banner {
  padding: 0.75rem;
  background: #7f1d1d;
  border-radius: 6px;
  color: #fca5a5;
  margin-bottom: 1rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #888;
}

.empty-state a {
  color: #93c5fd;
}

.material-cards {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.material-card {
  padding: 1rem;
  background: #1e293b;
  border: 1px solid #333;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.material-card:hover {
  border-color: #3b82f6;
}

.material-card h3 {
  margin: 0 0 0.5rem;
}

.tags {
  display: flex;
  gap: 0.4rem;
}

.tag {
  padding: 0.15rem 0.5rem;
  background: #2a2a4a;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #93c5fd;
  cursor: pointer;
}

.tag.active {
  background: #1e3a5f;
  border: 1px solid #3b82f6;
}

.active-filter {
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #aaa;
  font-size: 0.9rem;
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

.url-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.url-form input {
  flex: 1;
  padding: 0.5rem;
  background: #2a2a4a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #eee;
  font-size: 1rem;
}

.url-form button {
  padding: 0.5rem 1rem;
  background: #1e3a5f;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  color: #93c5fd;
  cursor: pointer;
}

.url-form button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.topic-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.topic-form input {
  flex: 1;
  min-width: 150px;
  padding: 0.5rem;
  background: #2a2a4a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #eee;
  font-size: 1rem;
}

.topic-form select {
  padding: 0.5rem;
  background: #2a2a4a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #eee;
}

.topic-form button {
  padding: 0.5rem 1rem;
  background: #1e3a5f;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  color: #93c5fd;
  cursor: pointer;
}

.topic-form button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
