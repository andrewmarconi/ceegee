<script setup lang="ts">
import type { Layer, ChannelState } from 'engine-core'

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
