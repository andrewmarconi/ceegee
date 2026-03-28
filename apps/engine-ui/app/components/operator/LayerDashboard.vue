<script setup lang="ts">
import type { Element, Layer, ChannelState, ElementVisibility } from 'engine-core'

const props = defineProps<{
  layers: Layer[]
  elements: Element[]
  channelState: ChannelState | null
  selectedElements: Record<number, number | null>
}>()

const emit = defineEmits<{
  'select-element': [layerId: number, elementId: number | null]
  'take': [layerId: number, elementId: number]
  'clear': [layerId: number, elementId: number]
}>()

const sortedLayers = computed(() =>
  [...props.layers].sort((a, b) => a.zIndex - b.zIndex)
)

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

function liveElementForLayer(layerId: number): Element | null {
  for (const el of elementsForLayer(layerId)) {
    const vis = getElementVisibility(el.id)
    if (vis === 'visible' || vis === 'entering') return el
  }
  return null
}

function selectMenuItems(layerId: number) {
  return elementsForLayer(layerId).map(el => ({
    label: el.name,
    value: String(el.id)
  }))
}

function onSelectElement(layerId: number, value: string | undefined) {
  emit('select-element', layerId, value ? Number(value) : null)
}

function onTake(layerId: number) {
  const selectedId = props.selectedElements[layerId]
  if (selectedId) emit('take', layerId, selectedId)
}

function onClear(layerId: number) {
  const liveEl = liveElementForLayer(layerId)
  if (liveEl) emit('clear', layerId, liveEl.id)
}

function getSelectedValue(layerId: number): string | undefined {
  const id = props.selectedElements[layerId]
  return id != null ? String(id) : undefined
}

function layerHasLive(layerId: number): boolean {
  return liveElementForLayer(layerId) !== null
}

function layerHasSelection(layerId: number): boolean {
  return props.selectedElements[layerId] != null
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="px-3 py-2 border-b border-surface-200 dark:border-surface-700">
      <h2 class="text-sm font-semibold text-surface-500 uppercase tracking-wide">
        Layers
      </h2>
    </div>

    <div class="flex-1 overflow-y-auto p-3 space-y-3">
      <div
        v-if="sortedLayers.length === 0"
        class="text-sm text-surface-400 text-center py-8"
      >
        No layers in this channel.
      </div>

      <Card
        v-for="layer in sortedLayers"
        :key="layer.id"
        :class="{ 'ring-2 ring-red-500/50': layerHasLive(layer.id) }"
      >
        <template #title>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold">{{ layer.name }}</span>
              <Tag
                severity="secondary"
                class="text-xs"
              >
                z{{ layer.zIndex }}
              </Tag>
            </div>
            <div
              v-if="layerHasLive(layer.id)"
              class="flex items-center gap-1.5"
            >
              <span class="size-2 rounded-full bg-red-500 animate-pulse" />
              <span class="text-xs font-medium text-red-600 dark:text-red-400">
                {{ liveElementForLayer(layer.id)?.name }}
              </span>
            </div>
            <span
              v-else
              class="text-xs text-surface-400"
            >No element live</span>
          </div>
        </template>

        <template #content>
          <div class="flex items-center gap-3">
            <div class="flex-1">
              <Select
                :model-value="getSelectedValue(layer.id)"
                :options="selectMenuItems(layer.id)"
                option-label="label"
                option-value="value"
                placeholder="Select element..."
                fluid
                @update:model-value="(val: string) => onSelectElement(layer.id, val)"
              />
            </div>

            <Button
              label="TAKE"
              :disabled="!layerHasSelection(layer.id)"
              class="font-bold"
              @click="onTake(layer.id)"
            />

            <Button
              label="CLEAR"
              severity="danger"
              outlined
              :disabled="!layerHasLive(layer.id)"
              class="font-bold"
              @click="onClear(layer.id)"
            />
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>
