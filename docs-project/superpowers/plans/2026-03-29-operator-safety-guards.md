# Operator Safety Guards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global Clear All button and layer-level locking to the Operator UI, with server-side enforcement preventing take/clear/action on locked layers.

**Architecture:** A `locked` column is added to the `layers` table. Engine functions `take()`, `clear()`, and `elementAction()` check lock status and throw on locked layers. A new `clearAll()` engine function clears all visible elements on unlocked layers. The UI shows lock toggles in LayerFilter, greys out locked elements in ElementGrid, and adds a Clear All button in TopBar.

**Tech Stack:** Drizzle ORM (SQLite), Nuxt 4 server routes, Vue 3 + PrimeVue, Tailwind CSS

---

### Task 1: Add `locked` column to layers schema and types

**Files:**
- Modify: `packages/engine-core/src/db/schema.ts`
- Modify: `packages/engine-core/src/types.ts`
- Modify: `packages/engine-core/src/index.ts`

- [ ] **Step 1: Add locked column to schema**

In `packages/engine-core/src/db/schema.ts`, add the `locked` column to the `layers` table, after the `region` column:

```ts
  locked: integer('locked').notNull().default(0),
```

The full layers table should look like:

```ts
export const layers = sqliteTable('layers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workspaceId: integer('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  channelId: integer('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  zIndex: integer('z_index').notNull(),
  region: text('region'),
  locked: integer('locked').notNull().default(0),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_layers_channel').on(table.channelId),
]);
```

- [ ] **Step 2: Add `locked` to the Layer type**

In `packages/engine-core/src/types.ts`, add `locked: boolean` to the `Layer` type:

```ts
export type Layer = {
  id: LayerId;
  workspaceId: WorkspaceId;
  channelId: ChannelId;
  name: string;
  zIndex: number;
  region: LayerRegion | null;
  locked: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};
```

Add `locked?: boolean` to `UpdateLayerInput`:

```ts
export type UpdateLayerInput = Partial<Omit<CreateLayerInput, 'workspaceId' | 'channelId'>> & {
  locked?: boolean;
};
```

- [ ] **Step 3: Update layerRowToDomain and updateLayer in index.ts**

In `packages/engine-core/src/index.ts`, update `layerRowToDomain` to include `locked`:

```ts
function layerRowToDomain(row: LayerRow): Layer {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    channelId: row.channelId,
    name: row.name,
    zIndex: row.zIndex,
    region: (row.region as Layer['region']) ?? null,
    locked: row.locked === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
```

Update `updateLayer` to handle the `locked` field:

```ts
export function updateLayer(db: AppDatabase, id: LayerId, input: UpdateLayerInput): Layer {
  if (!getLayer(db, id)) throw new Error(`Layer ${id} not found`);
  const values: Record<string, unknown> = { updatedAt: now() };
  if (input.name !== undefined) values.name = input.name;
  if (input.zIndex !== undefined) values.zIndex = input.zIndex;
  if (input.region !== undefined) values.region = input.region;
  if (input.locked !== undefined) values.locked = input.locked ? 1 : 0;
  db.update(layers).set(values).where(eq(layers.id, id)).run();
  return getLayer(db, id)!;
}
```

- [ ] **Step 4: Generate the migration**

Run: `cd packages/engine-core && pnpm db:generate`

This will create a new migration SQL file in `drizzle/` with the ALTER TABLE statement.

- [ ] **Step 5: Verify build**

Run: `pnpm run build`
Expected: Build succeeds with no type errors.

- [ ] **Step 6: Commit**

```bash
git add packages/engine-core/src/db/schema.ts packages/engine-core/src/types.ts packages/engine-core/src/index.ts packages/engine-core/drizzle/
git commit -m "feat(core): add locked column to layers table (#40)"
```

---

### Task 2: Add lock enforcement to engine functions

**Files:**
- Modify: `packages/engine-core/src/engine.ts`

