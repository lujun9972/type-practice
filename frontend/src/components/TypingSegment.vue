<template>
  <div class="typing-segment" @click="focusInput">
    <div class="segment-display">
      <template v-if="mode === 'pinyin'">
        <span
          v-for="(target, i) in pinyinTargets"
          :key="i"
          class="char-group"
          :class="target.status"
        >
          <span class="pinyin-annotation">{{ target.pinyin }}</span>
          <span class="char" :class="target.status">{{ target.display }}</span>
        </span>
      </template>
      <template v-else>
        <span
          v-for="(typed, i) in engine.chars"
          :key="i"
          class="char"
          :class="typed.status"
          >{{ typed.char }}</span
        >
      </template>
    </div>
    <input
      ref="inputRef"
      class="typing-input"
      @keydown="onKeydown"
      @compositionstart="onCompositionStart"
      @compositionend="onCompositionEnd"
      @input="onInput"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { TypingEngine } from "@/engine/TypingEngine";
import { PinyinEngine } from "@/engine/PinyinEngine";
import type { PinyinTarget } from "@/engine/PinyinEngine";

const props = withDefaults(defineProps<{ text: string; mode?: "typing" | "pinyin" }>(), { mode: "typing" });
const emit = defineEmits<{ complete: [] }>();

const inputRef = ref<HTMLInputElement | null>(null);
const engine = reactive(new TypingEngine(props.text));
const pinyinEngine = reactive(new PinyinEngine(props.text));

const pinyinTargets = computed(() => pinyinEngine.targets);

// Expose methods for parent component.
function hint(): string {
  if (props.mode === "pinyin") return pinyinEngine.hint();
  return engine.hint();
}

function skip(): void {
  if (props.mode === "pinyin") {
    pinyinEngine.skip();
    if (pinyinEngine.isComplete) emit("complete");
  } else {
    engine.skip();
    if (engine.isComplete) emit("complete");
  }
}

function checkComplete(): void {
  const done = props.mode === "pinyin" ? pinyinEngine.isComplete : engine.isComplete;
  if (done) emit("complete");
}

defineExpose({ hint, skip, engine, pinyinEngine });

function focusInput() {
  inputRef.value?.focus();
}

onMounted(() => {
  inputRef.value?.focus();
});

let composing = false;

function onCompositionStart() {
  composing = true;
}

function onCompositionEnd(e: Event) {
  composing = false;
  if (props.mode === "pinyin") {
    // In pinyin mode, ignore IME — user types raw letters
    const target = e.target as HTMLInputElement;
    target.value = "";
    return;
  }
  const data = (e as CompositionEvent).data ?? "";
  if (data) {
    for (const ch of data) {
      engine.input(ch);
    }
  }
  const target = e.target as HTMLInputElement;
  target.value = "";
  if (engine.isComplete) {
    emit("complete");
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Backspace") {
    e.preventDefault();
    if (composing) return; // Let IME handle backspace during composition
    if (props.mode === "pinyin") {
      pinyinEngine.backspace();
    } else {
      engine.backspace();
    }
  } else if (e.key === " ") {
    e.preventDefault();
    if (props.mode === "pinyin") {
      // Space ignored in pinyin mode
    } else {
      engine.input(" ");
      checkComplete();
    }
  }
}

function onInput(e: Event) {
  // During IME composition, ignore — compositionend handles it.
  if (composing) return;

  const target = e.target as HTMLInputElement;
  const value = target.value;
  if (!value) return;

  // Direct input — process immediately.
  if (props.mode === "pinyin") {
    for (const ch of value) {
      pinyinEngine.input(ch);
    }
  } else {
    for (const ch of value) {
      engine.input(ch);
    }
  }
  target.value = "";

  checkComplete();
}
</script>

<style scoped>
.typing-segment {
  position: relative;
  cursor: text;
}

.segment-display {
  font-size: 1.5rem;
  letter-spacing: 0.1em;
  line-height: 2;
}

.char {
  padding: 2px 1px;
  border-bottom: 2px solid transparent;
  transition: color 0.15s;
}

.char.pending {
  color: #666;
  border-bottom-color: #ccc;
}

.char.correct {
  color: #22c55e;
  border-bottom-color: #22c55e;
}

.char.incorrect {
  color: #ef4444;
  border-bottom-color: #ef4444;
}

.char.skipped {
  color: #888;
  border-bottom-color: #888;
}

.typing-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

/* Pinyin mode */
.char-group {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 2px 1px;
  border-bottom: 2px solid transparent;
  transition: color 0.15s;
}

.char-group.pending {
  border-bottom-color: #ccc;
}

.char-group.correct {
  border-bottom-color: #22c55e;
}

.char-group.incorrect {
  border-bottom-color: #ef4444;
}

.char-group.skipped {
  border-bottom-color: #888;
}

.pinyin-annotation {
  font-size: 0.75rem;
  color: #93c5fd;
  line-height: 1;
  margin-bottom: 2px;
}
</style>
