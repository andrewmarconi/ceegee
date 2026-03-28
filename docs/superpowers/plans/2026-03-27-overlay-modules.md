# Overlay System + Module Loading + Built-in Modules

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the overlay rendering system with 5 built-in broadcast graphics modules (lower third, bug, billboard, clock, countdown), dynamic module loading, WebSocket-driven state, and GSAP animations.

**Architecture:** A new `packages/modules` workspace package contains all built-in modules, each exporting a `ModuleManifest` and a Vue component. The Nuxt app's overlay pages (`/o/...`) use an `OverlayHost` component that connects to the WebSocket, receives `ChannelState`, and dynamically renders the correct module component for each element using `defineAsyncComponent`. Module components manage their own visibility via GSAP animations, watching the `runtimeState.visibility` prop. A Nitro server plugin auto-registers all module manifests into the DB at startup.

**Tech Stack:** Vue 3, GSAP, Nuxt 4 pages/layouts/composables, WebSocket (client-side), `defineAsyncComponent`

---

> **This is Plan 3 of 5.** Depends on Plans 1-2 (engine-core + API routes + WebSocket).
> Subsequent plans:
> - Plan 4: Operator UI
> - Plan 5: Producer UI + Asset management

**Reference docs:**
- `docs/prd.md` sections 3 (Rendering/routing), 7 (Styling), 11.3 (Overlay rendering)
- `docs/spec-example-module-lowerthird.md` — reference implementation
- `docs/schema-typescript.md` — ModuleManifest, ModuleComponentProps types

---

## File structure

```
packages/engine-core/src/
└── types.ts                                    # MODIFY: add ModuleManifest, ModuleComponentProps

packages/modules/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                                # Re-export all manifests
│   ├── registry.ts                             # moduleKey → component loader map
│   ├── lower-third/basic/
│   │   ├── manifest.ts
│   │   └── LowerThirdBasic.vue
│   ├── bug/basic/
│   │   ├── manifest.ts
│   │   └── BugBasic.vue
│   ├── billboard/basic/
│   │   ├── manifest.ts
│   │   └── BillboardBasic.vue
│   ├── clock/basic/
│   │   ├── manifest.ts
│   │   └── ClockBasic.vue
│   └── countdown/basic/
│       ├── manifest.ts
│       └── CountdownBasic.vue

apps/engine-ui/
├── package.json                                # MODIFY: add modules + gsap deps
├── nuxt.config.ts                              # MODIFY: add /o/ route config
├── app/
│   ├── layouts/
│   │   ├── default.vue                         # CREATE: app layout (header/footer)
│   │   └── overlay.vue                         # CREATE: transparent overlay layout
│   ├── app.vue                                 # MODIFY: use NuxtLayout
│   ├── composables/
│   │   ├── useEngineWs.ts                      # CREATE: reactive WS connection
│   │   └── useAssetUrl.ts                      # CREATE: asset URL resolver
│   ├── components/
│   │   └── overlay/
│   │       └── OverlayHost.vue                 # CREATE: dynamic module renderer
│   └── pages/
│       └── o/
│           └── [workspaceId]/
│               ├── channel/[channelId].vue     # CREATE: channel overlay page
│               ├── layer/[layerId].vue         # CREATE: layer overlay page
│               └── element/[elementId].vue     # CREATE: element overlay page
└── server/
    ├── api/modules/index.get.ts                # CREATE: list registered modules
    └── plugins/register-modules.ts             # CREATE: auto-register modules at startup
```

---

## Task 1: Add ModuleManifest + ModuleComponentProps to engine-core

**Files:**
- Modify: `packages/engine-core/src/types.ts`

- [ ] **Step 1: Add types after `UpsertModuleInput` in `packages/engine-core/src/types.ts`**

Insert after the `UpsertModuleInput` type (before `// -- Element --`):