- [ ] **Step 1: Add lock check to take()**

In `packages/engine-core/src/engine.ts`, after the element lookup in `take()`, add a lock check:

```ts
export function take(
  db: AppDatabase,
  elementId: ElementId,
): ChannelState {
  const element = getElement(db, elementId);
  if (!element) throw new Error(`Element ${elementId} not found`);

  const layer = getLayer(db, element.layerId);
  if (layer?.locked) throw new Error('Layer is locked');

  // ... rest unchanged
```

Import `getLayer` at the top of the file:

```ts
import {
  listLayers,
  listElementsByChannel,
  listRuntimeStateByChannel,
  getElement,
  getLayer,
  setRuntimeState,
  getRuntimeState,
} from './index';
```

- [ ] **Step 2: Add lock check to clear()**

In `clear()`, add the same check after looking up the element:

```ts
export function clear(
  db: AppDatabase,
  elementId: ElementId,
): ChannelState {
  const element = getElement(db, elementId);
  if (!element) throw new Error(`Element ${elementId} not found`);

  const layer = getLayer(db, element.layerId);
  if (layer?.locked) throw new Error('Layer is locked');

  setRuntimeState(db, { elementId, visibility: 'hidden' });

  return buildChannelState(db, element.workspaceId, element.channelId);
}
```

- [ ] **Step 3: Add lock check to elementAction()**

In `elementAction()`, add the same check:

```ts
export function elementAction(
  db: AppDatabase,
  elementId: ElementId,
  actionId: string,
  args?: unknown,
): EngineEvent {
  const element = getElement(db, elementId);
  if (!element) throw new Error(`Element ${elementId} not found`);

  const layer = getLayer(db, element.layerId);
  if (layer?.locked) throw new Error('Layer is locked');

  // ... rest unchanged
```

- [ ] **Step 4: Add clearAll() function**

Add a new `clearAll()` function at the end of `engine.ts`, before the closing:

```ts
export function clearAll(
  db: AppDatabase,
  workspaceId: WorkspaceId,
  channelId: ChannelId,
): ChannelState {
  const allLayers = listLayers(db, channelId);
  const lockedLayerIds = new Set(allLayers.filter(l => l.locked).map(l => l.id));
  const allElements = listElementsByChannel(db, channelId);
  const allStates = listRuntimeStateByChannel(db, channelId);

  for (const rs of allStates) {
    if (rs.visibility === 'visible' || rs.visibility === 'entering') {
      const element = allElements.find(e => e.id === rs.elementId);
      if (element && !lockedLayerIds.has(element.layerId)) {
        setRuntimeState(db, { elementId: rs.elementId, visibility: 'hidden' });
      }
    }
  }

  return buildChannelState(db, workspaceId, channelId);
}
```

- [ ] **Step 5: Export clearAll from index.ts**

In `packages/engine-core/src/index.ts`, update the engine re-export:

```ts
export { buildChannelState, take, clear, clearAll, elementAction } from './engine';
```

- [ ] **Step 6: Verify build**

Run: `pnpm run build`
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add packages/engine-core/src/engine.ts packages/engine-core/src/index.ts
git commit -m "feat(core): enforce layer locks in take/clear/action and add clearAll (#40)"
```

---

### Task 3: Add lock enforcement to API routes and create clear-all route

**Files:**
- Modify: `apps/engine-ui/server/api/workspaces/[workspaceId]/channels/[channelId]/elements/[elementId]/take.post.ts`
- Modify: `apps/engine-ui/server/api/workspaces/[workspaceId]/channels/[channelId]/elements/[elementId]/clear.post.ts`
- Modify: `apps/engine-ui/server/api/workspaces/[workspaceId]/channels/[channelId]/elements/[elementId]/action.post.ts`
- Create: `apps/engine-ui/server/api/workspaces/[workspaceId]/channels/[channelId]/clear-all.post.ts`

- [ ] **Step 1: Add error handling to take route**

Replace `apps/engine-ui/server/api/workspaces/[workspaceId]/channels/[channelId]/elements/[elementId]/take.post.ts`:

```ts
import { take } from 'engine-core';

