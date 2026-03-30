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
  lastHeartbeat: number
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

const wsStatusTooltip = computed(() => {
  switch (props.wsStatus) {
    case 'connected': return 'Connected to Server'
    case 'connecting': return 'Connecting to Server'
    case 'reconnecting': return 'Reconnecting to Server'
    case 'disconnected': return 'Disconnected from Server'
    default: return 'Unknown'
  }
})

const wsDotClass = computed(() => {
  switch (props.wsStatus) {
    case 'connected': return 'ws-dot-connected'
    case 'connecting': return 'ws-dot-connecting'
    case 'reconnecting': return 'ws-dot-reconnecting'
    case 'disconnected': return 'ws-dot-disconnected'
    default: return 'ws-dot-disconnected'
  }
})

const isHeartbeatFlashing = ref(false)
let heartbeatTimeout: ReturnType<typeof setTimeout> | null = null

watch(() => props.lastHeartbeat, () => {
  if (props.lastHeartbeat === 0) return
  isHeartbeatFlashing.value = true
  if (heartbeatTimeout) clearTimeout(heartbeatTimeout)
  heartbeatTimeout = setTimeout(() => {
    isHeartbeatFlashing.value = false
  }, 150)
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

<template>
  <div class="flex items-center gap-3 px-4 py-2 border-b border-surface-700 bg-surface-900">
    <NuxtLink
      to="/app"
      class="shrink-0"
      v-tooltip.bottom="'Back to Workspaces'"
    >
      <AppLogo class="w-auto h-6" />
    </NuxtLink>

    <span class="w-px h-5 bg-surface-600 shrink-0" />

    <span class="text-sm font-semibold truncate">{{ selectedWorkspace?.name ?? 'Workspace' }}</span>
    <span class="text-surface-500 shrink-0">&#8250;</span>
    <span class="text-sm font-semibold whitespace-nowrap">Operator</span>
    <span class="text-surface-500 shrink-0">&#8250;</span>

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

    <span
      v-tooltip.bottom="wsStatusTooltip"
      class="size-2.5 rounded-full shrink-0 cursor-default"
      :class="[wsDotClass, isHeartbeatFlashing ? 'ws-dot-heartbeat' : '']"
    />

    <Button
      label="Clear All"
      icon="pi pi-ban"
      severity="danger"
      text
      size="small"
      :disabled="!hasUnlockedOnAir"
      @click="emit('clear-all')"
    />

    <Tag
      v-if="isOnAir"
      severity="danger"
      class="uppercase font-bold tracking-wider animate-pulse"
      :style="{ boxShadow: '0 0 8px oklch(0.637 0.237 25.331 / 0.5)' }"
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

    <AppPageNav :workspace-id="selectedWorkspaceId ?? 0" />
  </div>
</template>