```ts
// ModuleManifest is the runtime contract exported by each module package.
// It mirrors UpsertModuleInput but uses `id` as the stable key.
export type ModuleManifest = {
  id: string;                  // stable key, e.g. "lower-third.basic"
  label: string;
  version: string;
  category: ModuleCategory;
  configSchema: JsonSchemaLike;
  dataSchema: JsonSchemaLike;
  actions: ModuleAction[];
  animationHooks: ModuleAnimationHooks;
  capabilities?: ModuleCapabilities;
};

// Props passed to every module's Vue component by OverlayHost
export type ModuleComponentProps = {
  workspace: Workspace;
  channel: Channel;
  layer: Layer;
  element: Element;
  config: unknown;
  runtimeState: ElementRuntimeState;
};
```

Note: `ModuleComponentProps` references `Element` and `ElementRuntimeState` — both are already defined later in the same file. TypeScript handles forward references in type declarations.

- [ ] **Step 2: Run engine-core tests to verify no regressions**

```bash
cd /home/andrew/Develop/CeeGee/packages/engine-core && npx vitest run
```

Expected: all 58 tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/engine-core/src/types.ts
git commit -m "feat(engine-core): add ModuleManifest and ModuleComponentProps types"
```

---

## Task 2: packages/modules scaffold + registry

**Files:**
- Create: `packages/modules/package.json`
- Create: `packages/modules/tsconfig.json`
- Create: `packages/modules/src/index.ts`
- Create: `packages/modules/src/registry.ts`
- Modify: `apps/engine-ui/package.json` (add modules + gsap deps)

- [ ] **Step 1: Create `packages/modules/package.json`**

```json
{
  "name": "modules",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./registry": "./src/registry.ts"
  },
  "dependencies": {
    "engine-core": "workspace:*",
    "gsap": "^3.12.7"
  },
  "peerDependencies": {
    "vue": "^3.5.0"
  }
}
```

- [ ] **Step 2: Create `packages/modules/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `packages/modules/src/index.ts`** (empty for now, manifests added in later tasks)

```ts
// Module manifests — each module task adds an export here
```

- [ ] **Step 4: Create `packages/modules/src/registry.ts`** (empty for now, populated in later tasks)

```ts
import type { ModuleManifest } from 'engine-core';
import type { Component } from 'vue';

// moduleKey → lazy component loader (for defineAsyncComponent in OverlayHost)
export const moduleComponents: Record<string, () => Promise<Component>> = {};

// moduleKey → manifest (for server-side registration)
export const moduleManifests: Record<string, ModuleManifest> = {};
```

- [ ] **Step 5: Add `modules` and `gsap` to `apps/engine-ui/package.json` dependencies**

Add to the `dependencies` object:

```json
"modules": "workspace:*",
"gsap": "^3.12.7"
```

- [ ] **Step 6: Install**

```bash
cd /home/andrew/Develop/CeeGee && pnpm install
```

- [ ] **Step 7: Commit**

```bash
git add packages/modules/ apps/engine-ui/package.json pnpm-lock.yaml
git commit -m "chore: scaffold packages/modules with registry pattern"
```

---

## Task 3: Lower Third module

**Files:**
- Create: `packages/modules/src/lower-third/basic/manifest.ts`
- Create: `packages/modules/src/lower-third/basic/LowerThirdBasic.vue`
- Modify: `packages/modules/src/index.ts`
- Modify: `packages/modules/src/registry.ts`

This is the reference module implementation, matching `docs/spec-example-module-lowerthird.md`.

- [ ] **Step 1: Create `packages/modules/src/lower-third/basic/manifest.ts`**

```ts
import type { ModuleManifest, JsonSchemaLike } from 'engine-core';

export const lowerThirdBasicManifest: ModuleManifest = {
  id: 'lower-third.basic',
  label: 'Basic Lower Third',
  version: '1.0.0',
  category: 'lower-third',

  configSchema: {
    type: 'object',
    properties: {
      primaryText: { type: 'string', title: 'Name' },
      secondaryText: { type: 'string', title: 'Title / Role' },
      tertiaryText: { type: 'string', title: 'Pronouns / Org' },
      alignment: { type: 'string', enum: ['left', 'right', 'center'], default: 'left' },
      variant: { type: 'string', enum: ['solid', 'glass', 'outline'], default: 'solid' },
      showLogo: { type: 'boolean', default: false },
      logoAssetId: { type: ['integer', 'null'] },
    },
    required: ['primaryText', 'alignment', 'variant', 'showLogo'],
  } satisfies JsonSchemaLike,

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

  animationHooks: { enter: 'slideUp', exit: 'slideDown', emphasize: 'pulse' },

  capabilities: {
    supportsLayerRegions: true,
    supportsMultipleInstancesPerLayer: true,
  },
};
```

