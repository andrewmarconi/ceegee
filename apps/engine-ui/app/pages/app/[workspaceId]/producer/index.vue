<script setup lang="ts">
import type { Channel, Layer, Element, ModuleRecord, Workspace, ChannelId, LayerId, ElementId } from 'engine-core'

const route = useRoute()
const workspaceId = computed(() => Number(route.params.workspaceId))
const api = useProducerApi(workspaceId)
const engineApi = useEngineApi()
const toast = useToast()

const workspace = ref<Workspace | null>(null)
const channels = ref<Channel[]>([])
const layers = ref<Layer[]>([])
const elements = ref<Element[]>([])
const modules = ref<ModuleRecord[]>([])

const selectedChannelId = ref<ChannelId | null>(null)
const selectedLayerId = ref<LayerId | null>(null)

const loadingChannels = ref(true)
const loadingLayers = ref(false)
const loadingElements = ref(false)

onMounted(async () => {
  try {
    const [ws, channelList, moduleList] = await Promise.all([
      engineApi.getWorkspace(workspaceId.value),
      api.listChannels(),
      api.listModules()
    ])
    workspace.value = ws
    channels.value = channelList
    modules.value = moduleList
  } catch {
    toast.add({ summary: 'Failed to load data', severity: 'error', life: 3000 })
  } finally {
    loadingChannels.value = false
  }
})

async function selectChannel(id: ChannelId) {
  selectedChannelId.value = id
  selectedLayerId.value = null
  layers.value = []
  elements.value = []
  loadingLayers.value = true
  try {
    layers.value = await api.listLayers(id)
  } catch {
    toast.add({ summary: 'Failed to load layers', severity: 'error', life: 3000 })
  } finally {
    loadingLayers.value = false
  }
}

async function selectLayer(id: LayerId) {
  selectedLayerId.value = id
  elements.value = []
  loadingElements.value = true
  try {
    elements.value = await api.listElements(selectedChannelId.value!, id)
  } catch {
    toast.add({ summary: 'Failed to load elements', severity: 'error', life: 3000 })
  } finally {
    loadingElements.value = false
  }
}

// -- Channel CRUD --
async function handleCreateChannel(data: { name: string, description: string }) {
  try {
    const channel = await api.createChannel(data)
    channels.value.push(channel)
    toast.add({ summary: `Channel "${channel.name}" created`, severity: 'success', life: 3000 })
  } catch {
    toast.add({ summary: 'Failed to create channel', severity: 'error', life: 3000 })
  }
}

async function handleUpdateChannel(id: ChannelId, data: { name: string, description: string }) {
  try {
    const updated = await api.updateChannel(id, data)
    const idx = channels.value.findIndex(c => c.id === id)
    if (idx !== -1) channels.value[idx] = updated
    toast.add({ summary: `Channel updated`, severity: 'success', life: 3000 })
  } catch {
    toast.add({ summary: 'Failed to update channel', severity: 'error', life: 3000 })
  }
}

async function handleDeleteChannel(id: ChannelId) {
  try {
    await api.deleteChannel(id)
    channels.value = channels.value.filter(c => c.id !== id)
    if (selectedChannelId.value === id) {
      selectedChannelId.value = null
      layers.value = []
      elements.value = []
    }
    toast.add({ summary: 'Channel deleted', severity: 'success', life: 3000 })
  } catch {
    toast.add({ summary: 'Failed to delete channel', severity: 'error', life: 3000 })
  }
}

// -- Layer CRUD --
async function handleCreateLayer(data: { name: string, zIndex: number, region: string | null }) {
  if (!selectedChannelId.value) return
  try {
    const layer = await api.createLayer(selectedChannelId.value, data)
    layers.value.push(layer)
    layers.value.sort((a, b) => a.zIndex - b.zIndex)
    toast.add({ summary: `Layer "${layer.name}" created`, severity: 'success', life: 3000 })
  } catch {
    toast.add({ summary: 'Failed to create layer', severity: 'error', life: 3000 })
  }
}

async function handleUpdateLayer(id: LayerId, data: { name: string, zIndex: number, region: string | null }) {
  if (!selectedChannelId.value) return
  try {
    const updated = await api.updateLayer(selectedChannelId.value, id, data)
    const idx = layers.value.findIndex(l => l.id === id)
    if (idx !== -1) layers.value[idx] = updated
    layers.value.sort((a, b) => a.zIndex - b.zIndex)
    toast.add({ summary: `Layer updated`, severity: 'success', life: 3000 })
  } catch {
    toast.add({ summary: 'Failed to update layer', severity: 'error', life: 3000 })
  }
}

