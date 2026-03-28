<script setup lang="ts">
import type { Workspace, Channel, ChannelState } from 'engine-core'
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

const workspaceItems = computed(() =>
  props.workspaces.map(w => ({ label: w.name, value: String(w.id) }))
)

const channelItems = computed(() =>
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

<template>
  <div class="flex items-center gap-3 px-4 py-2 border-b border-surface-700 bg-surface-900">
    <NuxtLink
      to="/app"
      class="flex items-center gap-3"
    >
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
