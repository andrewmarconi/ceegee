# Operator Status Color-Coding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify element visibility color-coding across all Operator UI components with a broadcast-switcher aesthetic — two primary states (on air / ready) with animated transitions for entering/exiting.

**Architecture:** A shared composable (`useVisibilityStyle`) maps `ElementVisibility` to CSS classes. Each Operator component consumes the composable instead of computing styles locally. Keyframe animations are defined once in `main.css`.

**Tech Stack:** Vue 3, Tailwind CSS 4, PrimeVue Tags, CSS keyframe animations

---

### Task 1: Define CSS keyframe animations in main.css

**Files:**
- Modify: `apps/engine-ui/app/assets/css/main.css`

- [ ] **Step 1: Add keyframe animations and utility classes**

Add to the end of `apps/engine-ui/app/assets/css/main.css`:

```css
/* -- Operator status color-coding -- */

@keyframes status-entering {
  0% { opacity: 0.4; }
  100% { opacity: 1; }
}

@keyframes status-exiting {
  0% { opacity: 1; box-shadow: 0 0 8px oklch(0.637 0.237 25.331 / 0.5); }
  100% { opacity: 0.6; box-shadow: 0 0 0px oklch(0.637 0.237 25.331 / 0); }
}

.status-visible {
  background-color: oklch(0.637 0.237 25.331);
  border-color: oklch(0.704 0.191 22.216);
  color: white;
  box-shadow: 0 0 8px oklch(0.637 0.237 25.331 / 0.5);
}

.status-entering {
  background-color: oklch(0.637 0.237 25.331 / 0.6);
  border-color: oklch(0.704 0.191 22.216);
  color: white;
  animation: status-entering 1s ease-in-out infinite alternate;
}

.status-exiting {
  background-color: oklch(0.637 0.237 25.331 / 0.4);
  border-color: var(--color-surface-600);
  color: var(--color-surface-200);
  animation: status-exiting 1s ease-in-out forwards;
}

.status-hidden {
  background-color: var(--color-surface-800);
  border-color: var(--color-surface-600);
  color: var(--color-surface-300);
}
```

Note: `oklch(0.637 0.237 25.331)` is Tailwind's `red-500`, `oklch(0.704 0.191 22.216)` is `red-400`. Using raw values since these are in a CSS file outside Tailwind utility classes.

- [ ] **Step 2: Verify CSS loads without errors**

Run: `cd apps/engine-ui && npx nuxi dev`

Open the operator page in a browser and confirm no CSS errors in the console. The new classes aren't used yet, so no visual changes expected.

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/assets/css/main.css
git commit -m "feat(operator): add CSS keyframe animations for status color-coding (#39)"
```

---

### Task 2: Create useVisibilityStyle composable

**Files:**
- Create: `apps/engine-ui/app/composables/useVisibilityStyle.ts`

- [ ] **Step 1: Create the composable**

Create `apps/engine-ui/app/composables/useVisibilityStyle.ts`:

```ts
import type { ElementVisibility } from 'engine-core'

const visibilityClassMap: Record<ElementVisibility, string> = {
  visible: 'status-visible',
  entering: 'status-entering',
  exiting: 'status-exiting',
  hidden: 'status-hidden',
}

const visibilityLabelMap: Record<ElementVisibility, string> = {
  visible: 'On Air',
  entering: 'Entering',
  exiting: 'Exiting',
  hidden: 'Ready',
}

const visibilitySeverityMap: Record<ElementVisibility, 'danger' | 'warn' | 'secondary'> = {
  visible: 'danger',
  entering: 'danger',
  exiting: 'warn',
  hidden: 'secondary',
}

export function useVisibilityStyle(visibility: MaybeRefOrGetter<ElementVisibility>) {
  const vis = computed(() => toValue(visibility))

  const statusClass = computed(() => visibilityClassMap[vis.value])
  const statusLabel = computed(() => visibilityLabelMap[vis.value])
  const statusSeverity = computed(() => visibilitySeverityMap[vis.value])
  const isLive = computed(() => vis.value === 'visible' || vis.value === 'entering')

  return { statusClass, statusLabel, statusSeverity, isLive }
}
```

- [ ] **Step 2: Verify the composable auto-imports**

Run `cd apps/engine-ui && npx nuxi dev` — Nuxt auto-imports composables from the `composables/` directory. Open the browser and confirm no build errors.

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/composables/useVisibilityStyle.ts
git commit -m "feat(operator): add useVisibilityStyle composable (#39)"
```

