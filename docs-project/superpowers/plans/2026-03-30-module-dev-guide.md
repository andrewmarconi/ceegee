# Module Development Guide Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single modules doc page with three focused pages covering architecture, creation walkthrough, and API reference.

**Architecture:** Delete `33.modules.md`, create three new pages (`33.module-architecture.md`, `34.creating-a-module.md`, `35.module-api-reference.md`), and rename `34.testing.md` to `36.testing.md` to maintain sidebar ordering.

**Tech Stack:** VuePress (Plume theme), Markdown

---

### Task 1: Rename Testing Page

**Files:**
- Rename: `docs/developer/34.testing.md` → `docs/developer/36.testing.md`

- [ ] **Step 1: Rename the file**

```bash
git mv docs/developer/34.testing.md docs/developer/36.testing.md
```

- [ ] **Step 2: Commit**

```bash
git add docs/developer/36.testing.md
git commit -m "docs: renumber testing page to make room for module docs (#51)"
```

### Task 2: Create Module Architecture Page

**Files:**
- Create: `docs/developer/33.module-architecture.md`
- Delete: `docs/developer/33.modules.md`

- [ ] **Step 1: Create the architecture page**

Create `docs/developer/33.module-architecture.md` with the following content:

````markdown
---
title: Module Architecture
---

# Module Architecture

Modules are the visual building blocks of CeeGee overlays. Each module is a Vue component paired with a manifest that describes its configuration, actions, and animations.

## What is a Module?

A module has two parts:

- **Manifest** (`manifest.ts`) — A TypeScript object that describes the module's identity, configuration schema, available actions, animation hooks, and theme tokens. The manifest is server-safe (no Vue imports).
- **Vue Component** (`.vue` file) — Renders the overlay graphic and drives GSAP animations in response to visibility changes and operator actions.

Modules live in `packages/modules/src/`, organized by category and variant:

```
packages/modules/src/
├── index.ts                    # Exports all manifests (server-safe)
├── registry.ts                 # Maps module keys to Vue components
├── lower-third/
│   └── basic/
│       ├── manifest.ts         # ModuleManifest
│       └── LowerThirdBasic.vue # Vue component
├── bug/basic/
├── billboard/basic/
├── clock/basic/
└── countdown/basic/
```

The `category.variant` naming convention (e.g., `lower-third.basic`) allows multiple implementations of the same category. For example, you could create `lower-third.minimal` alongside `lower-third.basic`.

## Lifecycle

### 1. Registration

On server startup, the Nitro plugin `server/plugins/register-modules.ts` imports all manifests from `packages/modules/src/index.ts` and upserts each into the `modules` database table. Adding a new module is as simple as adding its manifest to the exports and restarting the server.

### 2. Element Creation

When a producer creates an element, they select a module type. The Producer UI reads the module's `configSchema` and generates a configuration form. The element's config is stored as JSON in the database.

### 3. Overlay Rendering

The `OverlayHost.vue` component is the overlay renderer. For each element in the channel:

1. It looks up the module key from the element's `moduleId`.
2. It resolves the Vue component from `packages/modules/src/registry.ts`.
3. It instantiates the component with `ModuleComponentProps` — workspace, channel, layer, element, config, and runtime state.

### 4. Runtime Control

When an operator takes an element live, clears it, or triggers an action:

1. The engine updates `elementRuntimeState` in the database (visibility and runtimeData).
2. A WebSocket broadcast sends the updated state to all connected overlay clients.
3. The module component watches `runtimeState.visibility` and `runtimeState.runtimeData` to trigger GSAP animations.

## Data Flow

```
Producer UI                    Operator UI
     │                              │
     ▼                              ▼
  REST API ──────────────────► engine-core
                                    │
                              ┌─────┴─────┐
                              ▼           ▼
                           SQLite    WebSocket
                                     broadcast
                                         │
                                         ▼
                                   OverlayHost
                                         │
                                         ▼
                                  Module Component
                                  (Vue + GSAP)
```

- **Producer** creates and configures elements via REST API.
- **Operator** triggers take/clear/actions via REST API, which updates runtime state.
- **Engine-core** persists state to SQLite and broadcasts changes over WebSocket.
- **OverlayHost** receives state updates and passes them to module components as props.
- **Module components** react to prop changes by playing animations.

## Key Concepts

### Config vs Runtime State

- **Config** is set by the producer and stored on the element. It defines *what* the module displays (text content, colors, options). Config changes require editing the element.
- **Runtime state** is set by the operator and stored in `elementRuntimeState`. It controls *how* the module behaves right now (visibility, last action triggered). Runtime state changes happen in real-time during a live show.