- [ ] **Step 2: Create `packages/modules/src/lower-third/basic/LowerThirdBasic.vue`**

```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
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

watch(
  () => props.runtimeState.visibility,
  (vis, oldVis) => {
    if (vis === 'visible' && oldVis !== 'visible') playEnter();
    if (vis === 'hidden' && oldVis === 'visible') playExit();
  },
  { immediate: true },
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
```

- [ ] **Step 3: Register in `packages/modules/src/index.ts`**

```ts
export { lowerThirdBasicManifest } from './lower-third/basic/manifest';
```

- [ ] **Step 4: Register in `packages/modules/src/registry.ts`**

```ts
import type { ModuleManifest } from 'engine-core';
import type { Component } from 'vue';
import { lowerThirdBasicManifest } from './lower-third/basic/manifest';

export const moduleComponents: Record<string, () => Promise<Component>> = {
  'lower-third.basic': () => import('./lower-third/basic/LowerThirdBasic.vue') as Promise<Component>,
};

export const moduleManifests: Record<string, ModuleManifest> = {
  'lower-third.basic': lowerThirdBasicManifest,
};
```

- [ ] **Step 5: Commit**

```bash
git add packages/modules/src/lower-third/ packages/modules/src/index.ts packages/modules/src/registry.ts
git commit -m "feat(modules): add lower-third.basic module with GSAP animations"
```

---

## Task 4: Bug + Billboard modules

**Files:**
- Create: `packages/modules/src/bug/basic/manifest.ts`
- Create: `packages/modules/src/bug/basic/BugBasic.vue`
- Create: `packages/modules/src/billboard/basic/manifest.ts`
- Create: `packages/modules/src/billboard/basic/BillboardBasic.vue`
- Modify: `packages/modules/src/index.ts`
- Modify: `packages/modules/src/registry.ts`

- [ ] **Step 1: Create bug module manifest**

`packages/modules/src/bug/basic/manifest.ts`:
```ts
import type { ModuleManifest, JsonSchemaLike } from 'engine-core';

export const bugBasicManifest: ModuleManifest = {
  id: 'bug.basic',
  label: 'Basic Brand Bug',
  version: '1.0.0',
  category: 'bug',

  configSchema: {
    type: 'object',
    properties: {
      text: { type: 'string', title: 'Label' },
      logoAssetId: { type: ['integer', 'null'], title: 'Logo' },
      position: { type: 'string', enum: ['top-right', 'top-left', 'bottom-right', 'bottom-left'], default: 'top-right' },
    },
    required: ['position'],
  } satisfies JsonSchemaLike,

  dataSchema: { type: 'object', properties: { text: { type: 'string' } } } satisfies JsonSchemaLike,

  actions: [
    { id: 'show', label: 'Show' },
    { id: 'hide', label: 'Hide' },
  ],

  animationHooks: { enter: 'fadeScale', exit: 'fadeOut' },
  capabilities: { supportsLayerRegions: true },
};
```

- [ ] **Step 2: Create bug module component**

`packages/modules/src/bug/basic/BugBasic.vue`:
```vue
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
  <div
    ref="rootEl"
    class="bug-root"
    :class="positionClasses"
  >
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
```

- [ ] **Step 3: Create billboard module manifest**

