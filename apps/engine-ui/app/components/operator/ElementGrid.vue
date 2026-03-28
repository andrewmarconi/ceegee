<script setup lang="ts">
import type { Element, Layer, ChannelState, ElementVisibility } from 'engine-core'

const props = defineProps<{
  layers: Layer[]
  elements: Element[]
  channelState: ChannelState | null
  selectedLayerId: number | null
}>()

const emit = defineEmits<{
  toggle: [elementId: number]
  edit: [elementId: number]
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
    <div
      v-if="visibleLayers.length === 0"
      class="flex-1 flex items-center justify-center text-sm text-surface-400"
    >
      No layers in this channel.
    </div>

    <div
      v-for="layer in visibleLayers"
      :key="layer.id"
      class="rounded-lg border border-surface-700 p-3"
    >
      <h3 class="text-xs font-medium text-surface-500 uppercase tracking-wide mb-2">
        {{ layer.name }}
      </h3>

      <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
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
          <span class="flex-1 px-4 py-4 text-sm font-medium text-left truncate">
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
            class="w-2 h-full min-h-14 rounded-r-md shrink-0"
            :class="isLive(element.id) ? 'bg-red-500 animate-pulse' : 'bg-surface-600'"
          />
        </button>
      </div>
    </div>
  </div>
</template>
