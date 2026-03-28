# Operator Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the operator page to use direct element toggle buttons, a layer filter sidebar, and a channel preview panel.

**Architecture:** Replace Rundown with LayerFilter (left), replace LayerDashboard with ElementGrid (center), add channel preview to ContextPanel (right), restructure TopBar as breadcrumb. The operator page wires the new components with simplified state management — no more per-layer dropdown selections.

**Tech Stack:** PrimeVue 4 (Button, Select, Tag), Tailwind utilities for layout, @iconify/vue for icons

---

### Task 1: Create LayerFilter component

**Files:**
- Create: `apps/engine-ui/app/components/operator/LayerFilter.vue`

- [ ] **Step 1: Create the LayerFilter component**

```vue
<script setup lang="ts">
import type { Layer, ChannelState, ElementVisibility } from 'engine-core'

const props = defineProps<{
  layers: Layer[]
  channelState: ChannelState | null
  selectedLayerId: number | null
}>()

const emit = defineEmits<{
  'update:selectedLayerId': [value: number | null]
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

const liveLayerCount = computed(() =>
  props.layers.filter(l => isLayerLive(l.id)).length
)
</script>

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
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium">All Layers</span>
          <Tag
            v-if="liveLayerCount > 0"
            severity="danger"
            class="text-xs"
          >
            {{ liveLayerCount }} ON AIR
          </Tag>
        </div>
      </button>

      <button
        v-for="layer in sortedLayers"
        :key="layer.id"
        class="w-full text-left px-3 py-3 border-b border-surface-800 transition-colors hover:bg-surface-800/50"
        :class="{ 'bg-primary-900/20 border-l-2 border-l-primary-500': selectedLayerId === layer.id, 'border-l-2 border-l-transparent': selectedLayerId !== layer.id }"
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

- [ ] **Step 2: Run lint fix**

Run: `cd apps/engine-ui && npx eslint --fix app/components/operator/LayerFilter.vue`

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/components/operator/LayerFilter.vue
git commit -m "feat: add LayerFilter component for operator sidebar"
```

---

### Task 2: Create ElementGrid component

**Files:**
- Create: `apps/engine-ui/app/components/operator/ElementGrid.vue`

- [ ] **Step 1: Create the ElementGrid component**

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
  'toggle': [elementId: number]
  'edit': [elementId: number]
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

function isLive(elementId: number): boolean {
  const vis = getElementVisibility(elementId)
  return vis === 'visible' || vis === 'entering'
}
</script>

<template>
  <div class="flex flex-col h-full overflow-y-auto p-4 gap-4">
    <div v-if="visibleLayers.length === 0" class="flex-1 flex items-center justify-center text-sm text-surface-400">
      No layers in this channel.
    </div>

    <div
      v-for="layer in visibleLayers"
      :key="layer.id"
      class="rounded-lg border border-surface-700 overflow-hidden"
    >
      <div class="px-4 py-2 bg-surface-800 border-b border-surface-700">
        <h3 class="text-sm font-semibold text-surface-300 uppercase tracking-wide">
          {{ layer.name }}
        </h3>
      </div>

      <div class="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <div
          v-if="elementsForLayer(layer.id).length === 0"
          class="col-span-full text-sm text-surface-500 py-4 text-center"
        >
          No elements on this layer.
        </div>

        <button
          v-for="element in elementsForLayer(layer.id)"
          :key="element.id"
          class="relative flex items-center rounded-md border transition-colors group"
          :class="isLive(element.id)
            ? 'bg-surface-800 border-red-500/40 hover:border-red-500/70'
            : 'bg-surface-800 border-surface-600 hover:border-surface-500'"
          @click="emit('toggle', element.id)"
        >
          <span class="flex-1 px-3 py-2.5 text-sm font-medium text-left truncate">
            {{ element.name }}
          </span>

          <button
            class="absolute right-8 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-700"
            title="Edit element"
            @click.stop="emit('edit', element.id)"
          >
            <i class="pi pi-pencil text-xs text-surface-400" />
          </button>

          <div
            class="w-2 h-full min-h-[2.5rem] rounded-r-md flex-shrink-0"
            :class="isLive(element.id) ? 'bg-red-500 animate-pulse' : 'bg-surface-600'"
          />
        </button>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Run lint fix**

