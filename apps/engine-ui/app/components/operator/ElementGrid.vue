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

function getStatusClass(elementId: number): string {
  const { statusClass } = useVisibilityStyle(() => getElementVisibility(elementId))
  return statusClass.value
}

function getIsLive(elementId: number): boolean {
  const { isLive } = useVisibilityStyle(() => getElementVisibility(elementId))
  return isLive.value
}

function isLayerLocked(layerId: number): boolean {
  return props.layers.find(l => l.id === layerId)?.locked ?? false
}

const flashingElements = ref<Set<number>>(new Set())

function onElementClick(element: Element) {
  if (isLayerLocked(element.layerId)) {
    flashingElements.value.add(element.id)
    setTimeout(() => {
      flashingElements.value.delete(element.id)
    }, 400)
    return
  }
  emit('toggle', element.id)
}

function flashLockedElements(layerIds: number[]) {
  const lockedIds = new Set(layerIds)
  for (const el of props.elements) {
    if (lockedIds.has(el.layerId) && getIsLive(el.id)) {
      flashingElements.value.add(el.id)
    }
  }
  setTimeout(() => {
    flashingElements.value.clear()
  }, 400)
}

defineExpose({ flashLockedElements })
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
      <h3 class="text-xs font-medium text-surface-500 uppercase tracking-wide mb-3">
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
          class="relative flex items-center rounded-md border overflow-hidden transition-all group"
          :class="[
            isLayerLocked(element.layerId) ? 'status-hidden opacity-50 cursor-not-allowed' : getStatusClass(element.id),
            !isLayerLocked(element.layerId) && getIsLive(element.id)
              ? 'hover:brightness-110'
              : '',
            !isLayerLocked(element.layerId) && !getIsLive(element.id)
              ? 'hover:border-surface-500'
              : ''
          ]"
          @click="onElementClick(element)"
        >
          <span class="flex-1 px-4 py-4 text-sm font-medium text-left truncate">
            {{ element.name }}
          </span>

          <i
            v-if="isLayerLocked(element.layerId)"
            class="pi pi-lock text-xs text-surface-400 mr-3"
            :class="flashingElements.has(element.id) ? 'lock-flash' : ''"
          />

          <button
            v-else
            class="absolute right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/20"
            title="Edit element"
            @click.stop="emit('edit', element.id)"
          >
            <i class="pi pi-pencil text-xs" />
          </button>
        </button>
      </div>
    </div>
  </div>
</template>