### Theme Tokens

Modules can declare theme tokens — CSS custom properties that are editable at the workspace level. This allows producers to customize module appearance (colors, sizes, fonts) without editing individual element configs. Theme tokens are injected as CSS variables on the overlay root element.

### Visibility State Machine

Elements move through four visibility states:

```
hidden → entering → visible → exiting → hidden
```

- **hidden** — Not rendered or fully transparent.
- **entering** — Enter animation playing (triggered by "take").
- **visible** — Fully visible on screen.
- **exiting** — Exit animation playing (triggered by "clear").

Module components watch `runtimeState.visibility` and play the appropriate GSAP animation for each transition.
````

- [ ] **Step 2: Delete the old modules page**

```bash
git rm docs/developer/33.modules.md
```

- [ ] **Step 3: Commit**

```bash
git add docs/developer/33.module-architecture.md
git commit -m "docs: add module architecture page, remove old modules page (#51)"
```

### Task 3: Create the Creating a Module Page

**Files:**
- Create: `docs/developer/34.creating-a-module.md`

- [ ] **Step 1: Create the walkthrough page**

Create `docs/developer/34.creating-a-module.md` with the following content:

````markdown
---
title: Creating a Module
---

# Creating a Module

This guide walks through creating a module from scratch. By the end, you'll have a working "text-card" module that displays a message with a configurable background color and fade animations.

## Step 1: Create the Manifest

Create the directory and manifest file:

```
packages/modules/src/text-card/basic/manifest.ts
```

```ts
import type { ModuleManifest, JsonSchemaLike } from 'engine-core';

export const textCardBasicManifest: ModuleManifest = {
  id: 'text-card.basic',
  label: 'Text Card',
  version: '1.0.0',
  category: 'text-card',

  configSchema: {
    type: 'object',
    properties: {
      message: { type: 'string', title: 'Message' },
      bgColor: { type: 'string', title: 'Background Color', default: 'rgba(0, 0, 0, 0.8)' },
    },
    required: ['message'],
  } satisfies JsonSchemaLike,

  dataSchema: {
    type: 'object',
    properties: {
      message: { type: 'string' },
    },
    required: ['message'],
  } satisfies JsonSchemaLike,

  actions: [
    { id: 'show', label: 'Show' },
    { id: 'hide', label: 'Hide' },
  ],

  animationHooks: {
    enter: 'fadeIn',
    exit: 'fadeOut',
  },

  capabilities: {
    supportsLayerRegions: false,
    supportsMultipleInstancesPerLayer: true,
  },

  themeTokens: [
    {
      key: '--tc-text-color',
      label: 'Text Color',
      type: 'text',
      default: '#ffffff',
    },
    {
      key: '--tc-font-size',
      label: 'Font Size',
      type: 'text',
      default: '2rem',
    },
  ],
};
```

### Manifest breakdown

| Field | Value | Purpose |
|-------|-------|---------|
| `id` | `'text-card.basic'` | Stable key in `category.variant` format |
| `configSchema` | JSON Schema object | Defines the form fields in Producer UI |
| `dataSchema` | JSON Schema object | Describes dynamic data fields (mirrors config for now) |
| `actions` | show, hide | Controls available in Operator UI |
| `animationHooks` | enter, exit | Named hooks — your component implements these with GSAP |
| `themeTokens` | text color, font size | Workspace-level CSS custom properties |

## Step 2: Create the Vue Component

Create the component file:

```
packages/modules/src/text-card/basic/TextCardBasic.vue
```

```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import gsap from 'gsap';
import type { ModuleComponentProps } from 'engine-core';

interface TextCardConfig {
  message: string;
  bgColor: string;
}

const props = defineProps<ModuleComponentProps>();

const config = computed(() => props.config as TextCardConfig);

const rootEl = ref<HTMLElement | null>(null);

let currentTl: gsap.core.Timeline | null = null;

const playEnter = () => {
  if (!rootEl.value) return;
  currentTl?.kill();
  currentTl = gsap.timeline();
  currentTl.fromTo(
    rootEl.value,
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
  );
};

const playExit = () => {
  if (!rootEl.value) return;
  currentTl?.kill();
  currentTl = gsap.timeline();
  currentTl.to(rootEl.value, {
    opacity: 0,
    y: -20,
    duration: 0.4,
    ease: 'power2.in',
  });
};

watch(
  () => props.runtimeState.visibility,
  (vis) => {
    if (vis === 'entering' || vis === 'visible') playEnter();
    else if (vis === 'exiting' || vis === 'hidden') playExit();
  },
  { immediate: true },
);
</script>

<template>
  <div
    ref="rootEl"
    class="text-card"
    :style="{ backgroundColor: config.bgColor }"
  >
    <p class="text-card__message">{{ config.message }}</p>
  </div>
</template>

<style scoped>
.text-card {
  position: absolute;
  bottom: 10%;
  left: 50%;
  transform: translateX(-50%);
  padding: 1.5rem 3rem;
  border-radius: 0.5rem;
}

.text-card__message {
  margin: 0;
  font-size: var(--tc-font-size, 2rem);
  color: var(--tc-text-color, #ffffff);
  font-weight: 600;
}
</style>
```

