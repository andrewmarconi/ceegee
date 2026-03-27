# Operator UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Operator UI at `/app/:workspaceId/operator` with workspace/channel selection, a rundown list, a layer dashboard with TAKE/CLEAR controls, a context panel with mini preview and quick field editing, and real-time state via WebSocket.

**Architecture:** Two composables (`useEngineApi` for HTTP, `useEngineWs` for WebSocket) provide reactive data access. The operator page uses a three-pane layout: left rundown, center layer dashboard, right context panel. Local "selected" state is held per-layer in the page; TAKE promotes a selection to live by calling the API, which triggers a WebSocket `state:update` broadcast that all connected clients (including this operator) receive for immediate UI reconciliation.

**Tech Stack:** Nuxt 4 (Vue 3), @nuxt/ui v4 (UButton, USelect, USelectMenu, UBadge, UCard, UInput, UTextarea, UTooltip), Tailwind CSS v4, engine-core types via workspace dependency

---

> **This is Plan 4 of 5.** Depends on Plans 1-2 (engine-core + API/WS) and Plan 3 (overlay routes for preview iframes).
> Subsequent plans:
> - Plan 5: Producer UI + Asset management
>
> **Reference docs:**
> - `docs/prd.md` sections 5 (Operator UI), 11.4 (App UI in Nuxt)
> - `docs/schema-typescript.md` -- all domain types, ChannelState, EngineEvent
> - `docs/decisions.md` -- state:update full replacement semantics
> - `packages/engine-core/src/types.ts` -- implemented types
> - `apps/engine-ui/server/routes/ws.ts` -- WebSocket subscribe protocol
> - `apps/engine-ui/server/utils/ws-connections.ts` -- broadcast pattern

---

## File structure

All files created or modified by this plan:

```
apps/engine-ui/app/
├── composables/
│   ├── useEngineApi.ts                   # CREATE: typed $fetch wrapper for all API calls
│   └── useEngineWs.ts                    # CREATE: WebSocket composable with reactive ChannelState
├── pages/
│   └── app/
│       └── [workspaceId]/
│           └── operator.vue              # CREATE: main operator page (three-pane layout)
├── components/
│   └── operator/
│       ├── TopBar.vue                    # CREATE: workspace/channel selector, WS status, On Air
│       ├── Rundown.vue                   # CREATE: left pane element list
│       ├── LayerDashboard.vue            # CREATE: center pane layer rows with TAKE/CLEAR
│       └── ContextPanel.vue              # CREATE: right pane preview + quick edit
└── app.vue                               # MODIFY: add operator layout route support
```

---

## Task 1: `useEngineApi` composable

**Files:**
- Create: `apps/engine-ui/app/composables/useEngineApi.ts`

This composable provides typed wrappers around `$fetch` for all API endpoints the Operator UI needs. It returns plain functions (not reactive) since data fetching is imperative in the operator flow.

- [ ] **Step 1: Create the composable file**

```ts
// apps/engine-ui/app/composables/useEngineApi.ts

import type {
  Workspace,
  Channel,
  Layer,
  Element,
  ChannelState,
  UpdateElementInput,
  EngineEvent
} from 'engine-core'

export function useEngineApi() {
  function listWorkspaces(): Promise<Workspace[]> {
    return $fetch('/api/workspaces')
  }

  function getWorkspace(workspaceId: number): Promise<Workspace> {
    return $fetch(`/api/workspaces/${workspaceId}`)
  }

  function listChannels(workspaceId: number): Promise<Channel[]> {
    return $fetch(`/api/workspaces/${workspaceId}/channels`)
  }

  function listLayers(workspaceId: number, channelId: number): Promise<Layer[]> {
    return $fetch(`/api/workspaces/${workspaceId}/channels/${channelId}/layers`)
  }

  function listElements(workspaceId: number, channelId: number): Promise<Element[]> {
    return $fetch(`/api/workspaces/${workspaceId}/channels/${channelId}/elements`)
  }

  function updateElement(
    workspaceId: number,
    channelId: number,
    elementId: number,
    input: UpdateElementInput
  ): Promise<Element> {
    return $fetch(
      `/api/workspaces/${workspaceId}/channels/${channelId}/elements/${elementId}`,
      { method: 'PUT', body: input }
    )
  }

  function takeElement(
    workspaceId: number,
    channelId: number,
    elementId: number
  ): Promise<ChannelState> {
    return $fetch(
      `/api/workspaces/${workspaceId}/channels/${channelId}/elements/${elementId}/take`,
      { method: 'POST' }
    )
  }

  function clearElement(
    workspaceId: number,
    channelId: number,
    elementId: number
  ): Promise<ChannelState> {
    return $fetch(
      `/api/workspaces/${workspaceId}/channels/${channelId}/elements/${elementId}/clear`,
      { method: 'POST' }
    )
  }

  function elementAction(
    workspaceId: number,
    channelId: number,
    elementId: number,
    actionId: string,
    args?: unknown
  ): Promise<EngineEvent> {
    return $fetch(
      `/api/workspaces/${workspaceId}/channels/${channelId}/elements/${elementId}/action`,
      { method: 'POST', body: { actionId, args } }
    )
  }

  return {
    listWorkspaces,
    getWorkspace,
    listChannels,
    listLayers,
    listElements,
    updateElement,
    takeElement,
    clearElement,
    elementAction
  }
}
```

