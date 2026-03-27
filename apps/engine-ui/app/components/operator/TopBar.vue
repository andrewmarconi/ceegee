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
    <div class="flex items-center gap-2">
      <label class="text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Workspace</label>
      <USelect
        v-model="selectedWorkspaceValue"
        :items="workspaceItems"
        placeholder="Select workspace"
        class="w-48"
      />
    </div>

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