`packages/modules/src/billboard/basic/manifest.ts`:
```ts
import type { ModuleManifest, JsonSchemaLike } from 'engine-core';

export const billboardBasicManifest: ModuleManifest = {
  id: 'billboard.basic',
  label: 'Basic Billboard',
  version: '1.0.0',
  category: 'billboard',

  configSchema: {
    type: 'object',
    properties: {
      headline: { type: 'string', title: 'Headline' },
      subline: { type: 'string', title: 'Subline' },
      alignment: { type: 'string', enum: ['left', 'center', 'right'], default: 'center' },
    },
    required: ['headline', 'alignment'],
  } satisfies JsonSchemaLike,

  dataSchema: {
    type: 'object',
    properties: { headline: { type: 'string' }, subline: { type: 'string' } },
    required: ['headline'],
  } satisfies JsonSchemaLike,

  actions: [
    { id: 'show', label: 'Show' },
    { id: 'hide', label: 'Hide' },
  ],

  animationHooks: { enter: 'fadeScale', exit: 'fadeOut' },
  capabilities: { supportsLayerRegions: true },
};
```

- [ ] **Step 4: Create billboard module component**

`packages/modules/src/billboard/basic/BillboardBasic.vue`:
```vue
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
```

- [ ] **Step 5: Update registry and index**

Add to `packages/modules/src/index.ts`:
```ts
export { bugBasicManifest } from './bug/basic/manifest';
export { billboardBasicManifest } from './billboard/basic/manifest';
```

Add to `packages/modules/src/registry.ts` — import the manifests and add entries:
```ts
import { bugBasicManifest } from './bug/basic/manifest';
import { billboardBasicManifest } from './billboard/basic/manifest';

// Add to moduleComponents:
'bug.basic': () => import('./bug/basic/BugBasic.vue') as Promise<Component>,
'billboard.basic': () => import('./billboard/basic/BillboardBasic.vue') as Promise<Component>,

// Add to moduleManifests:
'bug.basic': bugBasicManifest,
'billboard.basic': billboardBasicManifest,
```

- [ ] **Step 6: Commit**

```bash
git add packages/modules/src/
git commit -m "feat(modules): add bug.basic and billboard.basic modules"
```

---

## Task 5: Clock + Countdown modules

**Files:**
- Create: `packages/modules/src/clock/basic/manifest.ts`
- Create: `packages/modules/src/clock/basic/ClockBasic.vue`
- Create: `packages/modules/src/countdown/basic/manifest.ts`
- Create: `packages/modules/src/countdown/basic/CountdownBasic.vue`
- Modify: `packages/modules/src/index.ts`
- Modify: `packages/modules/src/registry.ts`

- [ ] **Step 1: Create clock module manifest**

`packages/modules/src/clock/basic/manifest.ts`:
```ts
import type { ModuleManifest, JsonSchemaLike } from 'engine-core';

export const clockBasicManifest: ModuleManifest = {
  id: 'clock.basic',
  label: 'Basic Clock',
  version: '1.0.0',
  category: 'clock',

  configSchema: {
    type: 'object',
    properties: {
      format: { type: 'string', enum: ['12h', '24h'], default: '24h' },
      showSeconds: { type: 'boolean', default: true },
      label: { type: 'string', title: 'Label (optional)' },
    },
    required: ['format', 'showSeconds'],
  } satisfies JsonSchemaLike,

  dataSchema: { type: 'object', properties: {} } satisfies JsonSchemaLike,

  actions: [
    { id: 'show', label: 'Show' },
    { id: 'hide', label: 'Hide' },
  ],

  animationHooks: { enter: 'fadeIn', exit: 'fadeOut' },
};
```

- [ ] **Step 2: Create clock module component**

`packages/modules/src/clock/basic/ClockBasic.vue`:
```vue
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
```

- [ ] **Step 3: Create countdown module manifest**

`packages/modules/src/countdown/basic/manifest.ts`:
```ts
import type { ModuleManifest, JsonSchemaLike } from 'engine-core';

export const countdownBasicManifest: ModuleManifest = {
  id: 'countdown.basic',
  label: 'Basic Countdown',
  version: '1.0.0',
  category: 'countdown',

  configSchema: {
    type: 'object',
    properties: {
      targetTime: { type: 'string', title: 'Target Time (ISO 8601)' },
      label: { type: 'string', title: 'Label' },
      finishedText: { type: 'string', title: 'Text when complete', default: '00:00:00' },
    },
    required: ['targetTime'],
  } satisfies JsonSchemaLike,

  dataSchema: { type: 'object', properties: {} } satisfies JsonSchemaLike,

  actions: [
    { id: 'show', label: 'Show' },
    { id: 'hide', label: 'Hide' },
    { id: 'reset', label: 'Reset' },
  ],

  animationHooks: { enter: 'fadeIn', exit: 'fadeOut' },
};
```

