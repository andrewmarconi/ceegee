<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import gsap from 'gsap';
import type { ModuleComponentProps } from 'engine-core';

type BillboardConfig = {
  headline: string;
  subline?: string;
  alignment: 'left' | 'center' | 'right';
};

const props = defineProps<ModuleComponentProps>();
const config = computed(() => props.config as BillboardConfig);
const rootEl = ref<HTMLElement | null>(null);

let enterTl: gsap.core.Timeline | null = null;
let exitTl: gsap.core.Timeline | null = null;

function playEnter() {
  if (!rootEl.value) return;
  exitTl?.kill();
  enterTl = gsap.timeline().fromTo(rootEl.value,
    { scale: 0.9, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.5, ease: 'power2.out' },
  );
}

function playExit() {
  if (!rootEl.value) return;
  enterTl?.kill();
  exitTl = gsap.timeline().to(rootEl.value, {
    opacity: 0, duration: 0.3, ease: 'power2.in',
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
  <div ref="rootEl" class="bb-root" :data-alignment="config.alignment">
    <div class="bb-background" />
    <div class="bb-content">
      <div class="bb-headline">{{ config.headline }}</div>
      <div v-if="config.subline" class="bb-subline">{{ config.subline }}</div>
    </div>
  </div>
</template>

<style scoped>
.bb-root {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  min-width: 40vw; max-width: 80vw;
  pointer-events: none;
  opacity: 0;
}
.bb-root[data-alignment='left'] { left: 10vw; transform: translateY(-50%); }
.bb-root[data-alignment='right'] { left: auto; right: 10vw; transform: translateY(-50%); }
.bb-background {
  position: absolute; inset: 0;
  border-radius: var(--bb-radius, 0.8rem);
  background: var(--bb-bg, rgba(0,0,0,0.7));
}
.bb-content {
  position: relative;
  padding: var(--bb-padding, 2rem 3rem);
  text-align: center;
}
.bb-root[data-alignment='left'] .bb-content { text-align: left; }
.bb-root[data-alignment='right'] .bb-content { text-align: right; }
.bb-headline {
  font-family: var(--overlay-font-family-primary, sans-serif);
  font-size: var(--bb-headline-size, 2rem);
  font-weight: 700;
  color: var(--bb-headline-color, #ffffff);
}
.bb-subline {
  font-family: var(--overlay-font-family-secondary, sans-serif);
  font-size: var(--bb-subline-size, 1.2rem);
  color: var(--bb-subline-color, #d0d0d0);
  margin-top: 0.4rem;
}
</style>