- [ ] **Step 2: Verify** -- Run `pnpm typecheck` from `apps/engine-ui` to confirm no type errors.

- [ ] **Step 3: Commit** -- `git add apps/engine-ui/app/composables/useEngineApi.ts && git commit -m "feat(operator): add useEngineApi composable"`

---

## Task 2: `useEngineWs` composable

**Files:**
- Create: `apps/engine-ui/app/composables/useEngineWs.ts`

This composable manages a single WebSocket connection per operator page. It subscribes to a `{workspaceId, channelId}` pair, provides reactive `channelState`, connection status, and auto-reconnect.

- [ ] **Step 1: Create the composable file**

```ts
// apps/engine-ui/app/composables/useEngineWs.ts

import type { ChannelState, EngineEvent } from 'engine-core'

export type WsConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export function useEngineWs() {
  const channelState = ref<ChannelState | null>(null)
  const status = ref<WsConnectionStatus>('disconnected')

  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let currentWorkspaceId: number | null = null
  let currentChannelId: number | null = null

  function getWsUrl(): string {
    if (import.meta.server) return ''
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws`
  }

  function connect(workspaceId: number, channelId: number) {
    // If already connected to the same channel, just re-subscribe
    if (
      ws &&
      ws.readyState === WebSocket.OPEN &&
      currentWorkspaceId === workspaceId &&
      currentChannelId === channelId
    ) {
      return
    }

    // Close any existing connection
    disconnect()

    currentWorkspaceId = workspaceId
    currentChannelId = channelId
    status.value = 'connecting'

    const url = getWsUrl()
    if (!url) return

    ws = new WebSocket(url)

    ws.onopen = () => {
      status.value = 'connected'
      // Send subscribe message per the protocol in server/routes/ws.ts
      ws!.send(JSON.stringify({
        type: 'subscribe',
        workspaceId,
        channelId
      }))
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const engineEvent: EngineEvent = JSON.parse(event.data)

        if (engineEvent.type === 'state:init' || engineEvent.type === 'state:update') {
          // Full replacement semantics per decisions.md
          channelState.value = engineEvent.payload
        }
        // element:action and telemetry events are ignored by the operator UI for now
      } catch {
        // Ignore malformed messages
      }
    }

    ws.onclose = () => {
      status.value = 'disconnected'
      ws = null
      // Auto-reconnect after 2 seconds if we still have a target
      if (currentWorkspaceId !== null && currentChannelId !== null) {
        reconnectTimer = setTimeout(() => {
          if (currentWorkspaceId !== null && currentChannelId !== null) {
            connect(currentWorkspaceId, currentChannelId)
          }
        }, 2000)
      }
    }

    ws.onerror = () => {
      // onclose will fire after onerror, triggering reconnect
    }
  }

  function subscribe(workspaceId: number, channelId: number) {
    // Reset state when switching channels
    channelState.value = null
    currentWorkspaceId = workspaceId
    currentChannelId = channelId

    if (ws && ws.readyState === WebSocket.OPEN) {
      // Re-subscribe on existing connection
      ws.send(JSON.stringify({
        type: 'subscribe',
        workspaceId,
        channelId
      }))
    } else {
      connect(workspaceId, channelId)
    }
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    currentWorkspaceId = null
    currentChannelId = null
    if (ws) {
      ws.onclose = null // Prevent reconnect on intentional close
      ws.close()
      ws = null
    }
    status.value = 'disconnected'
    channelState.value = null
  }

  // Clean up on component unmount
  onUnmounted(() => {
    disconnect()
  })

  return {
    channelState: readonly(channelState),
    status: readonly(status),
    subscribe,
    disconnect
  }
}
```

- [ ] **Step 2: Verify** -- Run `pnpm typecheck` from `apps/engine-ui`.

- [ ] **Step 3: Commit** -- `git add apps/engine-ui/app/composables/useEngineWs.ts && git commit -m "feat(operator): add useEngineWs composable with auto-reconnect"`

---

## Task 3: Operator TopBar component

**Files:**
- Create: `apps/engine-ui/app/components/operator/TopBar.vue`

The top bar shows workspace selector, channel selector, WebSocket connection status indicator, and an "On Air" badge when any element is visible.

- [ ] **Step 1: Create the component file**

```vue
<!-- apps/engine-ui/app/components/operator/TopBar.vue -->
<script setup lang="ts">
import type { Workspace, Channel, ChannelState } from 'engine-core'
import type { SelectItem } from '@nuxt/ui'
import type { WsConnectionStatus } from '~/composables/useEngineWs'

const props = defineProps<{
  workspaces: Workspace[]
  channels: Channel[]
  selectedWorkspaceId: number | null
  selectedChannelId: number | null
  wsStatus: WsConnectionStatus
  channelState: ChannelState | null
}>()

const emit = defineEmits<{
  'update:selectedWorkspaceId': [value: number]
  'update:selectedChannelId': [value: number]
}>()