- [ ] **Step 4: Create countdown module component**

`packages/modules/src/countdown/basic/CountdownBasic.vue`:
```vue
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
```

- [ ] **Step 5: Update registry and index**

Add to `packages/modules/src/index.ts`:
```ts
export { clockBasicManifest } from './clock/basic/manifest';
export { countdownBasicManifest } from './countdown/basic/manifest';
```

Add to `packages/modules/src/registry.ts` — import manifests and add to both maps:
```ts
import { clockBasicManifest } from './clock/basic/manifest';
import { countdownBasicManifest } from './countdown/basic/manifest';

// Add to moduleComponents:
'clock.basic': () => import('./clock/basic/ClockBasic.vue') as Promise<Component>,
'countdown.basic': () => import('./countdown/basic/CountdownBasic.vue') as Promise<Component>,

// Add to moduleManifests:
'clock.basic': clockBasicManifest,
'countdown.basic': countdownBasicManifest,
```

- [ ] **Step 6: Commit**

```bash
git add packages/modules/src/
git commit -m "feat(modules): add clock.basic and countdown.basic modules"
```

---

## Task 6: Module auto-registration + /api/modules route

**Files:**
- Create: `apps/engine-ui/server/plugins/register-modules.ts`
- Create: `apps/engine-ui/server/api/modules/index.get.ts`

- [ ] **Step 1: Create `apps/engine-ui/server/plugins/register-modules.ts`**

Nitro server plugins run once at startup. This scans the modules package and upserts all manifests into the DB.

```ts
import { moduleManifests } from 'modules/registry';
import { upsertModule } from 'engine-core';

export default defineNitroPlugin(() => {
  const db = useDb();

  for (const manifest of Object.values(moduleManifests)) {
    upsertModule(db, {
      moduleKey: manifest.id,
      label: manifest.label,
      version: manifest.version,
      category: manifest.category,
      configSchema: manifest.configSchema,
      dataSchema: manifest.dataSchema,
      actions: manifest.actions,
      animationHooks: manifest.animationHooks,
      capabilities: manifest.capabilities,
    });
  }

  console.log(`[CeeGee] Registered ${Object.keys(moduleManifests).length} modules`);
});
```

- [ ] **Step 2: Create `apps/engine-ui/server/api/modules/index.get.ts`**

```ts
import { listModules } from 'engine-core';

export default defineEventHandler(() => {
  return listModules(useDb());
});
```

- [ ] **Step 3: Test — start dev server, verify modules registered**

```bash
cd /home/andrew/Develop/CeeGee && pnpm dev &
sleep 12
curl -s http://localhost:3000/api/modules | head -20
```

Expected: returns an array of 5 module records with keys `lower-third.basic`, `bug.basic`, `billboard.basic`, `clock.basic`, `countdown.basic`.

- [ ] **Step 4: Commit**

```bash
git add apps/engine-ui/server/plugins/ apps/engine-ui/server/api/modules/
git commit -m "feat(engine-ui): add module auto-registration plugin and /api/modules route"
```

---

## Task 7: Composables (useEngineWs + useAssetUrl)

**Files:**
- Create: `apps/engine-ui/app/composables/useEngineWs.ts`
- Create: `apps/engine-ui/app/composables/useAssetUrl.ts`

- [ ] **Step 1: Create `apps/engine-ui/app/composables/useEngineWs.ts`**