---

### Task 3: Update ElementGrid to use broadcast-switcher styling

**Files:**
- Modify: `apps/engine-ui/app/components/operator/ElementGrid.vue`

- [ ] **Step 1: Replace local style logic with composable**

In `ElementGrid.vue`, remove the `isLive` function (lines 41-44). Replace `getElementVisibility` usage with the composable in the template. The full updated file:

**Script section** — replace the entire `<script setup>` block:

```vue
<script setup lang="ts">
import type { Element, Layer, ChannelState, ElementVisibility } from 'engine-core'

const props = defineProps<{
  layers: Layer[]
  elements: Element[]
  channelState: ChannelState | null
  selectedLayerId: number | null
}>()

const emit = defineEmits<{
  toggle: [elementId: number]
  edit: [elementId: number]
}>()

const sortedLayers = computed(() =>
  [...props.layers].sort((a, b) => a.zIndex - b.zIndex)
)

const visibleLayers = computed(() => {
  if (props.selectedLayerId === null) return sortedLayers.value
  return sortedLayers.value.filter(l => l.id === props.selectedLayerId)
})

function elementsForLayer(layerId: number): Element[] {
  return props.elements
    .filter(e => e.layerId === layerId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

function getElementVisibility(elementId: number): ElementVisibility {
  if (!props.channelState) return 'hidden'
  for (const layer of props.channelState.layers) {
    for (const el of layer.elements) {
      if (el.elementId === elementId) return el.visibility
    }
  }
  return 'hidden'
}

function getStatusClass(elementId: number): string {
  const { statusClass } = useVisibilityStyle(() => getElementVisibility(elementId))
  return statusClass.value
}

function getIsLive(elementId: number): boolean {
  const { isLive } = useVisibilityStyle(() => getElementVisibility(elementId))
  return isLive.value
}
</script>
```

**Template section** — replace the entire `<template>` block:

```vue
<template>
  <div class="flex flex-col h-full overflow-y-auto p-4 gap-4">
    <div
      v-if="visibleLayers.length === 0"
      class="flex-1 flex items-center justify-center text-sm text-surface-400"
    >
      No layers in this channel.
    </div>

    <div
      v-for="layer in visibleLayers"
      :key="layer.id"
      class="rounded-lg border border-surface-700 p-3"
    >
      <h3 class="text-xs font-medium text-surface-500 uppercase tracking-wide mb-3">
        {{ layer.name }}
      </h3>

      <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        <div
          v-if="elementsForLayer(layer.id).length === 0"
          class="col-span-full text-sm text-surface-500 py-4 text-center"
        >
          No elements on this layer.
        </div>

        <button
          v-for="element in elementsForLayer(layer.id)"
          :key="element.id"
          class="relative flex items-center rounded-md border overflow-hidden transition-all group"
          :class="[
            getStatusClass(element.id),
            getIsLive(element.id)
              ? 'hover:brightness-110'
              : 'hover:border-surface-500'
          ]"
          @click="emit('toggle', element.id)"
        >
          <span class="flex-1 px-4 py-4 text-sm font-medium text-left truncate">
            {{ element.name }}
          </span>

          <button
            class="absolute right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/20"
            title="Edit element"
            @click.stop="emit('edit', element.id)"
          >
            <i class="pi pi-pencil text-xs" />
          </button>
        </button>
      </div>
    </div>
  </div>
</template>
```

Key changes:
- Removed the right-side vertical indicator bar (`<div class="absolute right-0 top-0 bottom-0 w-2">`)
- Entire button now gets `status-visible`/`status-entering`/`status-exiting`/`status-hidden` class via `getStatusClass()` helper
- Edit button moved to `right-2` (no longer needs `right-8` offset for the indicator bar)
- Edit button uses `hover:bg-black/20` to work on both red and dark backgrounds

