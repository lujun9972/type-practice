<template>
  <div class="typing-session">
    <!-- Visible nodes: text segments and images up to current unlock point -->
    <template v-for="(node, i) in visibleNodes" :key="i">
      <div v-if="node.type === 'text'" class="segment-wrapper">
        <TypingSegment
          ref="segmentRefs"
          :text="node.content"
          :mode="mode"
          @complete="onSegmentComplete(textIndexOf(node))"
        />
      </div>
      <div v-else-if="node.type === 'image'" class="image-wrapper">
        <img :src="node.url" alt="" />
      </div>
    </template>
    <div v-if="!isFinished" class="controls">
      <button class="btn-hint" @click="onHint">Hint</button>
      <button
        class="btn-skip"
        :disabled="skipRemaining <= 0"
        @click="onSkip"
      >
        Skip ({{ skipRemaining }})
      </button>
      <span v-if="hintText" class="hint-display">{{ hintText }}</span>
    </div>
    <div v-if="isFinished" class="result-overlay">
      <h2>完成！</h2>
      <p>用时：{{ elapsedTime }}</p>
      <p>准确率：{{ accuracy }}%</p>
      <p>速度：{{ speed }} 字/分钟</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import TypingSegment from "./TypingSegment.vue";
import { pinyin as getPinyin } from "pinyin-pro";

interface Segment {
  type: string;
  content?: string;
  url?: string;
}

const props = withDefaults(
  defineProps<{ segments: Segment[]; skipLimit?: number; startIndex?: number; mode?: "typing" | "pinyin" }>(),
  { skipLimit: 3, startIndex: 0, mode: "typing" },
);
const emit = defineEmits<{
  complete: [];
  "segment-complete": [result: { index: number; accuracy: number; timeMs: number; correctChars: number }];
}>();

const unlockedTextIndex = ref(props.startIndex);
const skipRemaining = ref(props.skipLimit);
const hintText = ref("");
const isFinished = ref(false);
const startTime = ref(Date.now());

const textSegments = computed(() =>
  props.segments.filter((s) => s.type === "text"),
);

/**
 * Visible nodes = all segments (text + image) up to and including
 * the currently unlocked text segment plus any trailing images.
 */
const visibleNodes = computed(() => {
  let textCount = 0;
  const result: Segment[] = [];
  for (const seg of props.segments) {
    if (seg.type === "text") {
      if (textCount > unlockedTextIndex.value) break;
      result.push(seg);
      textCount++;
    } else if (seg.type === "image") {
      // Show image if it comes before or at the current text segment.
      if (textCount <= unlockedTextIndex.value) {
        result.push(seg);
      }
    }
  }
  return result;
});

const segmentRefs = ref<InstanceType<typeof TypingSegment>[]>([]);

function textIndexOf(node: Segment): number {
  let count = 0;
  for (const seg of props.segments) {
    if (seg === node) return count;
    if (seg.type === "text") count++;
  }
  return count;
}

function activeSegment(): InstanceType<typeof TypingSegment> | undefined {
  return segmentRefs.value[unlockedTextIndex.value];
}

function onSegmentComplete(textIndex: number) {
  if (textIndex !== unlockedTextIndex.value) return;

  // Emit per-segment result.
  const seg = segmentRefs.value[textIndex];
  if (seg) {
    const chars = props.mode === "pinyin" ? seg.pinyinEngine.chars : seg.engine.chars;
    const correct = chars.filter((c: { status: string }) => c.status === "correct").length;
    const accuracy = chars.length > 0 ? Math.round((correct / chars.length) * 100) : 0;
    emit("segment-complete", { index: textIndex, accuracy, timeMs: Date.now() - startTime.value, correctChars: correct });
  }

  const nextUnlocked = unlockedTextIndex.value + 1;

  if (nextUnlocked < textSegments.value.length) {
    unlockedTextIndex.value = nextUnlocked;
  } else {
    isFinished.value = true;
    emit("complete");
  }
}

// Result calculations
const elapsedTime = computed(() => {
  const ms = Date.now() - startTime.value;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
});

const accuracy = computed(() => {
  const all = segmentRefs.value.flatMap((seg) => {
    if (!seg) return [];
    return props.mode === "pinyin" ? seg.pinyinEngine.chars : seg.engine.chars;
  });
  const correct = all.filter((c) => c.status === "correct").length;
  const total = all.length;
  return total > 0 ? Math.round((correct / total) * 100) : 0;
});

const speed = computed(() => {
  const all = segmentRefs.value.flatMap((seg) => {
    if (!seg) return [];
    return props.mode === "pinyin" ? seg.pinyinEngine.chars : seg.engine.chars;
  });
  const total = all.length;
  const minutes = (Date.now() - startTime.value) / 60000;
  return minutes > 0 ? Math.round(total / minutes) : 0;
});

function onHint() {
  const seg = activeSegment();
  if (!seg) return;
  const char = seg.hint();
  if (!char) return;
  if (props.mode === "pinyin") {
    hintText.value = char;
  } else if (/[\u4e00-\u9fff]/.test(char)) {
    hintText.value = getPinyin(char, { toneType: "symbol" });
  } else {
    hintText.value = char;
  }
}

function onSkip() {
  if (skipRemaining.value <= 0) return;
  const seg = activeSegment();
  if (!seg) return;
  seg.skip();
  skipRemaining.value--;
}
</script>

<style scoped>
.segment-wrapper {
  margin-bottom: 1.5rem;
}

.image-wrapper {
  margin-bottom: 1.5rem;
  text-align: center;
}

.image-wrapper img {
  max-width: 100%;
  border-radius: 8px;
}

.controls {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-top: 1rem;
}

.btn-hint,
.btn-skip {
  padding: 0.4rem 1rem;
  border: 1px solid #555;
  border-radius: 6px;
  background: #2a2a4a;
  color: #eee;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-hint:hover,
.btn-skip:hover:not(:disabled) {
  background: #3a3a5a;
}

.btn-skip:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.hint-display {
  padding: 0.3rem 0.8rem;
  background: #1e3a5f;
  border-radius: 4px;
  color: #93c5fd;
  font-size: 1.1rem;
  font-weight: bold;
}

.result-overlay {
  margin-top: 2rem;
  padding: 2rem;
  background: #1e293b;
  border-radius: 12px;
  text-align: center;
}

.result-overlay h2 {
  margin-top: 0;
  color: #22c55e;
}

.result-overlay p {
  font-size: 1.2rem;
  margin: 0.5rem 0;
}
</style>