const workspaceItems = computed<SelectItem[]>(() =>
  props.workspaces.map(w => ({ label: w.name, value: String(w.id) }))
)

const channelItems = computed<SelectItem[]>(() =>
  props.channels.map(c => ({ label: c.name, value: String(c.id) }))
)

const selectedWorkspaceValue = computed({
  get: () => props.selectedWorkspaceId !== null ? String(props.selectedWorkspaceId) : undefined,
  set: (val) => {
    if (val) emit('update:selectedWorkspaceId', Number(val))
  }
})

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

const wsStatusColor = computed(() => {
  switch (props.wsStatus) {
    case 'connected': return 'success'
    case 'connecting': return 'warning'
    case 'disconnected': return 'error'
    default: return 'neutral'
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
</script>

<template>
  <div class="flex items-center gap-4 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
    <!-- Workspace selector -->
    <div class="flex items-center gap-2">
      <label class="text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Workspace</label>
      <USelect
        v-model="selectedWorkspaceValue"
        :items="workspaceItems"
        placeholder="Select workspace"
        class="w-48"
      />
    </div>

    <!-- Channel selector -->
    <div class="flex items-center gap-2">
      <label class="text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Channel</label>
      <USelect
        v-model="selectedChannelValue"
        :items="channelItems"
        :disabled="!selectedWorkspaceId"
        placeholder="Select channel"
        class="w-48"
      />
    </div>

    <div class="flex-1" />

    <!-- WS connection status -->
    <UTooltip :text="wsStatusLabel">
      <UBadge :color="wsStatusColor" variant="subtle" class="gap-1.5">
        <span
          class="size-2 rounded-full"
          :class="{
            'bg-green-500': wsStatus === 'connected',
            'bg-yellow-500 animate-pulse': wsStatus === 'connecting',
            'bg-red-500': wsStatus === 'disconnected'
          }"
        />
        {{ wsStatusLabel }}
      </UBadge>
    </UTooltip>

    <!-- On Air indicator -->
    <UBadge
      v-if="isOnAir"
      color="error"
      variant="solid"
      class="uppercase font-bold tracking-wider animate-pulse"
    >
      On Air
    </UBadge>
    <UBadge
      v-else
      color="neutral"
      variant="outline"
      class="uppercase font-bold tracking-wider"
    >
      Off Air
    </UBadge>
  </div>
</template>
```

- [ ] **Step 2: Verify** -- Run `pnpm typecheck` from `apps/engine-ui`.

- [ ] **Step 3: Commit** -- `git add apps/engine-ui/app/components/operator/TopBar.vue && git commit -m "feat(operator): add TopBar component with selectors and status"`

---

## Task 4: Rundown component (left pane)

**Files:**
- Create: `apps/engine-ui/app/components/operator/Rundown.vue`

Displays all elements for the current channel ordered by `sortOrder`. Each row shows the element name, layer name, and a status badge. Clicking a row selects it (emits to parent).

- [ ] **Step 1: Create the component file**

```vue
<!-- apps/engine-ui/app/components/operator/Rundown.vue -->
<script setup lang="ts">
import type { Element, Layer, ChannelState, ElementVisibility } from 'engine-core'

const props = defineProps<{
  elements: Element[]
  layers: Layer[]
  channelState: ChannelState | null
  selectedElementId: number | null
}>()

const emit = defineEmits<{
  'update:selectedElementId': [value: number]
}>()

const layerMap = computed(() => {
  const map = new Map<number, Layer>()
  for (const layer of props.layers) {
    map.set(layer.id, layer)
  }
  return map
})

function getElementVisibility(elementId: number): ElementVisibility {
  if (!props.channelState) return 'hidden'
  for (const layer of props.channelState.layers) {
    for (const el of layer.elements) {
      if (el.elementId === elementId) {
        return el.visibility
      }
    }
  }
  return 'hidden'
}

function getStatusLabel(visibility: ElementVisibility): string {
  switch (visibility) {
    case 'visible': return 'On Air'
    case 'entering': return 'On Air'
    case 'exiting': return 'Exiting'
    case 'hidden': return 'Ready'
    default: return 'Ready'
  }
}

function getStatusColor(visibility: ElementVisibility): 'success' | 'error' | 'warning' | 'neutral' {
  switch (visibility) {
    case 'visible': return 'error'
    case 'entering': return 'error'
    case 'exiting': return 'warning'
    case 'hidden': return 'neutral'
    default: return 'neutral'
  }
}

const sortedElements = computed(() => {
  return [...props.elements].sort((a, b) => a.sortOrder - b.sortOrder)
})
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="px-3 py-2 border-b border-gray-200 dark:border-gray-800">
      <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
        Rundown
      </h2>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div v-if="sortedElements.length === 0" class="p-4 text-sm text-gray-400 text-center">
        No elements in this channel.
      </div>

      <button
        v-for="element in sortedElements"
        :key="element.id"
        class="w-full text-left px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 focus:outline-none"
        :class="{
          'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500': selectedElementId === element.id,
          'border-l-2 border-l-transparent': selectedElementId !== element.id
        }"
        @click="emit('update:selectedElementId', element.id)"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium truncate" :class="{
              'text-gray-900 dark:text-gray-100': getElementVisibility(element.id) !== 'hidden',
              'text-gray-700 dark:text-gray-300': getElementVisibility(element.id) === 'hidden'
            }">
              {{ element.name }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
              {{ layerMap.get(element.layerId)?.name ?? 'Unknown layer' }}
            </p>
          </div>
          <UBadge
            :color="getStatusColor(getElementVisibility(element.id))"
            variant="subtle"
            size="sm"
          >
            {{ getStatusLabel(getElementVisibility(element.id)) }}
          </UBadge>
        </div>
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Verify** -- Run `pnpm typecheck` from `apps/engine-ui`.

- [ ] **Step 3: Commit** -- `git add apps/engine-ui/app/components/operator/Rundown.vue && git commit -m "feat(operator): add Rundown component with element list and status badges"`

---

## Task 5: LayerDashboard component (center pane)

**Files:**
- Create: `apps/engine-ui/app/components/operator/LayerDashboard.vue`

One card per layer, sorted by zIndex ascending. Each card shows the layer name, zIndex, the currently live element (if any), a dropdown to pick from layer elements, and TAKE / CLEAR buttons. The "selected" element per layer is managed by the parent page and passed in; TAKE and CLEAR emit events that the parent handles via API calls.

- [ ] **Step 1: Create the component file**

```vue
<!-- apps/engine-ui/app/components/operator/LayerDashboard.vue -->
<script setup lang="ts">
import type { Element, Layer, ChannelState, ElementVisibility } from 'engine-core'

const props = defineProps<{
  layers: Layer[]
  elements: Element[]
  channelState: ChannelState | null
  selectedElements: Record<number, number | null>  // layerId -> elementId | null
}>()

const emit = defineEmits<{
  'select-element': [layerId: number, elementId: number | null]
  'take': [layerId: number, elementId: number]
  'clear': [layerId: number, elementId: number]
}>()

const sortedLayers = computed(() => {
  return [...props.layers].sort((a, b) => a.zIndex - b.zIndex)
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
      if (el.elementId === elementId) {
        return el.visibility
      }
    }
  }
  return 'hidden'
}

function liveElementForLayer(layerId: number): Element | null {
  const layerElements = elementsForLayer(layerId)
  for (const el of layerElements) {
    const vis = getElementVisibility(el.id)
    if (vis === 'visible' || vis === 'entering') {
      return el
    }
  }
  return null
}

function selectMenuItems(layerId: number) {
  return elementsForLayer(layerId).map(el => ({
    label: el.name,
    value: String(el.id)
  }))
}

function onSelectElement(layerId: number, value: string | undefined) {
  emit('select-element', layerId, value ? Number(value) : null)
}

function onTake(layerId: number) {
  const selectedId = props.selectedElements[layerId]
  if (selectedId) {
    emit('take', layerId, selectedId)
  }
}

function onClear(layerId: number) {
  const liveEl = liveElementForLayer(layerId)
  if (liveEl) {
    emit('clear', layerId, liveEl.id)
  }
}

function getSelectedValue(layerId: number): string | undefined {
  const id = props.selectedElements[layerId]
  return id != null ? String(id) : undefined
}

function layerHasLive(layerId: number): boolean {
  return liveElementForLayer(layerId) !== null
}

function layerHasSelection(layerId: number): boolean {
  return props.selectedElements[layerId] != null
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="px-3 py-2 border-b border-gray-200 dark:border-gray-800">
      <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
        Layers
      </h2>
    </div>

    <div class="flex-1 overflow-y-auto p-3 space-y-3">
      <div v-if="sortedLayers.length === 0" class="text-sm text-gray-400 text-center py-8">
        No layers in this channel.
      </div>

      <UCard
        v-for="layer in sortedLayers"
        :key="layer.id"
        :class="{
          'ring-2 ring-red-500/50': layerHasLive(layer.id)
        }"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold">{{ layer.name }}</span>
              <UBadge color="neutral" variant="subtle" size="sm">
                z{{ layer.zIndex }}
              </UBadge>
            </div>
            <div v-if="layerHasLive(layer.id)" class="flex items-center gap-1.5">
              <span class="size-2 rounded-full bg-red-500 animate-pulse" />
              <span class="text-xs font-medium text-red-600 dark:text-red-400">
                {{ liveElementForLayer(layer.id)?.name }}
              </span>
            </div>
            <span v-else class="text-xs text-gray-400">No element live</span>
          </div>
        </template>

        <!-- Element selector + action buttons -->
        <div class="flex items-center gap-3">
          <div class="flex-1">
            <USelectMenu
              :model-value="getSelectedValue(layer.id)"
              :items="selectMenuItems(layer.id)"
              placeholder="Select element..."
              class="w-full"
              @update:model-value="(val: string) => onSelectElement(layer.id, val)"
            />
          </div>

          <UTooltip text="Take selected element on air">
            <UButton
              label="TAKE"
              color="primary"
              variant="solid"
              :disabled="!layerHasSelection(layer.id)"
              class="font-bold"
              @click="onTake(layer.id)"
            />
          </UTooltip>

          <UTooltip text="Clear live element from this layer">
            <UButton
              label="CLEAR"
              color="error"
              variant="outline"
              :disabled="!layerHasLive(layer.id)"
              class="font-bold"
              @click="onClear(layer.id)"
            />
          </UTooltip>
        </div>
      </UCard>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Verify** -- Run `pnpm typecheck` from `apps/engine-ui`.

- [ ] **Step 3: Commit** -- `git add apps/engine-ui/app/components/operator/LayerDashboard.vue && git commit -m "feat(operator): add LayerDashboard component with TAKE/CLEAR controls"`

---

## Task 6: ContextPanel component (right pane)

**Files:**
- Create: `apps/engine-ui/app/components/operator/ContextPanel.vue`

Shows details for the currently selected element: a mini preview iframe pointing to the element overlay route, quick field editing for the element's config (name, plus text fields from config), and a state indicator.

- [ ] **Step 1: Create the component file**

```vue
<!-- apps/engine-ui/app/components/operator/ContextPanel.vue -->
<script setup lang="ts">
import type { Element, ChannelState, ElementVisibility } from 'engine-core'

const props = defineProps<{
  element: Element | null
  channelState: ChannelState | null
  workspaceId: number
}>()

const emit = defineEmits<{
  'update-element': [elementId: number, fields: { name?: string; config?: unknown }]
}>()

// Local editing state -- populated when element changes
const editName = ref('')
const editConfig = ref<Record<string, unknown>>({})
const isDirty = ref(false)

watch(() => props.element, (el) => {
  if (el) {
    editName.value = el.name
    editConfig.value = typeof el.config === 'object' && el.config !== null
      ? { ...(el.config as Record<string, unknown>) }
      : {}
    isDirty.value = false
  } else {
    editName.value = ''
    editConfig.value = {}
    isDirty.value = false
  }
}, { immediate: true })

function markDirty() {
  isDirty.value = true
}

function getElementVisibility(): ElementVisibility {
  if (!props.element || !props.channelState) return 'hidden'
  for (const layer of props.channelState.layers) {
    for (const el of layer.elements) {
      if (el.elementId === props.element.id) {
        return el.visibility
      }
    }
  }
  return 'hidden'
}

const visibility = computed(() => getElementVisibility())

const stateLabel = computed(() => {
  switch (visibility.value) {
    case 'visible': return 'Live (On Air)'
    case 'entering': return 'Entering'
    case 'exiting': return 'Exiting'
    case 'hidden': return 'Ready'
    default: return 'Unknown'
  }
})

const stateColor = computed(() => {
  switch (visibility.value) {
    case 'visible': return 'error'
    case 'entering': return 'error'
    case 'exiting': return 'warning'
    case 'hidden': return 'success'
    default: return 'neutral'
  }
})

// Extract editable text fields from config (strings only, for quick editing)
const editableConfigFields = computed(() => {
  const fields: { key: string; label: string; multiline: boolean }[] = []
  for (const [key, value] of Object.entries(editConfig.value)) {
    if (typeof value === 'string') {
      // Heuristic: fields with "text", "body", "description" in the name get multiline
      const multiline = /text|body|description|content/i.test(key)
      // Convert camelCase/snake_case to readable label
      const label = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]/g, ' ')
        .replace(/^\s/, '')
        .replace(/\b\w/g, c => c.toUpperCase())
      fields.push({ key, label, multiline })
    }
  }
  return fields
})