Run: `cd apps/engine-ui && npx eslint --fix app/components/operator/ElementGrid.vue`

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/components/operator/ElementGrid.vue
git commit -m "feat: add ElementGrid component for operator center panel"
```

---

### Task 3: Restructure TopBar as breadcrumb flow

**Files:**
- Modify: `apps/engine-ui/app/components/operator/TopBar.vue`

- [ ] **Step 1: Update TopBar template — add logo, "Operator" label, breadcrumb separators**

Replace the full template section with:

```vue
<template>
  <div class="flex items-center gap-3 px-4 py-2 border-b border-surface-700 bg-surface-900">
    <NuxtLink to="/app" class="flex items-center gap-3">
      <AppLogo class="w-auto h-6 shrink-0" />
    </NuxtLink>
    <span class="w-px h-5 bg-surface-600" />
    <span class="text-sm font-semibold whitespace-nowrap">Operator</span>
    <span class="text-surface-500">&#8250;</span>

    <Select
      v-model="selectedWorkspaceValue"
      :options="workspaceItems"
      option-label="label"
      option-value="value"
      placeholder="Workspace"
      class="w-44"
    />

    <span class="text-surface-500">&#8250;</span>

    <Select
      v-model="selectedChannelValue"
      :options="channelItems"
      option-label="label"
      option-value="value"
      :disabled="!selectedWorkspaceId"
      placeholder="Channel"
      class="w-44"
    />

    <div class="flex-1" />

    <Button
      v-if="overlayUrl"
      label="Overlay URL"
      icon="pi pi-copy"
      severity="secondary"
      text
      size="small"
      @click="copyOverlayUrl"
    />

    <Tag
      :severity="wsStatusSeverity"
      class="gap-1.5"
    >
      <span
        class="size-2 rounded-full"
        :class="{
          'bg-green-500': wsStatus === 'connected',
          'bg-yellow-500 animate-pulse': wsStatus === 'connecting',
          'bg-red-500': wsStatus === 'disconnected'
        }"
      />
      {{ wsStatusLabel }}
    </Tag>

    <Tag
      v-if="isOnAir"
      severity="danger"
      class="uppercase font-bold tracking-wider animate-pulse"
    >
      On Air
    </Tag>
    <Tag
      v-else
      severity="secondary"
      class="uppercase font-bold tracking-wider"
    >
      Off Air
    </Tag>
  </div>
</template>
```

- [ ] **Step 2: Run lint fix**

Run: `cd apps/engine-ui && npx eslint --fix app/components/operator/TopBar.vue`

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/components/operator/TopBar.vue
git commit -m "refactor: restructure operator TopBar as breadcrumb flow"
```

---

### Task 4: Update ContextPanel — add channel preview, update empty state

**Files:**
- Modify: `apps/engine-ui/app/components/operator/ContextPanel.vue`

- [ ] **Step 1: Add channelId prop and channel preview iframe**

Add `channelId` to the props:

```ts
const props = defineProps<{
  element: Element | null
  channelState: ChannelState | null
  workspaceId: number
  channelId: number | null
}>()
```

Add a computed for the channel preview URL:

```ts
const channelPreviewUrl = computed(() => {
  if (!props.workspaceId || !props.channelId) return ''
  return `/o/${props.workspaceId}/channel/${props.channelId}`
})
```

- [ ] **Step 2: Update the template — add channel preview above editor, change empty state**

Replace the full template with:

