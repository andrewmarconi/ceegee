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
  for (const layer of props.layers) map.set(layer.id, layer)
  return map
})

function getElementVisibility(elementId: number): ElementVisibility {
  if (!props.channelState) return 'hidden'
  for (const layer of props.channelState.layers) {
    for (const el of layer.elements) {
      if (el.elementId === elementId) return el.visibility
    }
  }
  return 'hidden'
}

function getStatusLabel(visibility: ElementVisibility): string {
  switch (visibility) {
    case 'visible': case 'entering': return 'On Air'
    case 'exiting': return 'Exiting'
    default: return 'Ready'
  }
}

function getStatusColor(visibility: ElementVisibility): 'success' | 'error' | 'warning' | 'neutral' {
  switch (visibility) {
    case 'visible': case 'entering': return 'error'
    case 'exiting': return 'warning'
    default: return 'neutral'
  }
}

const sortedElements = computed(() =>
  [...props.elements].sort((a, b) => a.sortOrder - b.sortOrder)
)
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="px-3 py-2 border-b border-gray-200 dark:border-gray-800">
      <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Rundown</h2>
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
            <p class="text-sm font-medium truncate">{{ element.name }}</p>
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