function onConfigFieldInput(key: string, value: string) {
  editConfig.value[key] = value
  markDirty()
}

function saveChanges() {
  if (!props.element || !isDirty.value) return

  const updates: { name?: string; config?: unknown } = {}

  if (editName.value !== props.element.name) {
    updates.name = editName.value
  }

  // Build updated config from original + edits
  const originalConfig = typeof props.element.config === 'object' && props.element.config !== null
    ? props.element.config as Record<string, unknown>
    : {}
  const mergedConfig = { ...originalConfig }
  for (const field of editableConfigFields.value) {
    mergedConfig[field.key] = editConfig.value[field.key]
  }
  updates.config = mergedConfig

  emit('update-element', props.element.id, updates)
  isDirty.value = false
}

const previewUrl = computed(() => {
  if (!props.element) return ''
  return `/o/${props.workspaceId}/element/${props.element.id}`
})
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="px-3 py-2 border-b border-gray-200 dark:border-gray-800">
      <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
        Context
      </h2>
    </div>

    <!-- No selection state -->
    <div v-if="!element" class="flex-1 flex items-center justify-center p-4">
      <p class="text-sm text-gray-400 text-center">
        Select an element from the rundown or a layer to see details.
      </p>
    </div>

    <!-- Element selected -->
    <div v-else class="flex-1 overflow-y-auto">
      <!-- State indicator -->
      <div class="px-3 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ element.name }}</span>
        <UBadge :color="stateColor" variant="subtle">
          {{ stateLabel }}
        </UBadge>
      </div>

      <!-- Mini preview -->
      <div class="px-3 py-3 border-b border-gray-100 dark:border-gray-800">
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Preview</p>
        <div class="relative w-full bg-black rounded overflow-hidden" style="aspect-ratio: 16/9;">
          <iframe
            :src="previewUrl"
            class="absolute inset-0 w-full h-full border-0"
            :style="{ transform: 'scale(1)', transformOrigin: 'top left' }"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>

      <!-- Quick field editing -->
      <div class="px-3 py-3 space-y-3">
        <p class="text-xs text-gray-500 dark:text-gray-400">Quick Edit</p>

        <!-- Element name -->
        <UFormField label="Name">
          <UInput
            v-model="editName"
            placeholder="Element name"
            @update:model-value="markDirty"
          />
        </UFormField>

        <!-- Config text fields -->
        <UFormField
          v-for="field in editableConfigFields"
          :key="field.key"
          :label="field.label"
        >
          <UTextarea
            v-if="field.multiline"
            :model-value="String(editConfig[field.key] ?? '')"
            :placeholder="field.label"
            :rows="3"
            @update:model-value="(val: string) => onConfigFieldInput(field.key, val)"
          />
          <UInput
            v-else
            :model-value="String(editConfig[field.key] ?? '')"
            :placeholder="field.label"
            @update:model-value="(val: string) => onConfigFieldInput(field.key, val)"
          />
        </UFormField>

        <!-- Save button -->
        <UButton
          label="Save Changes"
          color="primary"
          variant="solid"
          block
          :disabled="!isDirty"
          @click="saveChanges"
        />
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Verify** -- Run `pnpm typecheck` from `apps/engine-ui`.