- [ ] **Step 2: Verify in browser**

Run dev server. Navigate to the operator page. Element buttons should:
- Show red background with glow when on air (`visible`)
- Show dark neutral background when ready (`hidden`)
- Pulse when entering, fade when exiting

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/components/operator/ElementGrid.vue
git commit -m "feat(operator): apply broadcast-switcher color-coding to ElementGrid (#39)"
```

---

### Task 4: Update LayerFilter to use unified colors

**Files:**
- Modify: `apps/engine-ui/app/components/operator/LayerFilter.vue`

- [ ] **Step 1: Update tag colors and add red left-border for live layers**

Replace the entire `<template>` block in `LayerFilter.vue`:

```vue
<template>
  <div class="flex flex-col h-full">
    <div class="px-3 py-2 border-b border-surface-700">
      <h2 class="text-sm font-semibold text-surface-400 uppercase tracking-wide">
        Layers
      </h2>
    </div>

    <div class="flex-1 overflow-y-auto">
      <button
        v-if="showAllLayers"
        class="w-full text-left px-3 py-3 border-b border-surface-800 transition-colors hover:bg-surface-800/50"
        :class="{
          'bg-primary-900/20 border-l-2 border-l-primary-500': selectedLayerId === null,
          'border-l-2 border-l-transparent': selectedLayerId !== null,
        }"
        @click="emit('update:selectedLayerId', null)"
      >
        <span class="text-sm font-medium">All Layers</span>
      </button>

      <button
        v-for="layer in sortedLayers"
        :key="layer.id"
        class="w-full text-left px-3 py-3 border-b border-surface-800 transition-colors hover:bg-surface-800/50"
        :class="{
          'bg-primary-900/20 border-l-2 border-l-primary-500': selectedLayerId === layer.id && !isLayerLive(layer.id),
          'bg-primary-900/20 border-l-2 border-l-red-500': selectedLayerId === layer.id && isLayerLive(layer.id),
          'border-l-2 border-l-red-500': selectedLayerId !== layer.id && isLayerLive(layer.id),
          'border-l-2 border-l-transparent': selectedLayerId !== layer.id && !isLayerLive(layer.id),
        }"
        @click="emit('update:selectedLayerId', layer.id)"
      >
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium">{{ layer.name }}</span>
          <Tag
            v-if="isLayerLive(layer.id)"
            severity="danger"
            class="text-xs"
          >
            ON AIR
          </Tag>
          <Tag
            v-else
            severity="secondary"
            class="text-xs"
          >
            READY
          </Tag>
        </div>
      </button>
    </div>
  </div>
</template>
```

Key changes:
- Live layers get `border-l-red-500` regardless of selection state
- Selected + live = `bg-primary-900/20` + `border-l-red-500`
- Selected + not live = existing `bg-primary-900/20` + `border-l-primary-500`
- Not selected + live = `border-l-red-500`
- Not selected + not live = `border-l-transparent`
- Tag severity for ready changed from `success` (green) to `secondary` (neutral) — matches the design spec

- [ ] **Step 2: Verify in browser**

Check that:
- Live layers show red left border and ON AIR tag
- Ready layers show neutral READY tag
- Selection highlighting still works correctly alongside live indicators

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/components/operator/LayerFilter.vue
git commit -m "feat(operator): unify LayerFilter status colors with red/neutral scheme (#39)"
```

---

### Task 5: Update ContextPanel to use unified colors

**Files:**
- Modify: `apps/engine-ui/app/components/operator/ContextPanel.vue`

- [ ] **Step 1: Replace local severity/label logic with composable**

In `ContextPanel.vue`, replace the `stateLabel` and `stateSeverity` computed properties (lines 50-65) with the composable:

Remove these lines:

