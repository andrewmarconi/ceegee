<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { Asset, Element } from 'engine-core'

const props = defineProps<{
  asset: Asset | null
  elements: Element[]
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const referencingElements = computed(() => {
  if (!props.asset) return []
  const assetId = props.asset.id
  return props.elements.filter((el) => {
    const configStr = JSON.stringify(el.config)
    return configStr.includes(`${assetId}`)
  })
})
</script>

<template>
  <Dialog
    :visible="open"
    modal
    header="Asset Usage"
    class="w-full max-w-md"
    @update:visible="emit('update:open', $event)"
  >
    <p
      v-if="asset"
      class="text-sm text-surface-500 mb-4"
    >
      References to <strong>{{ asset.name }}</strong> (ID: {{ asset.id }})
    </p>

    <div
      v-if="referencingElements.length === 0"
      class="text-sm text-surface-400 py-4 text-center"
    >
      This asset is not referenced by any elements.
    </div>

    <div
      v-else
      class="space-y-2"
    >
      <div
        v-for="el in referencingElements"
        :key="el.id"
        class="flex items-center gap-2 p-2 border border-surface-200 dark:border-surface-700 rounded"
      >
        <Icon
          icon="lucide:box"
          class="text-surface-400 flex-shrink-0"
        />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium truncate">
            {{ el.name }}
          </p>
          <p class="text-xs text-surface-500">
            Element #{{ el.id }} &middot; Layer #{{ el.layerId }}
          </p>
        </div>
      </div>
    </div>

    <div class="flex justify-end mt-4">
      <Button
        label="Close"
        severity="secondary"
        text
        @click="emit('update:open', false)"
      />
    </div>
  </Dialog>
</template>