- [ ] **Step 3: Commit** -- `git add apps/engine-ui/app/components/operator/ContextPanel.vue && git commit -m "feat(operator): add ContextPanel with preview iframe and quick edit"`

---

## Task 7: Operator page (main layout + wiring)

**Files:**
- Create: `apps/engine-ui/app/pages/app/[workspaceId]/operator.vue`

This is the main operator page. It wires together all four components (TopBar, Rundown, LayerDashboard, ContextPanel), manages API data fetching, WebSocket subscription, and the local selection state model.

- [ ] **Step 1: Create the page file**

```vue
<!-- apps/engine-ui/app/pages/app/[workspaceId]/operator.vue -->
<script setup lang="ts">
import type { Workspace, Channel, Layer, Element } from 'engine-core'

definePageMeta({
  layout: false
})

const route = useRoute()
const api = useEngineApi()
const { channelState, status: wsStatus, subscribe, disconnect } = useEngineWs()

// --- Workspace + Channel data ---

const workspaces = ref<Workspace[]>([])
const channels = ref<Channel[]>([])
const layers = ref<Layer[]>([])
const elements = ref<Element[]>([])

const selectedWorkspaceId = ref<number | null>(null)
const selectedChannelId = ref<number | null>(null)

// --- Selection state: per-layer selected element ---
// Maps layerId -> elementId (what the operator has "cued up" but not yet taken)
const selectedElements = reactive<Record<number, number | null>>({})

// --- Selected element for context panel (from rundown click) ---
const selectedElementId = ref<number | null>(null)

const selectedElement = computed(() => {
  if (selectedElementId.value === null) return null
  return elements.value.find(e => e.id === selectedElementId.value) ?? null
})

// --- Initialize from route param ---

onMounted(async () => {
  // Load all workspaces
  workspaces.value = await api.listWorkspaces()

  // Set workspace from route param
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

  // Navigate to correct URL if workspace changed
  const routeWsId = Number(route.params.workspaceId)
  if (routeWsId !== wsId) {
    await navigateTo(`/app/${wsId}/operator`, { replace: true })
  }

  channels.value = await api.listChannels(wsId)

  // Auto-select first channel
  if (channels.value.length > 0 && !selectedChannelId.value) {
    selectedChannelId.value = channels.value[0]!.id
  } else if (!channels.value.some(c => c.id === selectedChannelId.value)) {
    selectedChannelId.value = channels.value.length > 0 ? channels.value[0]!.id : null
  }
}, { immediate: true })

// --- Watch channel changes: load layers + elements, subscribe WS ---

watch(selectedChannelId, async (chId) => {
  // Reset selections
  for (const key of Object.keys(selectedElements)) {
    delete selectedElements[Number(key)]
  }
  selectedElementId.value = null

  if (!selectedWorkspaceId.value || !chId) {
    layers.value = []
    elements.value = []
    disconnect()
    return
  }

  const wsId = selectedWorkspaceId.value

  // Fetch layers and elements in parallel
  const [layerData, elementData] = await Promise.all([
    api.listLayers(wsId, chId),
    api.listElements(wsId, chId)
  ])
  layers.value = layerData
  elements.value = elementData

  // Subscribe to WS for live state
  subscribe(wsId, chId)
}, { immediate: true })

// --- Event handlers ---

function onSelectElement(layerId: number, elementId: number | null) {
  selectedElements[layerId] = elementId

  // Also update the context panel selection
  if (elementId !== null) {
    selectedElementId.value = elementId
  }
}

function onRundownSelect(elementId: number) {
  selectedElementId.value = elementId

  // Also set as selected in its layer
  const element = elements.value.find(e => e.id === elementId)
  if (element) {
    selectedElements[element.layerId] = elementId
  }
}

async function onTake(layerId: number, elementId: number) {
  if (!selectedWorkspaceId.value || !selectedChannelId.value) return

  try {
    await api.takeElement(selectedWorkspaceId.value, selectedChannelId.value, elementId)
    // State update will arrive via WebSocket -- no need to manually update channelState
  } catch (err) {
    console.error('Take failed:', err)
  }
}

async function onClear(_layerId: number, elementId: number) {
  if (!selectedWorkspaceId.value || !selectedChannelId.value) return

  try {
    await api.clearElement(selectedWorkspaceId.value, selectedChannelId.value, elementId)
    // State update will arrive via WebSocket
  } catch (err) {
    console.error('Clear failed:', err)
  }
}

async function onUpdateElement(elementId: number, fields: { name?: string; config?: unknown }) {
  if (!selectedWorkspaceId.value || !selectedChannelId.value) return

  try {
    const updated = await api.updateElement(
      selectedWorkspaceId.value,
      selectedChannelId.value,
      elementId,
      fields
    )
    // Update local elements array with the response
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
  <div class="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
    <!-- Top bar -->
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

    <!-- Three-pane layout -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left pane: Rundown -->
      <div class="w-72 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0 overflow-hidden">
        <OperatorRundown
          :elements="elements"
          :layers="layers"
          :channel-state="channelState"
          :selected-element-id="selectedElementId"
          @update:selected-element-id="onRundownSelect"
        />
      </div>

      <!-- Center pane: Layer dashboard -->
      <div class="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-950">
        <OperatorLayerDashboard
          :layers="layers"
          :elements="elements"
          :channel-state="channelState"
          :selected-elements="selectedElements"
          @select-element="onSelectElement"
          @take="onTake"
          @clear="onClear"
        />
      </div>

      <!-- Right pane: Context panel -->
      <div class="w-80 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0 overflow-hidden">
        <OperatorContextPanel
          :element="selectedElement"
          :channel-state="channelState"
          :workspace-id="selectedWorkspaceId ?? 0"
          @update-element="onUpdateElement"
        />
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Verify** -- Run `pnpm typecheck` from `apps/engine-ui`. Then run `pnpm dev` and navigate to `/app/1/operator` (assuming workspace 1 exists) to visually verify the layout renders.

- [ ] **Step 3: Commit** -- `git add apps/engine-ui/app/pages/app/[workspaceId]/operator.vue && git commit -m "feat(operator): add operator page with three-pane layout and WS wiring"`

---

## Task 8: Update app.vue to support operator layout

**Files:**
- Modify: `apps/engine-ui/app/app.vue`

The operator page uses `layout: false` to opt out of the default app shell (header/footer), since it needs a full-screen three-pane layout. However, the current `app.vue` wraps `<NuxtPage>` in `<UHeader>` / `<UFooter>` / `<UMain>`. We need to make the default layout conditional so the operator page can go full-screen.

The simplest approach: the operator page already sets `definePageMeta({ layout: false })`. Nuxt 4 supports this natively -- when `layout: false`, the page renders without any layout wrapper. However, `app.vue` currently hardcodes the shell around `<NuxtPage>`. We need to move the shell into a default layout file so `layout: false` pages bypass it.

- [ ] **Step 1: Create `apps/engine-ui/app/layouts/default.vue` to hold the existing app shell**

```vue
<!-- apps/engine-ui/app/layouts/default.vue -->
<template>
  <UApp>
    <UHeader>
      <template #left>
        <NuxtLink to="/">
          <AppLogo class="w-auto h-6 shrink-0" />
        </NuxtLink>

        <TemplateMenu />
      </template>

      <template #right>
        <UColorModeButton />

        <UButton
          to="https://github.com/nuxt-ui-templates/starter"
          target="_blank"
          icon="i-simple-icons-github"
          aria-label="GitHub"
          color="neutral"
          variant="ghost"
        />
      </template>
    </UHeader>

    <UMain>
      <slot />
    </UMain>

    <USeparator icon="i-simple-icons-nuxtdotjs" />

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">
          Built with Nuxt UI
        </p>
      </template>

      <template #right>
        <UButton
          to="https://github.com/nuxt-ui-templates/starter"
          target="_blank"
          icon="i-simple-icons-github"
          aria-label="GitHub"
          color="neutral"
          variant="ghost"
        />
      </template>
    </UFooter>
  </UApp>