export default defineEventHandler((event) => {
  const elementId = Number(getRouterParam(event, 'elementId'));
  try {
    const state = take(useDb(), elementId);
    broadcastToChannel(state.workspaceId, state.channelId, { type: 'state:update', payload: state });
    return state;
  } catch (err: any) {
    if (err.message === 'Layer is locked') {
      throw createError({ statusCode: 403, statusMessage: 'Layer is locked' });
    }
    throw err;
  }
});
```

- [ ] **Step 2: Add error handling to clear route**

Replace `apps/engine-ui/server/api/workspaces/[workspaceId]/channels/[channelId]/elements/[elementId]/clear.post.ts`:

```ts
import { clear } from 'engine-core';

export default defineEventHandler((event) => {
  const elementId = Number(getRouterParam(event, 'elementId'));
  try {
    const state = clear(useDb(), elementId);
    broadcastToChannel(state.workspaceId, state.channelId, { type: 'state:update', payload: state });
    return state;
  } catch (err: any) {
    if (err.message === 'Layer is locked') {
      throw createError({ statusCode: 403, statusMessage: 'Layer is locked' });
    }
    throw err;
  }
});
```

- [ ] **Step 3: Add error handling to action route**

Replace `apps/engine-ui/server/api/workspaces/[workspaceId]/channels/[channelId]/elements/[elementId]/action.post.ts`:

```ts
import { elementAction } from 'engine-core';

export default defineEventHandler(async (event) => {
  const elementId = Number(getRouterParam(event, 'elementId'));
  const body = await readBody(event);
  try {
    const engineEvent = elementAction(useDb(), elementId, body.actionId, body.args);
    const payload = engineEvent.payload as { workspaceId: number; channelId: number };
    broadcastToChannel(payload.workspaceId, payload.channelId, engineEvent);
    return engineEvent;
  } catch (err: any) {
    if (err.message === 'Layer is locked') {
      throw createError({ statusCode: 403, statusMessage: 'Layer is locked' });
    }
    throw err;
  }
});
```

- [ ] **Step 4: Create clear-all route**

Create `apps/engine-ui/server/api/workspaces/[workspaceId]/channels/[channelId]/clear-all.post.ts`:

```ts
import { clearAll } from 'engine-core';

export default defineEventHandler((event) => {
  const workspaceId = Number(getRouterParam(event, 'workspaceId'));
  const channelId = Number(getRouterParam(event, 'channelId'));
  const state = clearAll(useDb(), workspaceId, channelId);
  broadcastToChannel(state.workspaceId, state.channelId, { type: 'state:update', payload: state });
  return state;
});
```

- [ ] **Step 5: Verify build**

Run: `pnpm run build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add apps/engine-ui/server/api/
git commit -m "feat(api): add lock enforcement to take/clear/action and create clear-all route (#40)"
```

---

### Task 4: Add clearAll and updateLayer to useEngineApi

**Files:**
- Modify: `apps/engine-ui/app/composables/useEngineApi.ts`

- [ ] **Step 1: Add clearAll and updateLayer methods**

In `apps/engine-ui/app/composables/useEngineApi.ts`, add these two functions before the `return` statement:

```ts
  function clearAllElements(
    workspaceId: number,
    channelId: number
  ): Promise<ChannelState> {
    return $fetch(
      `/api/workspaces/${workspaceId}/channels/${channelId}/clear-all`,
      { method: 'POST' }
    )
  }

  function updateLayer(
    workspaceId: number,
    channelId: number,
    layerId: number,
    input: { locked?: boolean; name?: string; zIndex?: number }
  ): Promise<Layer> {
    return $fetch(
      `/api/workspaces/${workspaceId}/channels/${channelId}/layers/${layerId}`,
      { method: 'PUT', body: input }
    )
  }