### Key patterns in this component

- **Cast config** — `props.config` is `unknown`; cast it to your module's config interface via `computed`.
- **Kill conflicting timelines** — Always call `currentTl?.kill()` before starting a new animation. This prevents enter and exit animations from overlapping.
- **Watch visibility** — `props.runtimeState.visibility` drives enter/exit. Respond to `entering`/`visible` for enter and `exiting`/`hidden` for exit.
- **Use CSS variables for theme tokens** — Reference workspace-level tokens with `var(--token-key, fallback)`.
- **No Tailwind** — Module components use scoped CSS only. Tailwind is reserved for the control UI.

## Step 3: Register the Module

### Add to the manifest index

```ts
// packages/modules/src/index.ts
import { textCardBasicManifest } from './text-card/basic/manifest';

export const allManifests: ModuleManifest[] = [
  // ... existing manifests
  textCardBasicManifest,
];
```

### Add to the component registry

```ts
// packages/modules/src/registry.ts
import { textCardBasicManifest } from './text-card/basic/manifest';

export const moduleComponents: Record<string, () => Promise<Component>> = {
  // ... existing entries
  'text-card.basic': () => import('./text-card/basic/TextCardBasic.vue') as Promise<Component>,
};

export const moduleManifests: Record<string, ModuleManifest> = {
  // ... existing entries
  'text-card.basic': textCardBasicManifest,
};
```

## Step 4: Test It

1. Restart the dev server: `pnpm dev`
2. Open the Producer UI and create a new element. "Text Card" should appear in the module list.
3. Fill in the message and background color fields.
4. Open the Operator UI and take the element live. The text card should fade in.
5. Clear the element. The text card should fade out.

## Styling Guidelines

- **Scoped CSS only** — Never use global styles or Tailwind in module components.
- **CSS variables for theming** — Define theme tokens in the manifest and reference them with `var(--key, fallback)` in your CSS. This lets producers customize appearance at the workspace level.
- **Relative units** — Use `%`, `vw`, `vh`, and `rem` for layout. The base resolution is 1920x1080 but overlays should adapt to different resolutions.
- **Absolute positioning** — Module components are rendered inside a full-screen overlay container. Use `position: absolute` with percentage-based positioning.
````

- [ ] **Step 2: Commit**

```bash
git add docs/developer/34.creating-a-module.md
git commit -m "docs: add creating a module walkthrough with example (#51)"
```

### Task 4: Create the Module API Reference Page

**Files:**
- Create: `docs/developer/35.module-api-reference.md`

- [ ] **Step 1: Create the API reference page**

Create `docs/developer/35.module-api-reference.md` with the following content:

````markdown
---
title: Module API Reference
---

# Module API Reference

Complete reference for all types, interfaces, and conventions used in the CeeGee module system. All types are exported from the `engine-core` package.

## ModuleManifest

The manifest is the contract between a module and the engine.

```ts
type ModuleManifest = {
  id: string;
  label: string;
  version: string;
  category: ModuleCategory;
  configSchema: JsonSchemaLike;
  dataSchema: JsonSchemaLike;
  actions: ModuleAction[];
  animationHooks: ModuleAnimationHooks;
  capabilities?: ModuleCapabilities;
  themeTokens?: ThemeTokenDef[];
};
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Stable key in `category.variant` format (e.g., `lower-third.basic`). Stored as `moduleKey` in the database. |
| `label` | `string` | Human-readable name shown in the UI. |
| `version` | `string` | Semver string. Updated manifests are upserted on startup. |
| `category` | `ModuleCategory` | Groups modules in the UI. |
| `configSchema` | `JsonSchemaLike` | JSON Schema defining element configuration fields. |
| `dataSchema` | `JsonSchemaLike` | JSON Schema for dynamic data fields. |
| `actions` | `ModuleAction[]` | Controls available to operators. |
| `animationHooks` | `ModuleAnimationHooks` | Named GSAP animation hooks. |
| `capabilities` | `ModuleCapabilities` | Optional feature flags. |
| `themeTokens` | `ThemeTokenDef[]` | Optional workspace-level CSS custom properties. |

## ModuleComponentProps

Props passed to every module's Vue component by `OverlayHost`.

```ts
type ModuleComponentProps = {
  workspace: Workspace;
  channel: Channel;
  layer: Layer;
  element: Element;
  config: unknown;
  runtimeState: ElementRuntimeState;
};
```

| Prop | Type | Description |
|------|------|-------------|
| `workspace` | `Workspace` | Current workspace with display config and theme tokens. |
| `channel` | `Channel` | Current channel. |
| `layer` | `Layer` | Layer this element belongs to (z-index, region). |
| `element` | `Element` | Element metadata (name, sort order, module reference). |
| `config` | `unknown` | Element config JSON. Cast to your module's config type. |
| `runtimeState` | `ElementRuntimeState` | Current visibility and runtime data. |

## ElementRuntimeState

```ts
type ElementVisibility = 'hidden' | 'entering' | 'visible' | 'exiting';