</template>
```

- [ ] **Step 2: Simplify `apps/engine-ui/app/app.vue` to just provide layout support**

Replace the entire contents with:

```vue
<!-- apps/engine-ui/app/app.vue -->
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
  description: 'Broadcast HTML graphics engine'
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
```

- [ ] **Step 3: Verify** -- Run `pnpm dev` and confirm:
  - The home page `/` still renders with the header/footer shell.
  - The operator page `/app/1/operator` renders full-screen without the shell.

- [ ] **Step 4: Commit** -- `git add apps/engine-ui/app/app.vue apps/engine-ui/app/layouts/default.vue && git commit -m "refactor: extract default layout so operator page can go full-screen"`

---

## Task 9: Integration smoke test

This task verifies the full operator flow works end-to-end.

- [ ] **Step 1: Seed test data**

Start the dev server and use the API to create test data (via curl or any HTTP client):

```bash
# Create a workspace
curl -s -X POST http://localhost:3000/api/workspaces \
  -H 'Content-Type: application/json' \
  -d '{"name":"Demo Show"}'

# Create a channel (assumes workspace id=1)
curl -s -X POST http://localhost:3000/api/workspaces/1/channels \
  -H 'Content-Type: application/json' \
  -d '{"workspaceId":1,"name":"Main Program"}'