```

Add `Layer` to the import:

```ts
import type {
  Workspace,
  Channel,
  Layer,
  Element,
  ModuleRecord,
  ChannelState,
  UpdateElementInput,
  EngineEvent
} from 'engine-core'
```

Update the return object:

```ts
  return {
    listWorkspaces,
    getWorkspace,
    listChannels,
    listLayers,
    listElements,
    listModules,
    updateElement,
    takeElement,
    clearElement,
    clearAllElements,
    updateLayer,
    elementAction
  }
```

- [ ] **Step 2: Verify build**

Run: `pnpm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/composables/useEngineApi.ts
git commit -m "feat(api): add clearAllElements and updateLayer to useEngineApi (#40)"
```

---

### Task 5: Add lock-flash CSS animation

**Files:**
- Modify: `apps/engine-ui/app/assets/css/main.css`

- [ ] **Step 1: Add lock-flash keyframes and class**

In `apps/engine-ui/app/assets/css/main.css`, add at the end of the file:

```css

/* -- Lock flash animation -- */

@keyframes lock-flash {
  0% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.3); opacity: 1; color: white; }
  100% { transform: scale(1); opacity: 0.6; }
}

.lock-flash {
  animation: lock-flash 0.4s ease-in-out;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/engine-ui/app/assets/css/main.css
git commit -m "feat(operator): add lock-flash CSS animation (#40)"
```

---

### Task 6: Add lock toggle to LayerFilter

**Files:**
- Modify: `apps/engine-ui/app/components/operator/LayerFilter.vue`

- [ ] **Step 1: Add lock toggle emit and flash state**

Replace the entire `<script setup>` block in `LayerFilter.vue`:

```vue
<script setup lang="ts">
import type { Layer, ChannelState } from 'engine-core'

const props = defineProps<{
  layers: Layer[]
  channelState: ChannelState | null
  selectedLayerId: number | null
}>()

const emit = defineEmits<{
  'update:selectedLayerId': [value: number | null]
  'toggle-lock': [layerId: number]
}>()

const sortedLayers = computed(() =>
  [...props.layers].sort((a, b) => a.zIndex - b.zIndex)
)

const showAllLayers = computed(() => props.layers.length > 1)

function isLayerLive(layerId: number): boolean {
  if (!props.channelState) return false
  const layer = props.channelState.layers.find(l => l.layerId === layerId)
  if (!layer) return false
  return layer.elements.some(el => el.visibility === 'visible' || el.visibility === 'entering')
}

const flashingLayers = ref<Set<number>>(new Set())

function flashLock(layerId: number) {
  flashingLayers.value.add(layerId)
  setTimeout(() => {
    flashingLayers.value.delete(layerId)
  }, 400)
}

defineExpose({ flashLock })
</script>
```

- [ ] **Step 2: Update the template with lock icons**

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
        :class="{ 'bg-primary-900/20 border-l-2 border-l-primary-500': selectedLayerId === null, 'border-l-2 border-l-transparent': selectedLayerId !== null }"
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
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium truncate">{{ layer.name }}</span>
          <div class="flex items-center gap-1.5 shrink-0">
            <i
              :class="[
                layer.locked ? 'pi pi-lock' : 'pi pi-lock-open',
                layer.locked ? 'text-surface-300' : 'text-surface-500',
                flashingLayers.has(layer.id) ? 'lock-flash' : ''
              ]"
              class="text-xs cursor-pointer hover:text-white transition-colors"
              @click.stop="emit('toggle-lock', layer.id)"
            />
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
        </div>
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 3: Verify build**

Run: `pnpm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/engine-ui/app/components/operator/LayerFilter.vue
git commit -m "feat(operator): add lock toggle to LayerFilter (#40)"
```

---

### Task 7: Update ElementGrid for locked layer behavior

**Files:**
- Modify: `apps/engine-ui/app/components/operator/ElementGrid.vue`

- [ ] **Step 1: Add lock awareness to script**

Replace the entire `<script setup>` block in `ElementGrid.vue`:

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

function isLayerLocked(layerId: number): boolean {
  return props.layers.find(l => l.id === layerId)?.locked ?? false
}

const flashingElements = ref<Set<number>>(new Set())

function onElementClick(element: Element) {
  if (isLayerLocked(element.layerId)) {
    flashingElements.value.add(element.id)
    setTimeout(() => {
      flashingElements.value.delete(element.id)
    }, 400)
    return
  }
  emit('toggle', element.id)
}

function flashLockedElements(layerIds: number[]) {
  const lockedIds = new Set(layerIds)
  for (const el of props.elements) {
    if (lockedIds.has(el.layerId) && getIsLive(el.id)) {
      flashingElements.value.add(el.id)
    }
  }
  setTimeout(() => {
    flashingElements.value.clear()
  }, 400)
}

defineExpose({ flashLockedElements })
</script>
```

- [ ] **Step 2: Update template for locked state**

Replace the entire `<template>` block in `ElementGrid.vue`:

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
            isLayerLocked(element.layerId) ? 'status-hidden opacity-50 cursor-not-allowed' : getStatusClass(element.id),
            !isLayerLocked(element.layerId) && getIsLive(element.id)
              ? 'hover:brightness-110'
              : '',
            !isLayerLocked(element.layerId) && !getIsLive(element.id)
              ? 'hover:border-surface-500'
              : ''
          ]"
          @click="onElementClick(element)"
        >
          <span class="flex-1 px-4 py-4 text-sm font-medium text-left truncate">
            {{ element.name }}
          </span>

          <i
            v-if="isLayerLocked(element.layerId)"
            class="pi pi-lock text-xs text-surface-400 mr-3"
            :class="flashingElements.has(element.id) ? 'lock-flash' : ''"
          />

          <button
            v-else
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