```ts
const stateLabel = computed(() => {
  switch (visibility.value) {
    case 'visible': return 'Live (On Air)'
    case 'entering': return 'Entering'
    case 'exiting': return 'Exiting'
    default: return 'Ready'
  }
})

const stateSeverity = computed(() => {
  switch (visibility.value) {
    case 'visible': case 'entering': return 'danger' as const
    case 'exiting': return 'warn' as const
    default: return 'success' as const
  }
})
```

Replace with:

```ts
const { statusLabel: stateLabel, statusSeverity: stateSeverity } = useVisibilityStyle(visibility)
```

This is a drop-in replacement — `stateLabel` and `stateSeverity` keep the same names so the template doesn't need changes.

- [ ] **Step 2: Add red top-border on preview when on air**

In the template, find the iframe's parent container (the `<div ref="previewContainer" ...>` element) and add a conditional red top-border.

Replace:

```vue
      <div
        ref="previewContainer"
        class="relative w-full bg-black rounded overflow-hidden"
        :style="{ aspectRatio: `${outputWidth} / ${outputHeight}` }"
      >
```

With:

```vue
      <div
        ref="previewContainer"
        class="relative w-full bg-black rounded overflow-hidden border-t-2"
        :class="isAnythingOnAir ? 'border-t-red-500' : 'border-t-transparent'"
        :style="{ aspectRatio: `${outputWidth} / ${outputHeight}` }"
      >
```

And add this computed to the script section, after the `visibility` computed:

```ts
const isAnythingOnAir = computed(() => {
  if (!props.channelState) return false
  return props.channelState.layers.some(layer =>
    layer.elements.some(el => el.visibility === 'visible' || el.visibility === 'entering')
  )
})
```

- [ ] **Step 3: Verify in browser**

Check that:
- Tag uses `danger` (red) for visible/entering, `warn` (amber) for exiting, `secondary` (neutral) for hidden
- Labels show "On Air", "Entering", "Exiting", "Ready"
- Preview iframe has red top-border when anything is on air

- [ ] **Step 4: Commit**

```bash
git add apps/engine-ui/app/components/operator/ContextPanel.vue
git commit -m "feat(operator): unify ContextPanel status colors and add on-air preview border (#39)"
```

---

### Task 6: Update TopBar to use consistent red token

**Files:**
- Modify: `apps/engine-ui/app/components/operator/TopBar.vue`

- [ ] **Step 1: Add glow to On Air badge**

The TopBar's On Air badge already uses `severity="danger"` and `animate-pulse`. To match the ElementGrid glow treatment, add a glow effect.

In `TopBar.vue`, find:

```vue
    <Tag
      v-if="isOnAir"
      severity="danger"
      class="uppercase font-bold tracking-wider animate-pulse"
    >
      On Air
    </Tag>
```

Replace with:

```vue
    <Tag
      v-if="isOnAir"
      severity="danger"
      class="uppercase font-bold tracking-wider animate-pulse"
      :style="{ boxShadow: '0 0 8px oklch(0.637 0.237 25.331 / 0.5)' }"
    >
      On Air
    </Tag>
```

This adds the same glow effect used by `status-visible` in the CSS.

- [ ] **Step 2: Verify in browser**

Check that the On Air tag in the TopBar has a red glow matching the ElementGrid buttons.

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/components/operator/TopBar.vue
git commit -m "feat(operator): add glow effect to TopBar On Air badge (#39)"
```

---

### Task 7: Final integration verification

- [ ] **Step 1: Full end-to-end check**

With the dev server running, walk through these scenarios:

1. **Hidden state:** All elements show dark neutral backgrounds in ElementGrid, READY tags in LayerFilter, "Ready" with secondary Tag in ContextPanel
2. **Take an element:** It transitions to `visible` — red background with glow in ElementGrid, ON AIR tag in LayerFilter with red left-border, "On Air" danger Tag in ContextPanel, On Air badge glows in TopBar, preview gets red top-border
3. **Clear the element:** It transitions through `exiting` — fade-out animation in ElementGrid, then settles to `hidden` neutral state
4. **Multiple layers:** Taking elements on different layers shows red left-borders on each live layer in LayerFilter

- [ ] **Step 2: Commit any fixes if needed**

If any visual inconsistencies are found, fix and commit with descriptive message referencing #39.
