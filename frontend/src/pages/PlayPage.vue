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
        <label class="auto-label">
          <input type="checkbox" v-model="topicAuto" />
          自动字数
        </label>
        <template v-if="!topicAuto">
          <input
            type="number"
            v-model.number="topicMin"
            placeholder="最少"
            class="length-input"
            :disabled="generating"
          />
          <span class="length-sep">~</span>
          <input
            type="number"
            v-model.number="topicMax"
            placeholder="最多"
            class="length-input"
            :disabled="generating"
          />
        </template>
        <button type="submit" :disabled="generating || !topicInput">
          {{ generating ? "生成中..." : "生成" }}
        </button>
      </form>

      <div v-if="activeTag" class="active-filter">
        筛选：<span class="tag active" @click="clearFilter">{{ activeTag }} ✕</span>
      </div>
      <div v-if="error" class="error-banner">{{ error }}</div>
      <button v-if="filteredMaterials.length > 0" class="btn-random" @click="onRandom">🎲 随机练习</button>
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

    <!-- Progress prompt -->
    <div v-else-if="showPrompt" class="progress-prompt">
      <h2>发现上次进度</h2>
      <p>已完成 {{ savedProgress?.completedSegments.length }} / {{ activeMaterial?.segments.length }} 段</p>
      <button class="btn-continue" @click="onContinue">继续</button>
      <button class="btn-restart" @click="onRestart">重新开始</button>
    </div>

    <!-- Typing session -->
    <div v-else-if="!showCompletion" class="session-area">
      <button class="btn-back" @click="onBack">← 返回</button>
      <div v-if="xpPopup" class="xp-popup">+{{ xpPopup }} XP</div>
      <TypingSession
        :segments="activeMaterial.segments"
        :start-index="startIndex"
        :mode="typingMode"
        @complete="onComplete"
        @segment-complete="onSegmentComplete"
      />
    </div>

    <!-- Completion screen -->
    <div v-else class="completion-screen">
      <h2>全部完成！</h2>
      <div class="xp-earned">
        <span class="xp-icon">⭐</span>
        <span class="xp-amount">+{{ totalXpEarned }} XP</span>
      </div>
      <button class="btn-home" @click="$router.push('/')">返回主页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { listMaterials, getMaterial, fetchUrl, fetchTopic, getProgress, saveProgress, deleteProgress, getConfig } from "@/api/materials";
import type { Material, Progress } from "@/api/materials";
import TypingSession from "@/components/TypingSession.vue";

const materials = ref<Material[]>([]);
const activeMaterial = ref<Material | null>(null);
const activeTag = ref("");
const urlInput = ref("");
const typingMode = ref<"typing" | "pinyin">("typing");
const fetching = ref(false);
const topicInput = ref("");
const topicLang = ref("zh");
const topicAuto = ref(true);
const topicMin = ref<number | undefined>(undefined);
const topicMax = ref<number | undefined>(undefined);
const generating = ref(false);
const loading = ref(false);
const error = ref("");
const savedProgress = ref<Progress | null>(null);
const showPrompt = ref(false);
const completedSegments = ref<number[]>([]);
const segmentResults = ref<{ index: number; accuracy: number; timeMs: number; correctChars: number }[]>([]);
const xpPopup = ref(0);
const showCompletion = ref(false);

const totalXpEarned = computed(() =>
  segmentResults.value.reduce((sum, r) => sum + r.correctChars, 0),
);

const filteredMaterials = computed(() => {
  if (!activeTag.value) return materials.value;
  return materials.value.filter((m) => m.tags.includes(activeTag.value));
});

const startIndex = computed(() => {
  return savedProgress.value?.currentSegmentIndex ?? 0;
});