```ts
import type { ChannelState, EngineEvent } from 'engine-core';

export function useEngineWs(workspaceId: Ref<number> | number, channelId: Ref<number> | number) {
  const channelState = ref<ChannelState | null>(null);
  const connected = ref(false);
  let ws: WebSocket | null = null;

  function connect() {
    if (import.meta.server) return; // SSR guard

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      connected.value = true;
      ws!.send(JSON.stringify({
        type: 'subscribe',
        workspaceId: toValue(workspaceId),
        channelId: toValue(channelId),
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data: EngineEvent = JSON.parse(event.data);
        if (data.type === 'state:init' || data.type === 'state:update') {
          channelState.value = data.payload as ChannelState;
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      connected.value = false;
      // Basic reconnect after 2 seconds
      setTimeout(connect, 2000);
    };

    ws.onerror = () => {
      ws?.close();
    };
  }

  onMounted(connect);

  onUnmounted(() => {
    const socket = ws;
    ws = null; // prevent reconnect
    socket?.close();
  });

  return { channelState: readonly(channelState), connected: readonly(connected) };
}
```

- [ ] **Step 2: Create `apps/engine-ui/app/composables/useAssetUrl.ts`**

```ts
export function useAssetUrl(workspaceId: MaybeRef<number>, assetId: MaybeRef<number | null | undefined>) {
  return computed(() => {
    const id = toValue(assetId);
    if (!id) return null;
    return `/api/workspaces/${toValue(workspaceId)}/assets/${id}/file`;
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/composables/
git commit -m "feat(engine-ui): add useEngineWs and useAssetUrl composables"
```

---

## Task 8: Layouts (default + overlay)

**Files:**
- Create: `apps/engine-ui/app/layouts/default.vue`
- Create: `apps/engine-ui/app/layouts/overlay.vue`
- Modify: `apps/engine-ui/app/app.vue`

- [ ] **Step 1: Create `apps/engine-ui/app/layouts/default.vue`**

Move the header/footer chrome from `app.vue` into the default layout:

```vue
<template>
  <UApp>
    <UHeader>
      <template #left>
        <NuxtLink to="/">
          <span class="font-bold text-lg">CeeGee</span>
        </NuxtLink>
      </template>
      <template #right>
        <UColorModeButton />
      </template>
    </UHeader>

    <UMain>
      <slot />
    </UMain>
  </UApp>
</template>
```

- [ ] **Step 2: Create `apps/engine-ui/app/layouts/overlay.vue`**

Transparent, full-viewport layout for overlay routes — no header, no footer, no background:

```vue
<template>
  <div class="overlay-layout">
    <slot />
  </div>
</template>

<style scoped>
.overlay-layout {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: transparent;
}
</style>
```

- [ ] **Step 3: Simplify `apps/engine-ui/app/app.vue`**

Replace the existing content with a layout-aware root:

```vue
<script setup>
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

useSeoMeta({
  title: 'CeeGee',
  description: 'Broadcast graphics engine'
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

- [ ] **Step 4: Commit**

```bash
git add apps/engine-ui/app/layouts/ apps/engine-ui/app/app.vue
git commit -m "feat(engine-ui): add default and overlay layouts, simplify app.vue"
```

---

## Task 9: OverlayHost component

**Files:**
- Create: `apps/engine-ui/app/components/overlay/OverlayHost.vue`

This is the core rendering component. It receives scope information, connects to WS, fetches metadata, and dynamically renders module components.

- [ ] **Step 1: Create `apps/engine-ui/app/components/overlay/OverlayHost.vue`**

```vue
<script setup lang="ts">
import { moduleComponents } from 'modules/registry';
import type {
  Workspace,
  Channel,
  Layer,
  Element,
  ModuleRecord,
  ChannelState,
  LayerState,
  ElementRuntimeState,
} from 'engine-core';

const props = defineProps<{
  workspaceId: number;
  channelId: number;
  filterLayerId?: number;
  filterElementId?: number;
}>();

// Fetch metadata
const { data: workspace } = await useFetch<Workspace>(`/api/workspaces/${props.workspaceId}`);
const { data: channel } = await useFetch<Channel>(
  `/api/workspaces/${props.workspaceId}/channels/${props.channelId}`
);
const { data: layerList } = await useFetch<Layer[]>(
  `/api/workspaces/${props.workspaceId}/channels/${props.channelId}/layers`
);
const { data: elementList } = await useFetch<Element[]>(
  `/api/workspaces/${props.workspaceId}/channels/${props.channelId}/elements`
);
const { data: moduleList } = await useFetch<ModuleRecord[]>('/api/modules');