- [ ] **Step 3: Verify build**

Run: `pnpm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/engine-ui/app/components/operator/ElementGrid.vue
git commit -m "feat(operator): grey out locked layer elements with flash feedback in ElementGrid (#40)"
```

---

### Task 8: Add Clear All button to TopBar

**Files:**
- Modify: `apps/engine-ui/app/components/operator/TopBar.vue`

- [ ] **Step 1: Add Clear All emit and hasUnlockedOnAir computed**

In `TopBar.vue`, add a new prop for layers and a new emit. Replace the `<script setup>` block:

```vue
<script setup lang="ts">
import type { Workspace, Channel, Layer, ChannelState } from 'engine-core'
import type { WsConnectionStatus } from '~/composables/useEngineWs'

const props = defineProps<{
  workspaces: Workspace[]
  channels: Channel[]
  layers: Layer[]
  selectedWorkspaceId: number | null
  selectedChannelId: number | null
  wsStatus: WsConnectionStatus
  channelState: ChannelState | null
}>()

const emit = defineEmits<{
  'update:selectedWorkspaceId': [value: number]
  'update:selectedChannelId': [value: number]
  'clear-all': []
}>()

const selectedWorkspace = computed(() =>
  props.workspaces.find(w => w.id === props.selectedWorkspaceId)
)

const channelItems = computed(() =>
  props.channels.map(c => ({ label: c.name, value: String(c.id) }))
)

const selectedChannelValue = computed({
  get: () => props.selectedChannelId !== null ? String(props.selectedChannelId) : undefined,
  set: (val) => {
    if (val) emit('update:selectedChannelId', Number(val))
  }
})

const isOnAir = computed(() => {
  if (!props.channelState) return false
  return props.channelState.layers.some(layer =>
    layer.elements.some(el => el.visibility === 'visible' || el.visibility === 'entering')
  )
})

const hasUnlockedOnAir = computed(() => {
  if (!props.channelState) return false
  const lockedLayerIds = new Set(props.layers.filter(l => l.locked).map(l => l.id))
  return props.channelState.layers.some(layer =>
    !lockedLayerIds.has(layer.layerId) &&
    layer.elements.some(el => el.visibility === 'visible' || el.visibility === 'entering')
  )
})

const wsStatusSeverity = computed(() => {
  switch (props.wsStatus) {
    case 'connected': return 'success' as const
    case 'connecting': return 'warn' as const
    case 'disconnected': return 'danger' as const
    default: return 'secondary' as const
  }
})

const wsStatusLabel = computed(() => {
  switch (props.wsStatus) {
    case 'connected': return 'Connected'
    case 'connecting': return 'Connecting...'
    case 'disconnected': return 'Disconnected'
    default: return 'Unknown'
  }
})

const toast = useToast()

const overlayUrl = computed(() => {
  if (!props.selectedWorkspaceId || !props.selectedChannelId) return null
  return `/o/${props.selectedWorkspaceId}/channel/${props.selectedChannelId}`
})

async function copyOverlayUrl() {
  if (!overlayUrl.value) return
  const fullUrl = `${window.location.origin}${overlayUrl.value}`
  await navigator.clipboard.writeText(fullUrl)
  toast.add({ summary: 'Overlay URL copied', severity: 'success', life: 2000 })
}
</script>
```