type ElementRuntimeState = {
  elementId: ElementId;
  visibility: ElementVisibility;
  runtimeData: unknown;
  updatedAt: IsoDateTime;
};
```

### Visibility State Machine

```
hidden → entering → visible → exiting → hidden
```

| State | Meaning | Triggered By |
|-------|---------|-------------|
| `hidden` | Not visible, no animation playing | Initial state, or after exit completes |
| `entering` | Enter animation should play | Operator takes element live |
| `visible` | Fully visible on screen | After enter animation |
| `exiting` | Exit animation should play | Operator clears element |

### runtimeData

The `runtimeData` field contains dynamic state set by the engine. The most important property is `lastAction`:

```ts
{
  lastAction: {
    actionId: string;  // matches an action id from the manifest
    args: unknown;
    ts: string;        // ISO timestamp
  }
}
```

Watch `runtimeData` to respond to action-triggered effects (e.g., emphasize, reset).

## Config Schema

The `configSchema` field uses JSON Schema to define the element configuration form in the Producer UI.

### Supported Field Types

| JSON Schema Type | UI Control | Example |
|-----------------|------------|---------|
| `{ type: 'string' }` | Text input | `{ type: 'string', title: 'Headline' }` |
| `{ type: 'number' }` | Number input | `{ type: 'number', title: 'Opacity', default: 1 }` |
| `{ type: 'integer' }` | Number input (whole) | `{ type: 'integer', title: 'Size' }` |
| `{ type: 'boolean' }` | Toggle switch | `{ type: 'boolean', title: 'Show Logo', default: false }` |
| `{ type: 'string', enum: [...] }` | Dropdown select | `{ type: 'string', enum: ['left', 'center', 'right'], default: 'center' }` |
| `{ type: ['integer', 'null'] }` | Asset picker | `{ type: ['integer', 'null'], title: 'Logo' }` |

### Asset References

To let producers select an uploaded asset (image, SVG), use the nullable integer pattern:

```ts
configSchema: {
  type: 'object',
  properties: {
    logoAssetId: { type: ['integer', 'null'], title: 'Logo' },
  },
}
```

The Producer UI renders this as an asset picker. The value is the asset's numeric ID, or `null` if no asset is selected.

### Required Fields

List field names in the `required` array to make them mandatory:

```ts
configSchema: {
  type: 'object',
  properties: {
    headline: { type: 'string', title: 'Headline' },
    subline: { type: 'string', title: 'Subline' },
  },
  required: ['headline'],
}
```

## Actions

Actions are module-specific controls available to operators.

### Defining Actions

```ts
actions: [
  { id: 'show', label: 'Show' },
  { id: 'hide', label: 'Hide' },
  { id: 'emphasize', label: 'Emphasize' },
]
```

```ts
type ModuleAction = {
  id: string;
  label: string;
};
```

### How Actions Flow

1. Operator clicks an action button in the Operator UI.
2. REST API calls `elementAction()` in engine-core.
3. Engine writes `{ lastAction: { actionId, args, ts } }` to `runtimeData`.
4. WebSocket broadcasts the updated state.
5. Module component detects the change via a watcher.

### Responding to Actions

Watch `runtimeState.runtimeData` for action triggers:

```ts
watch(
  () => props.runtimeState.runtimeData,
  (rd) => {
    const action = (rd as any)?.lastAction;
    if (!action) return;

    switch (action.actionId) {
      case 'emphasize':
        playEmphasize();
        break;
      case 'reset':
        resetState();
        break;
    }
  },
);
```

## Animation Hooks

```ts
type ModuleAnimationHooks = {
  enter?: string;
  exit?: string;
  emphasize?: string;
};
```

Animation hooks are named labels (e.g., `fadeIn`, `slideUp`). The names are descriptive only — your component implements the actual animations using GSAP.

### GSAP Patterns

**Basic fade:**

```ts
gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' });
```

**Timeline for multi-step animations:**

```ts
const tl = gsap.timeline();
tl.fromTo(el, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 });
tl.fromTo(textEl, { opacity: 0 }, { opacity: 1, duration: 0.3 }, '-=0.1');
```

**Kill conflicting timelines:**

Always kill the previous timeline before starting a new one. This prevents animations from overlapping when an operator rapidly takes and clears an element.

```ts
let currentTl: gsap.core.Timeline | null = null;