// Build lookup maps
const layerMap = computed(() => {
  const m = new Map<number, Layer>();
  for (const l of layerList.value ?? []) m.set(l.id, l);
  return m;
});

const elementMap = computed(() => {
  const m = new Map<number, Element>();
  for (const e of elementList.value ?? []) m.set(e.id, e);
  return m;
});

const moduleKeyById = computed(() => {
  const m = new Map<number, string>();
  for (const mod of moduleList.value ?? []) m.set(mod.id, mod.moduleKey);
  return m;
});

// Connect to WebSocket for live state
const { channelState } = useEngineWs(props.workspaceId, props.channelId);

// Filter layers based on scope
const visibleLayers = computed<LayerState[]>(() => {
  if (!channelState.value) return [];
  let layers = channelState.value.layers;

  if (props.filterLayerId) {
    layers = layers.filter((l) => l.layerId === props.filterLayerId);
  }

  if (props.filterElementId) {
    layers = layers.map((l) => ({
      ...l,
      elements: l.elements.filter((e) => e.elementId === props.filterElementId),
    })).filter((l) => l.elements.length > 0);
  }

  return layers;
});

// Resolve module component by key
function getModuleComponent(moduleKey: string) {
  const loader = moduleComponents[moduleKey];
  if (!loader) return null;
  return defineAsyncComponent(loader);
}

// Theme token injection
const themeVars = computed(() => {
  if (!workspace.value) return {};
  const style: Record<string, string> = {};
  for (const [key, val] of Object.entries(workspace.value.themeTokens)) {
    style[key] = val;
  }
  return style;
});
</script>

