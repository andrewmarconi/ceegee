<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import gsap from 'gsap';
import type { ModuleComponentProps } from 'engine-core';

type BugConfig = {
  text?: string;
  logoAssetId?: number | null;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
};

const props = defineProps<ModuleComponentProps>();
const config = computed(() => props.config as BugConfig);
const rootEl = ref<HTMLElement | null>(null);

let enterTl: gsap.core.Timeline | null = null;
let exitTl: gsap.core.Timeline | null = null;

function playEnter() {
  if (!rootEl.value) return;
  exitTl?.kill();
  enterTl = gsap.timeline().fromTo(rootEl.value,
    { scale: 0.5, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' },
  );
}

function playExit() {
  if (!rootEl.value) return;
  enterTl?.kill();
  exitTl = gsap.timeline().to(rootEl.value, {
    scale: 0.5, opacity: 0, duration: 0.2, ease: 'power2.in',
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

const logoUrl = computed(() => {
  if (!config.value.logoAssetId) return null;
  return `/api/workspaces/${props.workspace.id}/assets/${config.value.logoAssetId}/file`;
});

const positionClasses = computed(() => {
  const p = config.value.position;
  return {
    top: p.startsWith('top'),
    bottom: p.startsWith('bottom'),
    left: p.endsWith('left'),
    right: p.endsWith('right'),
  };
});
</script>

<template>
  <div ref="rootEl" class="bug-root" :class="positionClasses">
    <div
      v-if="logoUrl"
      class="bug-logo"
      :style="{ backgroundImage: `url(${logoUrl})` }"
    />
    <span v-if="config.text" class="bug-text">{{ config.text }}</span>
  </div>
</template>

<style scoped>
.bug-root {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.7rem;
  background: var(--bug-bg, rgba(0,0,0,0.6));
  border-radius: var(--bug-radius, 0.4rem);
  pointer-events: none;
  opacity: 0;
}
.bug-root.top { top: var(--bug-margin, 3vh); }
.bug-root.bottom { bottom: var(--bug-margin, 3vh); }
.bug-root.left { left: var(--bug-margin, 3vw); }
.bug-root.right { right: var(--bug-margin, 3vw); }
.bug-logo {
  width: 2rem; height: 2rem;
  background-size: contain; background-position: center; background-repeat: no-repeat;
}
.bug-text {
  font-family: var(--overlay-font-family-primary, sans-serif);
  font-size: var(--bug-text-size, 0.85rem);
  font-weight: 600;
  color: var(--bug-text-color, #ffffff);
}
</style>
