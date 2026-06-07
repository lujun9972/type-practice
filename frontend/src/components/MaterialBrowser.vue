<template>
  <div class="material-browser">
    <div class="search-box">
      <input v-model="searchInput" placeholder="搜索素材..." @input="onSearchInput" @compositionstart="onCompositionStart" @compositionend="onCompositionEnd" />
      <button v-if="searchInput" class="search-clear" @click="onClear">✕</button>
    </div>

    <div v-if="allTags.length > 0" class="tag-bar">
      <button
        v-for="tag in visibleTags"
        :key="tag"
        class="tag-chip"
        :class="{ selected: selectedTags.has(tag) }"
        @click="toggleTag(tag)"
      >{{ tag }}</button>
      <button v-if="allTags.length > tagBarLimit" class="tag-toggle" @click="tagBarExpanded = !tagBarExpanded">
        {{ tagBarExpanded ? "收起" : "更多…" }}
      </button>
    </div>

    <div v-if="selectedTags.size > 0" class="filter-chips">
      <span v-for="tag in selectedTags" :key="tag" class="filter-chip">
        {{ tag }}
        <button class="filter-remove" @click="toggleTag(tag)">✕</button>
      </span>
    </div>

    <div v-if="filteredMaterials.length === 0 && (debouncedQuery || selectedTags.size > 0)" class="empty-filter">
      <p>没有匹配的素材，试试调整搜索词或标签</p>
      <button class="btn-clear-all" @click="clearAllFilters">清除所有过滤</button>
    </div>

    <template v-else>
      <button v-if="showRandomButton && filteredMaterials.length > 0" class="btn-random" @click="onRandom">🎲 随机练习</button>

      <div class="material-cards">
        <div
          v-for="mat in filteredMaterials"
          :key="mat.id"
          class="material-card"
          @click="emit('select', mat)"
        >
          <h3>{{ mat.title }}</h3>
          <div class="tags">
            <span v-for="tag in mat.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
          <slot name="card-actions" :material="mat"></slot>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { Material } from "@/api/materials";

const TAG_BAR_LIMIT = 8;

const props = withDefaults(defineProps<{
  materials: Material[];
  showRandomButton?: boolean;
}>(), {
  showRandomButton: false,
});

const emit = defineEmits<{
  select: [material: Material];
}>();

const searchInput = ref("");
const debouncedQuery = ref("");
const selectedTags = ref<Set<string>>(new Set());
const tagBarExpanded = ref(false);
const tagBarLimit = TAG_BAR_LIMIT;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let composing = false;

function onSearchInput() {
  if (composing) return;
  scheduleDebounce();
}

function onCompositionStart() {
  composing = true;
}

function onCompositionEnd() {
  composing = false;
  scheduleDebounce();
}

function scheduleDebounce() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debouncedQuery.value = searchInput.value;
  }, 300);
}

function onClear() {
  searchInput.value = "";
  debouncedQuery.value = "";
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

function toggleTag(tag: string) {
  const next = new Set(selectedTags.value);
  if (next.has(tag)) {
    next.delete(tag);
  } else {
    next.add(tag);
  }
  selectedTags.value = next;
}

function clearAllFilters() {
  searchInput.value = "";
  debouncedQuery.value = "";
  selectedTags.value = new Set();
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

const allTags = computed(() => {
  const countMap = new Map<string, number>();
  for (const m of props.materials) {
    for (const t of m.tags) {
      countMap.set(t, (countMap.get(t) || 0) + 1);
    }
  }
  return Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);
});

const visibleTags = computed(() => {
  if (tagBarExpanded.value) return allTags.value;
  return allTags.value.slice(0, tagBarLimit);
});

const filteredMaterials = computed(() => {
  let result = props.materials;

  const q = debouncedQuery.value.toLowerCase().trim();
  if (q) {
    result = result.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }

  if (selectedTags.value.size > 0) {
    const required = selectedTags.value;
    result = result.filter((m) => {
      for (const tag of required) {
        if (!m.tags.includes(tag)) return false;
      }
      return true;
    });
  }

  return result;
});

function onRandom() {
  const pool = filteredMaterials.value;
  if (pool.length === 0) return;
  const mat = pool[Math.floor(Math.random() * pool.length)];
  emit("select", mat);
}
</script>

<style scoped>
.material-browser {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.search-box {
  display: flex;
  gap: 0.5rem;
  position: relative;
}

.search-box input {
  flex: 1;
  padding: 0.5rem;
  padding-right: 2rem;
  background: #2a2a4a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #eee;
  font-size: 1rem;
}

.search-clear {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.2rem;
}

.search-clear:hover {
  color: #ccc;
}

.tag-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.tag-chip {
  padding: 0.2rem 0.6rem;
  background: #2a2a4a;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #93c5fd;
  cursor: pointer;
  transition: all 0.15s;
}

.tag-chip:hover {
  border-color: #3b82f6;
}

.tag-chip.selected {
  background: #1e3a5f;
  border-color: #3b82f6;
}

.tag-toggle {
  padding: 0.2rem 0.6rem;
  background: none;
  border: 1px solid #555;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #aaa;
  cursor: pointer;
}

.tag-toggle:hover {
  color: #ccc;
  border-color: #888;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
  color: #aaa;
  font-size: 0.9rem;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.15rem 0.5rem;
  background: #1e3a5f;
  border: 1px solid #3b82f6;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #93c5fd;
}

.filter-remove {
  background: none;
  border: none;
  color: #93c5fd;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0;
}

.filter-remove:hover {
  color: #fff;
}

.empty-filter {
  text-align: center;
  padding: 2rem 1rem;
  color: #888;
}

.empty-filter p {
  margin: 0 0 1rem;
}

.btn-clear-all {
  padding: 0.4rem 1rem;
  background: #374151;
  border: 1px solid #555;
  border-radius: 6px;
  color: #ccc;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-clear-all:hover {
  background: #4b5563;
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
}

.btn-random {
  display: block;
  width: 100%;
  padding: 0.75rem;
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