# Create a layer (assumes channel id=1)
curl -s -X POST http://localhost:3000/api/workspaces/1/channels/1/layers \
  -H 'Content-Type: application/json' \
  -d '{"workspaceId":1,"channelId":1,"name":"Lower Thirds","zIndex":10}'

# Create a second layer
curl -s -X POST http://localhost:3000/api/workspaces/1/channels/1/layers \
  -H 'Content-Type: application/json' \
  -d '{"workspaceId":1,"channelId":1,"name":"Bugs","zIndex":20}'

# Create elements (assumes layer id=1, need a module id -- use 1 if modules are registered)
# If no modules exist yet, create a placeholder:
curl -s -X POST http://localhost:3000/api/workspaces/1/channels/1/elements \
  -H 'Content-Type: application/json' \
  -d '{"workspaceId":1,"channelId":1,"layerId":1,"name":"Welcome LT","moduleId":1,"sortOrder":1,"config":{"title":"Welcome","subtitle":"to the show"}}'

curl -s -X POST http://localhost:3000/api/workspaces/1/channels/1/elements \
  -H 'Content-Type: application/json' \
  -d '{"workspaceId":1,"channelId":1,"layerId":1,"name":"Guest LT","moduleId":1,"sortOrder":2,"config":{"title":"Jane Doe","subtitle":"Special Guest"}}'