- [ ] **Step 2: Add Clear All button to template**

In the template, add the Clear All button right before the On Air tag. Find:

```vue
    <Tag
      v-if="isOnAir"
      severity="danger"
```

Add this before it:

```vue
    <Button
      label="Clear All"
      icon="pi pi-ban"
      severity="danger"
      text
      size="small"
      :disabled="!hasUnlockedOnAir"
      @click="emit('clear-all')"
    />
```

- [ ] **Step 3: Verify build**

Run: `pnpm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/engine-ui/app/components/operator/TopBar.vue
git commit -m "feat(operator): add Clear All button to TopBar (#40)"
```

---

### Task 9: Wire everything together in the operator page

**Files:**
- Modify: `apps/engine-ui/app/pages/app/[workspaceId]/operator.vue`

- [ ] **Step 1: Add template refs, lock toggle handler, and clear-all handler**

In the `<script setup>` section, add after the existing `onUpdateElement` function:

```ts
const layerFilterRef = ref<InstanceType<typeof OperatorLayerFilter> | null>(null)
const elementGridRef = ref<InstanceType<typeof OperatorElementGrid> | null>(null)

async function onToggleLock(layerId: number) {
  if (!selectedWorkspaceId.value || !selectedChannelId.value) return
  const layer = layers.value.find(l => l.id === layerId)
  if (!layer) return
  try {
    const updated = await api.updateLayer(
      selectedWorkspaceId.value,
      selectedChannelId.value,
      layerId,
      { locked: !layer.locked }
    )
    const idx = layers.value.findIndex(l => l.id === layerId)
    if (idx !== -1) {
      layers.value[idx] = updated
    }
  } catch (err) {
    console.error('Toggle lock failed:', err)
  }
}

async function onClearAll() {
  if (!selectedWorkspaceId.value || !selectedChannelId.value) return
  try {
    await api.clearAllElements(selectedWorkspaceId.value, selectedChannelId.value)
    // Flash locked layers that still have live elements
    const lockedLiveLayerIds = layers.value
      .filter(l => l.locked)
      .filter(l => {
        const layerState = channelState.value?.layers.find(ls => ls.layerId === l.id)
        return layerState?.elements.some(el => el.visibility === 'visible' || el.visibility === 'entering')
      })
      .map(l => l.id)

    if (lockedLiveLayerIds.length > 0) {
      for (const id of lockedLiveLayerIds) {
        layerFilterRef.value?.flashLock(id)
      }
      elementGridRef.value?.flashLockedElements(lockedLiveLayerIds)
    }
  } catch (err) {
    console.error('Clear all failed:', err)
  }
}
```

