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

const selectedWorkspace = computed(() =>
  workspaces.value.find(w => w.id === selectedWorkspaceId.value) ?? null
)

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
      <div class="w-56 border-r border-surface-700 bg-surface-900 shrink-0 overflow-hidden">
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