curl -s -X POST http://localhost:3000/api/workspaces/1/channels/1/elements \
  -H 'Content-Type: application/json' \
  -d '{"workspaceId":1,"channelId":1,"layerId":2,"name":"Show Bug","moduleId":1,"sortOrder":1,"config":{"text":"LIVE"}}'
```

- [ ] **Step 2: Manual verification checklist**

Open `http://localhost:3000/app/1/operator` in a browser and verify:

1. **TopBar**: Workspace dropdown shows "Demo Show". Channel dropdown shows "Main Program". WS status shows "Connected" with a green dot.
2. **Rundown** (left): Shows 3 elements -- "Welcome LT", "Guest LT", "Show Bug" -- each with "Ready" badge.
3. **Layer Dashboard** (center): Shows 2 layer cards -- "Lower Thirds (z10)" and "Bugs (z20)". Each has a select dropdown with its elements and TAKE/CLEAR buttons.
4. **Selection flow**: Select "Welcome LT" in the Lower Thirds dropdown. TAKE button enables. Click TAKE. The WebSocket pushes a state update. The rundown shows "Welcome LT" with "On Air" badge. The layer card shows a red ring and "Welcome LT" as live.
5. **Context panel** (right): Click "Guest LT" in the rundown. Preview iframe loads. Quick edit shows "title" and "subtitle" fields. Edit the title, click "Save Changes", verify the element name updates.
6. **Clear flow**: Click CLEAR on the Lower Thirds layer. "Welcome LT" goes back to "Ready". On Air indicator in the top bar disappears.
7. **Multi-tab**: Open a second browser tab to the same operator URL. Perform TAKE in tab 1. Verify tab 2 updates in real time via WebSocket.

- [ ] **Step 3: Commit** -- No code changes; this is a verification step. If any bugs were found and fixed during steps 1-2, commit those fixes:

```
git add -A && git commit -m "fix(operator): integration test fixes"
```

---

## Summary

| Task | Files | Description |
|------|-------|-------------|
| 1 | `app/composables/useEngineApi.ts` | Typed `$fetch` wrapper for all API endpoints |
| 2 | `app/composables/useEngineWs.ts` | WebSocket composable with reactive ChannelState + auto-reconnect |
| 3 | `app/components/operator/TopBar.vue` | Workspace/channel selectors, WS status, On Air indicator |
| 4 | `app/components/operator/Rundown.vue` | Left pane: sorted element list with status badges |
| 5 | `app/components/operator/LayerDashboard.vue` | Center pane: layer cards with element selector + TAKE/CLEAR |
| 6 | `app/components/operator/ContextPanel.vue` | Right pane: preview iframe + quick field editing + state indicator |
| 7 | `app/pages/app/[workspaceId]/operator.vue` | Main page wiring all components + state management |
| 8 | `app/app.vue` + `app/layouts/default.vue` | Extract layout so operator can go full-screen |
| 9 | (manual) | Integration smoke test with seeded data |

**Total new files:** 8 (2 composables, 4 components, 1 page, 1 layout)
**Modified files:** 1 (`app.vue`)
