# Lower Third Example Module Definition

## 1. Types for this module

```ts
// lower-third.basic specific config
// In MVP, data fields (primaryText, etc.) are part of config.
// When Datasources arrive (v1.1+), they can be bound externally instead.
export type LowerThirdConfig = {
  // display data
  primaryText: string;       // e.g. name
  secondaryText?: string;    // e.g. title / role
  tertiaryText?: string;     // e.g. pronouns or org

  // visual config
  alignment: 'left' | 'right' | 'center';
  variant: 'solid' | 'glass' | 'outline';
  showLogo: boolean;
  logoAssetId?: AssetId | null;
};
```

***

## 2. Manifest (`lowerThirdBasicManifest.ts`)

```ts
import type {
  JsonSchemaLike,
  ModuleManifest,
} from '@acme/engine-core/types';

export const lowerThirdBasicManifest: ModuleManifest = {
  id: 'lower-third.basic',
  label: 'Basic Lower Third',
  version: '1.0.0',
  category: 'lower-third',

  configSchema: {
    type: 'object',
    properties: {
      primaryText: {
        type: 'string',
        title: 'Name',
      },
      secondaryText: {
        type: 'string',
        title: 'Title / Role',
      },
      tertiaryText: {
        type: 'string',
        title: 'Pronouns / Org',
      },
      alignment: {
        type: 'string',
        enum: ['left', 'right', 'center'],
        default: 'left',
      },
      variant: {
        type: 'string',
        enum: ['solid', 'glass', 'outline'],
        default: 'solid',
      },
      showLogo: {
        type: 'boolean',
        default: false,
      },
      logoAssetId: {
        type: ['integer', 'null'],
      },
    },
    required: ['primaryText', 'alignment', 'variant', 'showLogo'],
  } satisfies JsonSchemaLike,

  // dataSchema documents what fields this module can display.
  // In MVP these come from config; in v1.1+ they can be bound to Datasources.
  dataSchema: {
    type: 'object',
    properties: {
      primaryText: { type: 'string' },
      secondaryText: { type: 'string' },
      tertiaryText: { type: 'string' },
    },
    required: ['primaryText'],
  } satisfies JsonSchemaLike,

  actions: [
    { id: 'show', label: 'Show' },
    { id: 'hide', label: 'Hide' },
    { id: 'emphasize', label: 'Emphasize' },
  ],

  animationHooks: {
    enter: 'slideUp',
    exit: 'slideDown',
    emphasize: 'pulse',
  },

  capabilities: {
    supportsLayerRegions: true,
    supportsMultipleInstancesPerLayer: true,
  },
};
```

***

## 3. Vue component (`LowerThirdBasic.vue`)

High‑level example; real code would include GSAP timelines.

