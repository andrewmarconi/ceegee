<script setup lang="ts">
import type { Asset, Element } from 'engine-core';

const props = defineProps<{
  asset: Asset | null;
  elements: Element[];
  open: boolean;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const referencingElements = computed(() => {
  if (!props.asset) return [];
  const assetId = props.asset.id;
  return props.elements.filter((el) => {
    const configStr = JSON.stringify(el.config);
    return configStr.includes(`${assetId}`);
  });
});
</script>

<template>
  <UModal :open="open" @update:open="emit('update:open', $event)">
    <template #content>
      <div class="p-4">
        <h3 class="text-lg font-semibold mb-1">Asset Usage</h3>
        <p v-if="asset" class="text-sm text-gray-500 mb-4">
          References to <strong>{{ asset.name }}</strong> (ID: {{ asset.id }})
        </p>

        <div v-if="referencingElements.length === 0" class="text-sm text-gray-400 py-4 text-center">
          This asset is not referenced by any elements.
        </div>

        <div v-else class="space-y-2">
          <div v-for="el in referencingElements" :key="el.id" class="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded">
            <UIcon name="i-lucide-box" class="text-gray-400 flex-shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium truncate">{{ el.name }}</p>
              <p class="text-xs text-gray-500">Element #{{ el.id }} &middot; Layer #{{ el.layerId }}</p>
            </div>
          </div>
        </div>

        <div class="flex justify-end mt-4">
          <UButton label="Close" color="neutral" variant="ghost" @click="emit('update:open', false)" />
        </div>
      </div>
    </template>
  </UModal>
</template>