async function handleDeleteLayer(id: LayerId) {
  if (!selectedChannelId.value) return
  try {
    await api.deleteLayer(selectedChannelId.value, id)
    layers.value = layers.value.filter(l => l.id !== id)
    if (selectedLayerId.value === id) {
      selectedLayerId.value = null
      elements.value = []
    }
    toast.add({ summary: 'Layer deleted', severity: 'success', life: 3000 })
  } catch {
    toast.add({ summary: 'Failed to delete layer', severity: 'error', life: 3000 })
  }
}

// -- Element CRUD --
async function handleCreateElement(data: { name: string, moduleId: number, layerId: number, sortOrder: number, config: unknown }) {
  if (!selectedChannelId.value) return
  try {
    const element = await api.createElement(selectedChannelId.value, data)
    elements.value.push(element)
    elements.value.sort((a, b) => a.sortOrder - b.sortOrder)
    toast.add({ summary: `Element "${element.name}" created`, severity: 'success', life: 3000 })
  } catch {
    toast.add({ summary: 'Failed to create element', severity: 'error', life: 3000 })
  }
}

async function handleUpdateElement(id: ElementId, data: { name?: string, sortOrder?: number, config?: unknown }) {
  if (!selectedChannelId.value) return
  try {
    const updated = await api.updateElement(selectedChannelId.value, id, data)
    const idx = elements.value.findIndex(e => e.id === id)
    if (idx !== -1) elements.value[idx] = updated
    elements.value.sort((a, b) => a.sortOrder - b.sortOrder)
    toast.add({ summary: `Element updated`, severity: 'success', life: 3000 })
  } catch {
    toast.add({ summary: 'Failed to update element', severity: 'error', life: 3000 })
  }
}

async function handleDeleteElement(id: ElementId) {
  if (!selectedChannelId.value) return
  try {
    await api.deleteElement(selectedChannelId.value, id)
    elements.value = elements.value.filter(e => e.id !== id)
    toast.add({ summary: 'Element deleted', severity: 'success', life: 3000 })
  } catch {
    toast.add({ summary: 'Failed to delete element', severity: 'error', life: 3000 })
  }
}

async function handleReorderElements(elementIds: ElementId[]) {
  if (!selectedChannelId.value || !selectedLayerId.value) return
  try {
    await api.reorderElements(selectedChannelId.value, elementIds)
    elements.value = await api.listElements(selectedChannelId.value, selectedLayerId.value)
  } catch {
    toast.add({ summary: 'Failed to reorder elements', severity: 'error', life: 3000 })
  }
}
</script>

<template>
  <div class="flex flex-col h-screen">
    <AppHeader
      title="Producer"
      :workspace-name="workspace?.name"
    >
      <template #actions>
        <AppPageNav :workspace-id="workspaceId" />
      </template>
    </AppHeader>

    <div class="flex flex-1 min-h-0">
      <div class="w-64 border-r border-surface-200 dark:border-surface-700 shrink-0 overflow-hidden">
        <ProducerChannelList
          :channels="channels"
          :selected-id="selectedChannelId"
          :loading="loadingChannels"
          @select="selectChannel"
          @create="handleCreateChannel"
          @update="handleUpdateChannel"
          @delete="handleDeleteChannel"
        />
      </div>

      <div class="w-72 border-r border-surface-200 dark:border-surface-700 shrink-0 overflow-hidden">
        <template v-if="selectedChannelId">
          <ProducerLayerList
            :layers="layers"
            :channel-id="selectedChannelId"
            :selected-id="selectedLayerId"
            :loading="loadingLayers"
            @select="selectLayer"
            @create="handleCreateLayer"
            @update="handleUpdateLayer"
            @delete="handleDeleteLayer"
          />
        </template>
        <div
          v-else
          class="flex items-center justify-center h-full text-sm text-surface-400"
        >
          Select a channel to view layers
        </div>
      </div>

      <div class="flex-1 overflow-hidden">
        <template v-if="selectedLayerId">
          <ProducerElementList
            :elements="elements"
            :modules="modules"
            :layer-id="selectedLayerId"
            :workspace-id="workspaceId"
            :loading="loadingElements"
            @create="handleCreateElement"
            @update="handleUpdateElement"
            @delete="handleDeleteElement"
            @reorder="handleReorderElements"
          />
        </template>
        <div
          v-else
          class="flex items-center justify-center h-full text-sm text-surface-400"
        >
          <span v-if="selectedChannelId">Select a layer to view elements</span>
          <span v-else>Select a channel, then a layer to manage elements</span>
        </div>
      </div>
    </div>
  </div>
</template>
