<template>
  <div class="video-player-wrapper">
    <video
      ref="videoEl"
      :src="videoUrl"
      class="video-player"
      preload="auto"
      @loadeddata="onLoadedData"
      @timeupdate="onTimeUpdate"
      @ended="onEnded"
    />
    <div v-if="loading" class="video-loading">加载中...</div>
    <div class="video-controls">
      <div class="progress-bar" @click.stop>
        <div class="progress-fill" :style="{ width: progressPercent + '%' }" />
      </div>
      <div class="volume-control">
        <span class="volume-icon">🔊</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          :value="volume"
          @input="onVolumeChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    videoUrl: string;
    playUntilMs: number | null;
    playFromStart?: boolean;
  }>(),
  { playFromStart: false },
);

const emit = defineEmits<{
  reachedTarget: [];
  buffered: [];
}>();

const videoEl = ref<HTMLVideoElement | null>(null);
const loading = ref(true);
const volume = ref(0.7);
const progressPercent = ref(0);
let targetMs: number | null = null;

function onLoadedData() {
  loading.value = false;
  if (videoEl.value) {
    videoEl.value.volume = volume.value;
  }
  emit("buffered");
}

function onTimeUpdate() {
  if (!videoEl.value) return;
  const duration = videoEl.value.duration || 1;
  progressPercent.value = (videoEl.value.currentTime / duration) * 100;

  if (targetMs !== null) {
    const targetSec = targetMs / 1000;
    if (videoEl.value.currentTime >= targetSec) {
      targetMs = null;
      videoEl.value.pause();
      emit("reachedTarget");
    }
  }
}

function onEnded() {
  targetMs = null;
  emit("reachedTarget");
}

function onVolumeChange(e: Event) {
  const target = e.target as HTMLInputElement;
  volume.value = parseFloat(target.value);
  if (videoEl.value) {
    videoEl.value.volume = volume.value;
  }
}

function playUntil(ms: number) {
  const video = videoEl.value;
  if (!video) return;
  targetMs = ms;
  video.play().catch(() => {});
}

function seekTo(timeMs: number) {
  const video = videoEl.value;
  if (!video) return;
  targetMs = null;
  video.currentTime = timeMs / 1000;
  video.pause();
}

watch(() => props.playUntilMs, (newVal) => {
  if (newVal !== null && !loading.value) {
    playUntil(newVal);
  }
});

watch(loading, (isLoading) => {
  if (!isLoading && props.playFromStart && props.playUntilMs !== null) {
    const video = videoEl.value;
    if (video) {
      video.currentTime = 0;
    }
    playUntil(props.playUntilMs);
  }
});

defineExpose({ playUntil, seekTo });
</script>

<style scoped>
.video-player-wrapper {
  margin-bottom: 1rem;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.video-player {
  width: 100%;
  display: block;
  max-height: 40vh;
}

.video-loading {
  text-align: center;
  padding: 2rem;
  color: #aaa;
  font-size: 1rem;
}

.video-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: #111;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: #333;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #3b82f6;
  transition: width 0.3s;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.volume-icon {
  font-size: 0.9rem;
}

.volume-control input[type="range"] {
  width: 60px;
  height: 4px;
  accent-color: #3b82f6;
}
</style>