<template>
  <div class="overlay-host" :style="themeVars">
    <template v-for="layerState in visibleLayers" :key="layerState.layerId">
      <div
        class="overlay-layer"
        :style="{ zIndex: layerMap.get(layerState.layerId)?.zIndex ?? 0 }"
      >
        <template v-for="elState in layerState.elements" :key="elState.elementId">
          <component
            v-if="getModuleComponent(moduleKeyById.get(elementMap.get(elState.elementId)?.moduleId ?? 0) ?? '')"
            :is="getModuleComponent(moduleKeyById.get(elementMap.get(elState.elementId)?.moduleId ?? 0) ?? '')"
            :workspace="workspace!"
            :channel="channel!"
            :layer="layerMap.get(layerState.layerId)!"
            :element="elementMap.get(elState.elementId)!"
            :config="elementMap.get(elState.elementId)?.config"
            :runtime-state="elState"
          />
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
.overlay-host {
  position: relative;
  width: 100%;
  height: 100%;
}
.overlay-layer {
  position: absolute;
  inset: 0;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add apps/engine-ui/app/components/overlay/
git commit -m "feat(engine-ui): add OverlayHost component with dynamic module loading"
```

---

## Task 10: Overlay page routes

**Files:**
- Create: `apps/engine-ui/app/pages/o/[workspaceId]/channel/[channelId].vue`
- Create: `apps/engine-ui/app/pages/o/[workspaceId]/layer/[layerId].vue`
- Create: `apps/engine-ui/app/pages/o/[workspaceId]/element/[elementId].vue`

- [ ] **Step 1: Create channel overlay page**

`apps/engine-ui/app/pages/o/[workspaceId]/channel/[channelId].vue`:
```vue
<script setup lang="ts">
definePageMeta({ layout: 'overlay' });

const route = useRoute();
const workspaceId = Number(route.params.workspaceId);
const channelId = Number(route.params.channelId);
</script>

<template>
  <OverlayHost :workspace-id="workspaceId" :channel-id="channelId" />
</template>
```

- [ ] **Step 2: Create layer overlay page**

`apps/engine-ui/app/pages/o/[workspaceId]/layer/[layerId].vue`:

The layer page needs to resolve which channel this layer belongs to, then render OverlayHost filtered to that layer.

```vue
<script setup lang="ts">
import type { Layer } from 'engine-core';

definePageMeta({ layout: 'overlay' });

const route = useRoute();
const workspaceId = Number(route.params.workspaceId);
const layerId = Number(route.params.layerId);

// Fetch layer to get channelId
const { data: layer } = await useFetch<Layer>(
  `/api/workspaces/${workspaceId}/channels/0/layers/${layerId}`
);
const channelId = computed(() => layer.value?.channelId ?? 0);
</script>

<template>
  <OverlayHost
    v-if="channelId"
    :workspace-id="workspaceId"
    :channel-id="channelId"
    :filter-layer-id="layerId"
  />
</template>
```

Note: The layer GET route uses `getLayer(db, layerId)` which doesn't need the channelId URL param — it looks up by primary key. The channelId in the URL path is ignored for the GET-by-ID route.

- [ ] **Step 3: Create element overlay page**

`apps/engine-ui/app/pages/o/[workspaceId]/element/[elementId].vue`:

```vue
<script setup lang="ts">
import type { Element } from 'engine-core';

definePageMeta({ layout: 'overlay' });

const route = useRoute();
const workspaceId = Number(route.params.workspaceId);
const elementId = Number(route.params.elementId);

// Fetch element to get channelId and layerId
const { data: element } = await useFetch<Element>(
  `/api/workspaces/${workspaceId}/channels/0/elements/${elementId}`
);
const channelId = computed(() => element.value?.channelId ?? 0);
</script>

<template>
  <OverlayHost
    v-if="channelId"
    :workspace-id="workspaceId"
    :channel-id="channelId"
    :filter-element-id="elementId"
  />
</template>
```

- [ ] **Step 4: Commit**

```bash
git add apps/engine-ui/app/pages/o/
git commit -m "feat(engine-ui): add overlay page routes (channel, layer, element)"
```

---

## Task 11: Smoke test + final verification

- [ ] **Step 1: Run engine-core tests**

```bash
cd /home/andrew/Develop/CeeGee && pnpm test
```

Expected: all 58 engine-core tests pass.

- [ ] **Step 2: Start dev server and verify module registration**

```bash
pnpm dev &
sleep 12

# Verify modules registered
curl -s http://localhost:3000/api/modules | python3 -c "import sys,json; mods=json.load(sys.stdin); print(f'{len(mods)} modules:', [m['moduleKey'] for m in mods])"
```

Expected: `5 modules: ['lower-third.basic', 'bug.basic', 'billboard.basic', 'clock.basic', 'countdown.basic']`

- [ ] **Step 3: Create test data and verify overlay renders**

```bash
# Create workspace, channel, layer, element
curl -s -X POST http://localhost:3000/api/workspaces -H 'Content-Type: application/json' -d '{"name":"Test Show"}'
curl -s -X POST http://localhost:3000/api/workspaces/1/channels -H 'Content-Type: application/json' -d '{"name":"Program"}'
curl -s -X POST http://localhost:3000/api/workspaces/1/channels/1/layers -H 'Content-Type: application/json' -d '{"name":"Lower Thirds","zIndex":10}'

# Need module ID — get it from the modules list
MODULE_ID=$(curl -s http://localhost:3000/api/modules | python3 -c "import sys,json; mods=json.load(sys.stdin); print(next(m['id'] for m in mods if m['moduleKey']=='lower-third.basic'))")

curl -s -X POST http://localhost:3000/api/workspaces/1/channels/1/elements -H 'Content-Type: application/json' \
  -d "{\"name\":\"Andrew / Creative Tech\",\"layerId\":1,\"moduleId\":$MODULE_ID,\"config\":{\"primaryText\":\"Andrew\",\"secondaryText\":\"Creative Technologist\",\"alignment\":\"left\",\"variant\":\"solid\",\"showLogo\":false}}"

# Take the element to make it visible
curl -s -X POST http://localhost:3000/api/workspaces/1/channels/1/elements/1/take

echo "Open http://localhost:3000/o/1/channel/1 in a browser to see the overlay"
```

Expected: visiting `/o/1/channel/1` shows a transparent page. After the take, the lower third should animate in with the speaker's name.

- [ ] **Step 4: Commit any final adjustments**

```bash
git add -A
git commit -m "feat: verify overlay system with modules, WS, and GSAP animations"
```
