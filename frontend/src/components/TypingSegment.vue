<template>
  <div class="typing-segment" @click="focusInput">
    <div class="segment-display">
      <span
        v-for="(typed, i) in engine.chars"
        :key="i"
        class="char"
        :class="typed.status"
        >{{ typed.char }}</span
      >
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
import { ref, reactive, onMounted } from "vue";
import { TypingEngine } from "@/engine/TypingEngine";

const props = defineProps<{ text: string }>();
const emit = defineEmits<{ complete: [] }>();

const inputRef = ref<HTMLInputElement | null>(null);
const engine = reactive(new TypingEngine(props.text));

// Expose methods for parent component.
function hint(): string {
  return engine.hint();
}

function skip(): void {
  engine.skip();
  if (engine.isComplete) {
    emit("complete");
  }
}

defineExpose({ hint, skip, engine });

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
    engine.backspace();
  } else if (e.key === " ") {
    e.preventDefault();
    engine.input(" ");
    if (engine.isComplete) {
      emit("complete");
    }
  }
}

function onInput(e: Event) {
  // During IME composition, ignore — compositionend handles it.
  if (composing) return;

  const target = e.target as HTMLInputElement;
  const value = target.value;
  if (!value) return;

  // Direct input (English, etc.) — process immediately.
  for (const ch of value) {
    engine.input(ch);
  }
  target.value = "";

  if (engine.isComplete) {
    emit("complete");
  }
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
</style>