const playEnter = () => {
  currentTl?.kill();
  currentTl = gsap.timeline();
  currentTl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.4 });
};

const playExit = () => {
  currentTl?.kill();
  currentTl = gsap.timeline();
  currentTl.to(el, { opacity: 0, duration: 0.3 });
};
```

## Theme Tokens

Theme tokens are workspace-level CSS custom properties that let producers customize module appearance without editing individual elements.

```ts
type ThemeTokenDef = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'dropdown';
  default: string;
  options?: string[];   // required when type is 'dropdown'
};
```

### Defining Theme Tokens

```ts
themeTokens: [
  { key: '--lt-primary-color', label: 'Primary Color', type: 'text', default: '#ffffff' },
  { key: '--lt-bg-opacity', label: 'Background Opacity', type: 'number', default: '0.8' },
  {
    key: '--lt-style',
    label: 'Style',
    type: 'dropdown',
    default: 'solid',
    options: ['solid', 'glass', 'outline'],
  },
],
```

### How Tokens Are Injected

`OverlayHost.vue` reads the workspace's `themeTokens` object and injects all key-value pairs as inline CSS custom properties on the overlay root element. This makes them available to all module components.

### Using Tokens in CSS

Reference tokens with `var()` and always provide a fallback matching the token's default:

```css
.my-module {
  color: var(--lt-primary-color, #ffffff);
  background: rgba(0, 0, 0, var(--lt-bg-opacity, 0.8));
}
```

### Naming Convention

Prefix token keys with a short module identifier to avoid collisions:

| Module | Prefix | Example |
|--------|--------|---------|
| lower-third | `--lt-` | `--lt-primary-color` |
| billboard | `--bb-` | `--bb-headline-size` |
| bug | `--bug-` | `--bug-opacity` |

## Capabilities

```ts
type ModuleCapabilities = {
  supportsLayerRegions?: boolean;
  supportsMultipleInstancesPerLayer?: boolean;
};
```

| Flag | Default | Description |
|------|---------|-------------|
| `supportsLayerRegions` | `false` | When `true`, the module can be positioned in named layer regions (`band-lower`, `band-upper`, `corner-tl`, `corner-tr`, `corner-bl`, `corner-br`, `full`). |
| `supportsMultipleInstancesPerLayer` | `false` | When `true`, multiple elements using this module can coexist on the same layer. |

## ModuleCategory

```ts
type ModuleCategory =
  | 'lower-third'
  | 'bug'
  | 'billboard'
  | 'clock'
  | 'countdown'
  | (string & {});
```

The union includes known categories plus an open `string` escape hatch for custom categories. Use a known category when your module fits, or define a new one for novel module types.

## Built-in Modules

| Module Key | Category | Description |
|------------|----------|-------------|
| `lower-third.basic` | lower-third | Name/title/role overlay with slide animations and optional logo |
| `bug.basic` | bug | Corner brand bug with logo, text, and position options |
| `billboard.basic` | billboard | Full-width text display with background image support |
| `clock.basic` | clock | Real-time clock with 12h/24h format and timezone support |
| `countdown.basic` | countdown | Countdown timer with start/stop/reset actions |
````

- [ ] **Step 2: Commit**

```bash
git add docs/developer/35.module-api-reference.md
git commit -m "docs: add module API reference page (#51)"
```

### Task 5: Verify Build

- [ ] **Step 1: Run the docs build**

```bash
cd docs && pnpm run docs:build
```

Expected: Build succeeds. Page count should be 24 (was 23 — removed 1 page, added 3 = net +2).

- [ ] **Step 2: Verify sidebar ordering**

Check that the developer sidebar shows:
1. Home
2. Getting Started
3. Architecture
4. Engine Core
5. Engine UI
6. Module Architecture (new)
7. Creating a Module (new)
8. Module API Reference (new)
9. Testing (renumbered)
10. WebSocket Protocol
