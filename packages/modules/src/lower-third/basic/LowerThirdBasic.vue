<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import gsap from 'gsap';
import type { ModuleComponentProps } from 'engine-core';

type LowerThirdConfig = {
  primaryText: string;
  secondaryText?: string;
  tertiaryText?: string;
  alignment: 'left' | 'right' | 'center';
  variant: 'solid' | 'glass' | 'outline';
  showLogo: boolean;
  logoAssetId?: number | null;
};

const props = defineProps<ModuleComponentProps>();
const config = computed(() => props.config as LowerThirdConfig);
const rootEl = ref<HTMLElement | null>(null);

let enterTl: gsap.core.Timeline | null = null;
let exitTl: gsap.core.Timeline | null = null;

function playEnter() {
  if (!rootEl.value) return;
  exitTl?.kill();
  enterTl = gsap.timeline().fromTo(
    rootEl.value,
    { yPercent: 100, opacity: 0 },
    { yPercent: 0, opacity: 1, duration: 0.4, ease: 'power2.out' },
  );
}

function playExit() {
  if (!rootEl.value) return;
  enterTl?.kill();
  exitTl = gsap.timeline().to(rootEl.value, {
    yPercent: 100, opacity: 0, duration: 0.3, ease: 'power2.in',
  });
}

function playEmphasize() {
  if (!rootEl.value) return;
  gsap.timeline().to(rootEl.value, {
    scale: 1.05, duration: 0.15, yoyo: true, repeat: 1, ease: 'power1.inOut',
  });
}

onMounted(() => {
  if (props.runtimeState.visibility === 'visible') playEnter();
});

watch(
  () => props.runtimeState.visibility,
  (vis, oldVis) => {
    if (vis === 'visible' && oldVis !== 'visible') playEnter();
    if (vis === 'hidden' && oldVis === 'visible') playExit();
  },
);

watch(
  () => (props.runtimeState.runtimeData as any)?.lastAction,
  (action) => {
    if (action?.actionId === 'emphasize') playEmphasize();
  },
);

const logoUrl = computed(() => {
  if (!config.value.showLogo || !config.value.logoAssetId) return null;
  return `/api/workspaces/${props.workspace.id}/assets/${config.value.logoAssetId}/file`;
});
</script>

<template>
  <div
    ref="rootEl"
    class="ltb-root"
    :data-alignment="config.alignment"
    :data-variant="config.variant"
  >
    <div class="ltb-background" />
    <div class="ltb-content">
      <div class="ltb-text-block">
        <div class="ltb-primary">{{ config.primaryText }}</div>
        <div v-if="config.secondaryText" class="ltb-secondary">{{ config.secondaryText }}</div>
        <div v-if="config.tertiaryText" class="ltb-tertiary">{{ config.tertiaryText }}</div>
      </div>
      <div
        v-if="logoUrl"
        class="ltb-logo"
        :style="{ backgroundImage: `url(${logoUrl})` }"
      />
    </div>
  </div>
</template>

<style scoped>
.ltb-root {
  position: absolute;
  bottom: var(--ltb-margin-bottom, 4vh);
  left: 50%;
  transform: translateX(-50%);
  min-width: 30vw;
  max-width: 70vw;
  pointer-events: none;
  opacity: 0;
}
.ltb-root[data-alignment='left'] { left: var(--ltb-left, 6vw); transform: none; }
.ltb-root[data-alignment='right'] { left: auto; right: var(--ltb-right, 6vw); transform: none; }

.ltb-background {
  position: absolute;
  inset: 0;
  border-radius: var(--ltb-radius, 0.6rem);
}
.ltb-root[data-variant='solid'] .ltb-background { background: var(--ltb-bg, rgba(0,0,0,0.75)); }
.ltb-root[data-variant='glass'] .ltb-background { background: var(--ltb-bg, rgba(0,0,0,0.4)); backdrop-filter: blur(12px); }
.ltb-root[data-variant='outline'] .ltb-background { background: transparent; border: 2px solid var(--ltb-border-color, rgba(255,255,255,0.3)); }

.ltb-content {
  position: relative;
  display: flex;
  align-items: center;
  padding: var(--ltb-padding-y, 0.7rem) var(--ltb-padding-x, 1.4rem);
  gap: 0.8rem;
}
.ltb-text-block { display: flex; flex-direction: column; }
.ltb-primary {
  font-family: var(--overlay-font-family-primary, sans-serif);
  font-size: var(--ltb-primary-size, 1.1rem);
  font-weight: 700;
  color: var(--ltb-primary-color, #ffffff);
}
.ltb-secondary {
  font-family: var(--overlay-font-family-secondary, sans-serif);
  font-size: var(--ltb-secondary-size, 0.95rem);
  color: var(--ltb-secondary-color, #d0d0d0);
}
.ltb-tertiary {
  font-family: var(--overlay-font-family-secondary, sans-serif);
  font-size: var(--ltb-tertiary-size, 0.85rem);
  color: var(--ltb-tertiary-color, #a0a0a0);
}
.ltb-logo {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 9999px;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
}
</style>