Also update `onToggle` to handle 403 from locked layers:

```ts
async function onToggle(elementId: number) {
  if (!selectedWorkspaceId.value || !selectedChannelId.value) return
  const vis = getElementVisibility(elementId)
  const isLive = vis === 'visible' || vis === 'entering'

  try {
    if (isLive) {
      await api.clearElement(selectedWorkspaceId.value, selectedChannelId.value, elementId)
    } else {
      await api.takeElement(selectedWorkspaceId.value, selectedChannelId.value, elementId)
    }
  } catch (err: any) {
    if (err?.response?.status === 403) {
      // Locked layer — handled by ElementGrid click handler
      return
    }
    console.error('Toggle failed:', err)
  }
}
```

- [ ] **Step 2: Update the template to pass new props and wire events**

Replace the entire `<template>` block:

```vue
<template>
  <div class="h-screen flex flex-col bg-surface-950">
    <OperatorTopBar
      :workspaces="workspaces"
      :channels="channels"
      :layers="layers"
      :selected-workspace-id="selectedWorkspaceId"
      :selected-channel-id="selectedChannelId"
      :ws-status="wsStatus"
      :channel-state="channelState"
      @update:selected-workspace-id="selectedWorkspaceId = $event"
      @update:selected-channel-id="selectedChannelId = $event"
      @clear-all="onClearAll"
    />

    <div class="flex-1 flex overflow-hidden">
      <div class="w-56 border-r border-surface-700 bg-surface-900 shrink-0 overflow-hidden">
        <OperatorLayerFilter
          ref="layerFilterRef"
          :layers="layers"
          :channel-state="channelState"
          :selected-layer-id="selectedLayerId"
          @update:selected-layer-id="selectedLayerId = $event"
          @toggle-lock="onToggleLock"
        />
      </div>

      <div class="flex-1 overflow-hidden bg-surface-950">
        <OperatorElementGrid
          ref="elementGridRef"
          :layers="layers"
          :elements="elements"
          :channel-state="channelState"
          :selected-layer-id="selectedLayerId"
          @toggle="onToggle"
          @edit="onEdit"
        />
      </div>

      <div class="w-80 border-l border-surface-700 bg-surface-900 shrink-0 overflow-hidden">
        <OperatorContextPanel
          :element="editingElement"
          :channel-state="channelState"
          :workspace-id="selectedWorkspaceId ?? 0"
          :channel-id="selectedChannelId"
          :display-config="selectedWorkspace?.displayConfig"
          @update-element="onUpdateElement"
        />
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: Verify build**

Run: `pnpm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/engine-ui/app/pages/app/[workspaceId]/operator.vue
git commit -m "feat(operator): wire lock toggle, clear-all, and flash feedback in operator page (#40)"
```

---

### Task 10: Final integration verification

- [ ] **Step 1: Full build check**

Run: `pnpm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 2: Manual walkthrough**

With dev server running (`pnpm dev`), verify:

1. **Lock toggle:** Click lock icon on a layer in LayerFilter — icon changes between `pi-lock` and `pi-lock-open`, layer row updates
2. **Locked elements:** Elements on a locked layer appear greyed out with lock icon, not clickable for take/clear
3. **Locked element click flash:** Clicking a locked element flashes the lock icon
4. **Clear All:** Click Clear All in TopBar — all visible elements on unlocked layers are cleared
5. **Clear All + locked layers:** Lock a layer with a live element, click Clear All — unlocked elements clear, locked layer's lock icons flash in both LayerFilter and ElementGrid
6. **Server enforcement:** Use browser devtools to POST to `/api/.../take` on a locked element — should get 403

- [ ] **Step 3: Commit any fixes**

If any issues found, fix and commit with descriptive message referencing #40.
