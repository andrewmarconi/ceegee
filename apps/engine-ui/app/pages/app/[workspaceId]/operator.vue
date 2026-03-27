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
const selectedElements = reactive<Record<number, number | null>>({})

// --- Selected element for context panel ---
const selectedElementId = ref<number | null>(null)

const selectedElement = computed(() => {
  if (selectedElementId.value === null) return null
  return elements.value.find(e => e.id === selectedElementId.value) ?? null
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

  const [layerData, elementData] = await Promise.all([
    api.listLayers(wsId, chId),
    api.listElements(wsId, chId)
  ])
  layers.value = layerData
  elements.value = elementData

  subscribe(wsId, chId)
}, { immediate: true })

// --- Event handlers ---

function onSelectElement(layerId: number, elementId: number | null) {
  selectedElements[layerId] = elementId
  if (elementId !== null) {
    selectedElementId.value = elementId
  }
}

function onRundownSelect(elementId: number) {
  selectedElementId.value = elementId
  const element = elements.value.find(e => e.id === elementId)
  if (element) {
    selectedElements[element.layerId] = elementId
  }
}

async function onTake(_layerId: number, elementId: number) {
  if (!selectedWorkspaceId.value || !selectedChannelId.value) return
  try {
    await api.takeElement(selectedWorkspaceId.value, selectedChannelId.value, elementId)
  } catch (err) {
    console.error('Take failed:', err)
  }
}

async function onClear(_layerId: number, elementId: number) {
  if (!selectedWorkspaceId.value || !selectedChannelId.value) return
  try {
    await api.clearElement(selectedWorkspaceId.value, selectedChannelId.value, elementId)
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
      <div class="w-72 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0 overflow-hidden">
        <OperatorRundown
          :elements="elements"
          :layers="layers"
          :channel-state="channelState"
          :selected-element-id="selectedElementId"
          @update:selected-element-id="onRundownSelect"
        />
      </div>

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