async function refresh() {
  try {
    loading.value = true;
    error.value = "";
    materials.value = await listMaterials();
    const config = await getConfig();
    typingMode.value = config.typingMode || "typing";
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
    const full = (mat.segments && mat.segments.length > 0) ? mat : await getMaterial(mat.id);
    activeMaterial.value = full;

    const progress = await getProgress(full.id);
    if (progress) {
      savedProgress.value = progress;
      showPrompt.value = true;
    } else {
      savedProgress.value = null;
      showPrompt.value = false;
      completedSegments.value = [];
      segmentResults.value = [];
    }
  } catch (e) {
    error.value = "加载素材失败：" + (e instanceof Error ? e.message : String(e));
  }
}

function onContinue() {
  if (savedProgress.value) {
    completedSegments.value = [...savedProgress.value.completedSegments];
    segmentResults.value = [...savedProgress.value.segmentResults];
  }
  showPrompt.value = false;
}

async function onRestart() {
  if (activeMaterial.value) {
    try {
      await deleteProgress(activeMaterial.value.id);
    } catch { /* ignore */ }
  }
  savedProgress.value = null;
  showPrompt.value = false;
  completedSegments.value = [];
  segmentResults.value = [];
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
    activeMaterial.value = await fetchTopic(topicInput.value, {
      language: topicLang.value,
      lengthAuto: topicAuto.value,
      lengthMin: topicMin.value,
      lengthMax: topicMax.value,
    });
  } catch (e) {
    error.value = "生成失败：" + (e instanceof Error ? e.message : String(e));
  } finally {
    generating.value = false;
  }
}

function onBack() {
  activeMaterial.value = null;
  savedProgress.value = null;
  showPrompt.value = false;
  showCompletion.value = false;
  xpPopup.value = 0;
}

function onRandom() {
  const pool = filteredMaterials.value;
  if (pool.length === 0) return;
  const mat = pool[Math.floor(Math.random() * pool.length)];
  onSelect(mat);
}

function onComplete() {
  showCompletion.value = true;
}

async function onSegmentComplete(result: { index: number; accuracy: number; timeMs: number; correctChars: number }) {
  if (!activeMaterial.value) return;
  completedSegments.value.push(result.index);
  segmentResults.value.push(result);

  const totalTextSegments = activeMaterial.value.segments.filter((s) => s.type === "text").length;
  const nextIndex = result.index + 1;
  const progress: Progress = {
    materialId: activeMaterial.value.id,
    currentSegmentIndex: nextIndex,
    completedSegments: [...completedSegments.value],
    segmentResults: [...segmentResults.value],
    isComplete: nextIndex >= totalTextSegments,
  };

  try {
    await saveProgress(progress);
    // Show per-segment XP popup
    xpPopup.value = result.correctChars;
    setTimeout(() => { xpPopup.value = 0; }, 1500);
  } catch { /* ignore save failures */ }
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
  width: 70px;
  padding: 0.5rem;
  background: #2a2a4a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #eee;
  font-size: 0.9rem;
}

.length-sep {
  color: #888;
  line-height: 2;
}

.session-area {
  position: relative;
}

.xp-popup {
  position: fixed;
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #f59e0b, #f97316);
  color: #fff;
  font-size: 1.8rem;
  font-weight: bold;
  padding: 0.5rem 1.5rem;
  border-radius: 12px;
  animation: xp-float 1.5s ease-out forwards;
  z-index: 100;
  pointer-events: none;
}

@keyframes xp-float {
  0% { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-60px); }
}

.completion-screen {
  text-align: center;
  padding: 3rem 1rem;
}

.completion-screen h2 {
  color: #22c55e;
  font-size: 2rem;
  margin-bottom: 1.5rem;
}

.xp-earned {
  margin-bottom: 2rem;
}

.xp-icon {
  font-size: 2rem;
}

.xp-amount {
  font-size: 2.5rem;
  font-weight: bold;
  color: #fbbf24;
  margin-left: 0.5rem;
}

.btn-home {
  padding: 0.8rem 2rem;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 1.1rem;
  cursor: pointer;
}

.btn-home:hover {
  opacity: 0.9;
}

.btn-random {
  display: block;
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
}

.btn-random:hover {
  opacity: 0.9;
}
</style>
