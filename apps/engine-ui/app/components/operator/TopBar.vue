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
</script>

<template>
  <div class="flex items-center gap-4 px-4 py-2 border-b border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900">
    <div class="flex items-center gap-2">
      <label class="text-sm font-medium text-surface-500 whitespace-nowrap">Workspace</label>
      <Select
        v-model="selectedWorkspaceValue"
        :options="workspaceItems"
        option-label="label"
        option-value="value"
        placeholder="Select workspace"
        class="w-48"
      />
    </div>

    <div class="flex items-center gap-2">
      <label class="text-sm font-medium text-surface-500 whitespace-nowrap">Channel</label>
      <Select
        v-model="selectedChannelValue"
        :options="channelItems"
        option-label="label"
        option-value="value"
        :disabled="!selectedWorkspaceId"
        placeholder="Select channel"
        class="w-48"
      />
    </div>

    <div class="flex-1" />

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