```vue
<template>
  <div class="flex flex-col h-full">
    <div
      v-if="channelPreviewUrl"
      class="px-3 py-3 border-b border-surface-700"
    >
      <p class="text-xs text-surface-400 mb-2">
        Channel Preview
      </p>
      <div
        class="relative w-full bg-black rounded overflow-hidden"
        style="aspect-ratio: 16/9;"
      >
        <iframe
          :src="channelPreviewUrl"
          class="absolute inset-0 w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>

    <div class="px-3 py-2 border-b border-surface-700">
      <h2 class="text-sm font-semibold text-surface-400 uppercase tracking-wide">
        Context
      </h2>
    </div>

    <div
      v-if="!element"
      class="flex-1 flex items-center justify-center p-4"
    >
      <p class="text-sm text-surface-400 text-center">
        Click the pencil icon on an element to edit.
      </p>
    </div>

    <div
      v-else
      class="flex-1 overflow-y-auto"
    >
      <div class="px-3 py-2 border-b border-surface-800 flex items-center justify-between">
        <span class="text-sm font-medium">{{ element.name }}</span>
        <Tag :severity="stateSeverity">
          {{ stateLabel }}
        </Tag>
      </div>

      <div class="px-3 py-3 space-y-3">
        <p class="text-xs text-surface-400">
          Quick Edit
        </p>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">Name</label>
          <InputText
            v-model="editName"
            placeholder="Element name"
            fluid
            @update:model-value="markDirty"
          />
        </div>

        <div
          v-for="field in editableConfigFields"
          :key="field.key"
          class="flex flex-col gap-1"
        >
          <label class="text-sm font-medium">{{ field.label }}</label>
          <Textarea
            v-if="field.multiline"
            :model-value="String(editConfig[field.key] ?? '')"
            :placeholder="field.label"
            :rows="3"
            fluid
            @update:model-value="(val: string) => onConfigFieldInput(field.key, val)"
          />
          <InputText
            v-else
            :model-value="String(editConfig[field.key] ?? '')"
            :placeholder="field.label"
            fluid
            @update:model-value="(val: string) => onConfigFieldInput(field.key, val)"
          />
        </div>

        <Button
          label="Save Changes"
          :disabled="!isDirty"
          class="w-full"
          @click="saveChanges"
        />
      </div>
    </div>
  </div>
</template>
```

Note: the per-element preview iframe is removed — the channel preview at the top replaces it.

- [ ] **Step 3: Run lint fix**

Run: `cd apps/engine-ui && npx eslint --fix app/components/operator/ContextPanel.vue`

- [ ] **Step 4: Commit**

```bash
git add apps/engine-ui/app/components/operator/ContextPanel.vue
git commit -m "refactor: add channel preview to ContextPanel, update empty state"
```

---

### Task 5: Wire everything in operator page

**Files:**
- Modify: `apps/engine-ui/app/pages/app/[workspaceId]/operator.vue`

- [ ] **Step 1: Rewrite the operator page with new components and simplified state**

Replace the full file with:

```vue
<script setup lang="ts">
import type { Workspace, Channel, Layer, Element } from 'engine-core'

definePageMeta({
  layout: false
})

const route = useRoute()
const api = useEngineApi()
const { channelState, status: wsStatus, subscribe, disconnect } = useEngineWs()

const workspaces = ref<Workspace[]>([])
const channels = ref<Channel[]>([])
const layers = ref<Layer[]>([])
const elements = ref<Element[]>([])

const selectedWorkspaceId = ref<number | null>(null)
const selectedChannelId = ref<number | null>(null)
const selectedLayerId = ref<number | null>(null)
const editingElementId = ref<number | null>(null)

const editingElement = computed(() => {
  if (editingElementId.value === null) return null
  return elements.value.find(e => e.id === editingElementId.value) ?? null
})

// --- Initialize from route param ---

onMounted(async () => {
  workspaces.value = await api.listWorkspaces()

  const wsId = Number(route.params.workspaceId)
  if (wsId && workspaces.value.some(w => w.id === wsId)) {
    selectedWorkspaceId.value = wsId
  } else if (workspaces.value.length > 0) {
    selectedWorkspaceId.value = workspaces.value[0]!.id
  }
})

// --- Watch workspace changes: load channels ---

watch(selectedWorkspaceId, async (wsId) => {
  if (!wsId) {
    channels.value = []
    selectedChannelId.value = null
    return
  }

  const routeWsId = Number(route.params.workspaceId)
  if (routeWsId !== wsId) {
    await navigateTo(`/app/${wsId}/operator`, { replace: true })
  }

  channels.value = await api.listChannels(wsId)

  if (channels.value.length > 0 && !selectedChannelId.value) {
    selectedChannelId.value = channels.value[0]!.id
  } else if (!channels.value.some(c => c.id === selectedChannelId.value)) {
    selectedChannelId.value = channels.value.length > 0 ? channels.value[0]!.id : null
  }
}, { immediate: true })

// --- Watch channel changes: load layers + elements, subscribe WS ---

watch(selectedChannelId, async (chId) => {
  selectedLayerId.value = null
  editingElementId.value = null

  if (!selectedWorkspaceId.value || !chId) {
    layers.value = []
    elements.value = []
    disconnect()
    return
  }

  const wsId = selectedWorkspaceId.value

  const [layerData, elementData] = await Promise.all([
    api.listLayers(wsId, chId),
    api.listElements(wsId, chId)
  ])
  layers.value = layerData
  elements.value = elementData

  subscribe(wsId, chId)
}, { immediate: true })

// --- Event handlers ---

function getElementVisibility(elementId: number) {
  if (!channelState.value) return 'hidden'
  for (const layer of channelState.value.layers) {
    for (const el of layer.elements) {
      if (el.elementId === elementId) return el.visibility
    }
  }
  return 'hidden'
}

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
  } catch (err) {
    console.error('Toggle failed:', err)
  }
}

function onEdit(elementId: number) {
  editingElementId.value = elementId
}

async function onUpdateElement(elementId: number, fields: { name?: string, config?: unknown }) {
  if (!selectedWorkspaceId.value || !selectedChannelId.value) return
  try {
    const updated = await api.updateElement(
      selectedWorkspaceId.value,
      selectedChannelId.value,
      elementId,
      fields
    )
    const idx = elements.value.findIndex(e => e.id === elementId)
    if (idx !== -1) {
      elements.value[idx] = updated
    }
  } catch (err) {
    console.error('Update element failed:', err)
  }
}
</script>

<template>
  <div class="h-screen flex flex-col bg-surface-950">
    <OperatorTopBar
      :workspaces="workspaces"
      :channels="channels"
      :selected-workspace-id="selectedWorkspaceId"
      :selected-channel-id="selectedChannelId"
      :ws-status="wsStatus"
      :channel-state="channelState"
      @update:selected-workspace-id="selectedWorkspaceId = $event"
      @update:selected-channel-id="selectedChannelId = $event"
    />

    <div class="flex-1 flex overflow-hidden">
      <div class="w-56 border-r border-surface-700 bg-surface-900 flex-shrink-0 overflow-hidden">
        <OperatorLayerFilter
          :layers="layers"
          :channel-state="channelState"
          :selected-layer-id="selectedLayerId"
          @update:selected-layer-id="selectedLayerId = $event"
        />
      </div>

      <div class="flex-1 overflow-hidden bg-surface-950">
        <OperatorElementGrid
          :layers="layers"
          :elements="elements"
          :channel-state="channelState"
          :selected-layer-id="selectedLayerId"
          @toggle="onToggle"
          @edit="onEdit"
        />
      </div>

      <div class="w-80 border-l border-surface-700 bg-surface-900 flex-shrink-0 overflow-hidden">
        <OperatorContextPanel
          :element="editingElement"
          :channel-state="channelState"
          :workspace-id="selectedWorkspaceId ?? 0"
          :channel-id="selectedChannelId"
          @update-element="onUpdateElement"
        />
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Run lint fix**

Run: `cd apps/engine-ui && npx eslint --fix "app/pages/app/[workspaceId]/operator.vue"`

- [ ] **Step 3: Commit**

```bash
git add "apps/engine-ui/app/pages/app/[workspaceId]/operator.vue"
git commit -m "refactor: wire new operator layout — LayerFilter, ElementGrid, ContextPanel"
```

---

### Task 6: Remove old components

**Files:**
- Delete: `apps/engine-ui/app/components/operator/Rundown.vue`
- Delete: `apps/engine-ui/app/components/operator/LayerDashboard.vue`

- [ ] **Step 1: Delete Rundown.vue and LayerDashboard.vue**

```bash
rm apps/engine-ui/app/components/operator/Rundown.vue
rm apps/engine-ui/app/components/operator/LayerDashboard.vue
```

- [ ] **Step 2: Verify no remaining references**

```bash
grep -r "Rundown\|LayerDashboard" apps/engine-ui/app/ --include="*.vue" --include="*.ts"
```

Expected: no matches.

- [ ] **Step 3: Run lint**

Run: `cd apps/engine-ui && npx eslint app/components/operator/ app/pages/app/`

- [ ] **Step 4: Commit**

```bash
git add -A apps/engine-ui/app/components/operator/
git commit -m "chore: remove old Rundown and LayerDashboard components"
```
