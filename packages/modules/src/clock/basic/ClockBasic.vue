<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import gsap from 'gsap';
import type { ModuleComponentProps } from 'engine-core';

type ClockConfig = {
  format: '12h' | '24h';
  showSeconds: boolean;
  label?: string;
};

const props = defineProps<ModuleComponentProps>();
const config = computed(() => props.config as ClockConfig);
const rootEl = ref<HTMLElement | null>(null);
const timeStr = ref('');

let intervalId: ReturnType<typeof setInterval> | null = null;

function updateTime() {
  const now = new Date();
  const opts: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: config.value.format === '12h',
  };
  if (config.value.showSeconds) opts.second = '2-digit';
  timeStr.value = now.toLocaleTimeString(undefined, opts);
}

onMounted(() => {
  updateTime();
  intervalId = setInterval(updateTime, 1000);
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
  <div ref="rootEl" class="clock-root">
    <span v-if="config.label" class="clock-label">{{ config.label }}</span>
    <span class="clock-time">{{ timeStr }}</span>
  </div>
</template>

<style scoped>
.clock-root {
  position: absolute;
  top: var(--clock-top, auto);
  bottom: var(--clock-bottom, 3vh);
  right: var(--clock-right, 3vw);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.8rem;
  background: var(--clock-bg, rgba(0,0,0,0.6));
  border-radius: var(--clock-radius, 0.3rem);
  pointer-events: none;
  opacity: 0;
}
.clock-label {
  font-family: var(--overlay-font-family-secondary, sans-serif);
  font-size: var(--clock-label-size, 0.75rem);
  color: var(--clock-label-color, #a0a0a0);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.clock-time {
  font-family: var(--overlay-font-family-primary, monospace);
  font-size: var(--clock-time-size, 1rem);
  font-weight: 700;
  color: var(--clock-time-color, #ffffff);
  font-variant-numeric: tabular-nums;
}
</style>
