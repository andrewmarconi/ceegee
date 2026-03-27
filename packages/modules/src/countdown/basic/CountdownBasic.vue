<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import gsap from 'gsap';
import type { ModuleComponentProps } from 'engine-core';

type CountdownConfig = {
  targetTime: string;
  label?: string;
  finishedText?: string;
};

const props = defineProps<ModuleComponentProps>();
const config = computed(() => props.config as CountdownConfig);
const rootEl = ref<HTMLElement | null>(null);
const display = ref('');
const finished = ref(false);

let intervalId: ReturnType<typeof setInterval> | null = null;

function update() {
  const target = new Date(config.value.targetTime).getTime();
  const remaining = Math.max(0, target - Date.now());

  if (remaining <= 0) {
    display.value = config.value.finishedText ?? '00:00:00';
    finished.value = true;
    if (intervalId) clearInterval(intervalId);
    return;
  }

  finished.value = false;
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  display.value = [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

onMounted(() => {
  update();
  intervalId = setInterval(update, 1000);
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});

let enterTl: gsap.core.Timeline | null = null;
let exitTl: gsap.core.Timeline | null = null;

function playEnter() {
  if (!rootEl.value) return;
  exitTl?.kill();
  enterTl = gsap.timeline().fromTo(rootEl.value,
    { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' },
  );
}

function playExit() {
  if (!rootEl.value) return;
  enterTl?.kill();
  exitTl = gsap.timeline().to(rootEl.value, {
    opacity: 0, duration: 0.2, ease: 'power2.in',
  });
}

watch(
  () => props.runtimeState.visibility,
  (vis, oldVis) => {
    if (vis === 'visible' && oldVis !== 'visible') playEnter();
    if (vis === 'hidden' && oldVis === 'visible') playExit();
  },
  { immediate: true },
);
</script>

<template>
  <div ref="rootEl" class="cd-root" :class="{ finished }">
    <span v-if="config.label" class="cd-label">{{ config.label }}</span>
    <span class="cd-time">{{ display }}</span>
  </div>
</template>

<style scoped>
.cd-root {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 1rem 2rem;
  background: var(--cd-bg, rgba(0,0,0,0.7));
  border-radius: var(--cd-radius, 0.6rem);
  pointer-events: none;
  opacity: 0;
}
.cd-label {
  font-family: var(--overlay-font-family-secondary, sans-serif);
  font-size: var(--cd-label-size, 0.9rem);
  color: var(--cd-label-color, #a0a0a0);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.cd-time {
  font-family: var(--overlay-font-family-primary, monospace);
  font-size: var(--cd-time-size, 3rem);
  font-weight: 700;
  color: var(--cd-time-color, #ffffff);
  font-variant-numeric: tabular-nums;
}
.cd-root.finished .cd-time { color: var(--cd-finished-color, #ff4444); }
</style>