```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import gsap from 'gsap';
import type {
  ModuleComponentProps,
} from '@acme/engine-core/types';
import type {
  LowerThirdConfig,
} from './lowerThird.types';

const props = defineProps<ModuleComponentProps>();

const config = computed(() => props.config as LowerThirdConfig);

// GSAP timeline refs
let enterTl: gsap.core.Timeline | null = null;
let exitTl: gsap.core.Timeline | null = null;
let emphasizeTl: gsap.core.Timeline | null = null;

const rootEl = ref<HTMLElement | null>(null);

const playEnter = () => {
  if (!rootEl.value) return;
  exitTl?.kill();
  enterTl = gsap
    .timeline()
    .fromTo(
      rootEl.value,
      { yPercent: 100, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 0.4, ease: 'power2.out' },
    );
};

const playExit = () => {
  if (!rootEl.value) return;
  enterTl?.kill();
  exitTl = gsap
    .timeline()
    .to(rootEl.value, {
      yPercent: 100,
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
    });
};

const playEmphasize = () => {
  if (!rootEl.value) return;
  emphasizeTl?.kill();
  emphasizeTl = gsap
    .timeline()
    .to(rootEl.value, {
      scale: 1.05,
      duration: 0.15,
      yoyo: true,
      repeat: 1,
      ease: 'power1.inOut',
    });
};

watch(
  () => props.runtimeState.visibility,
  (vis) => {
    if (vis === 'entering' || vis === 'visible') {
      playEnter();
    } else if (vis === 'exiting' || vis === 'hidden') {
      playExit();
    }
  },
  { immediate: true },
);

// Optional: watch some runtimeData flag for emphasize action
watch(
  () => props.runtimeState.runtimeData,
  (rd) => {
    if (rd && (rd as any).emphasize) {
      playEmphasize();
    }
  },
);
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
        <div class="ltb-primary">
          {{ config.primaryText }}
        </div>
        <div v-if="config.secondaryText" class="ltb-secondary">
          {{ config.secondaryText }}
        </div>
        <div v-if="config.tertiaryText" class="ltb-tertiary">
          {{ config.tertiaryText }}
        </div>
      </div>
      <div v-if="config.showLogo && config.logoAssetId" class="ltb-logo">
        <!-- resolved via useAssetUrl(workspace.id, config.logoAssetId) -->
      </div>
    </div>
  </div>
</template>

<style scoped>
.ltb-root {
  position: absolute;
  /* position will be influenced by layer.region + alignment via CSS vars */
  bottom: var(--ltb-margin-bottom, 4vh);
  left: 50%;
  transform: translateX(-50%);
  min-width: 30vw;
  max-width: 70vw;
  pointer-events: none;
}

/* alignment tweaks, vars driven by config + theme tokens */
.ltb-root[data-alignment='left'] {
  left: var(--ltb-left, 6vw);
  transform: none;
}
.ltb-root[data-alignment='right'] {
  left: auto;
  right: var(--ltb-right, 6vw);
  transform: none;
}

.ltb-background {
  position: absolute;
  inset: 0;
  border-radius: var(--ltb-radius, 0.6rem);
  background: var(--ltb-bg, rgba(0, 0, 0, 0.75));
}

.ltb-content {
  position: relative;
  display: flex;
  align-items: center;
  padding: var(--ltb-padding-y, 0.7rem) var(--ltb-padding-x, 1.4rem);
  gap: 0.8rem;
}

.ltb-text-block {
  display: flex;
  flex-direction: column;
}

.ltb-primary {
  font-family: var(--overlay-font-family-primary);
  font-size: var(--ltb-primary-size, 1.1rem);
  font-weight: 700;
  color: var(--ltb-primary-color, #ffffff);
}

.ltb-secondary {
  font-family: var(--overlay-font-family-secondary);
  font-size: var(--ltb-secondary-size, 0.95rem);
  color: var(--ltb-secondary-color, #d0d0d0);
}

.ltb-tertiary {
  font-family: var(--overlay-font-family-secondary);
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
```

***

## 4. How engine + UI use this

- **Engine**:
  - At startup, scans `packages/modules/` and loads `lowerThirdBasicManifest`. Upserts `module_key = 'lower-third.basic'` into `modules` table.
  - For Elements using this module:
    - `config` must satisfy `LowerThirdConfig` (includes both display data and visual settings).

- **Producer UI**:
  - Reads `ModuleManifest.configSchema` to build a form.
  - When user creates a "Speaker Lower Third" Element:
    - It stores `config` as a JSON blob matching `LowerThirdConfig` (e.g., `{ primaryText: "Andrew", secondaryText: "Creative Technologist", alignment: "left", variant: "solid", showLogo: false }`).

- **Operator UI**:
  - Shows Elements of category `lower-third` on the Lower Thirds Layer.
  - Quick-edit fields (primaryText, secondaryText) in the Context panel.
  - When operator hits TAKE:
    - Engine sets Element visibility → overlay's GSAP `enter` timeline runs.
  - CLEAR sets visibility to `hidden`/`exiting` → `exit` timeline runs.

- **Asset resolution**:
  - If `showLogo` is true and `logoAssetId` is set, the component resolves the asset URL via `useAssetUrl(workspace.id, config.logoAssetId)` which maps to `GET /api/workspaces/:workspaceId/assets/:assetId/file`.
