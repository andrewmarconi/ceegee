<script setup lang="ts">
import type { Layer, LayerId, ChannelId } from 'engine-core';

const props = defineProps<{
  layers: Layer[];
  channelId: ChannelId;
  selectedId: LayerId | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  select: [id: LayerId];
  create: [data: { name: string; zIndex: number; region: string | null }];
  update: [id: LayerId, data: { name: string; zIndex: number; region: string | null }];
  delete: [id: LayerId];
}>();

const showCreateModal = ref(false);
const editingLayer = ref<Layer | null>(null);
const showDeleteConfirm = ref<LayerId | null>(null);

function handleCreate(data: { name: string; zIndex: number; region: string | null }) {
  emit('create', data);
  showCreateModal.value = false;
}

function handleEdit(data: { name: string; zIndex: number; region: string | null }) {
  if (editingLayer.value) {
    emit('update', editingLayer.value.id, data);
    editingLayer.value = null;
  }
}

function confirmDelete(id: LayerId) {
  emit('delete', id);
  showDeleteConfirm.value = null;
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
      <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Layers</h3>
      <UButton icon="i-lucide-plus" size="xs" variant="ghost" color="neutral" aria-label="Add layer" @click="showCreateModal = true" />
    </div>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-gray-400" />
    </div>

    <div v-else-if="layers.length === 0" class="px-3 py-6 text-center text-sm text-gray-400">
      No layers yet. Create one to add elements.
    </div>

    <div v-else class="flex-1 overflow-y-auto">
      <button
        v-for="layer in layers"
        :key="layer.id"
        class="w-full text-left px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
        :class="{ 'bg-blue-50 dark:bg-blue-900/20': selectedId === layer.id }"
        @click="emit('select', layer.id)"
      >
        <div class="flex items-center justify-between">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium truncate">{{ layer.name }}</p>
              <UBadge variant="subtle" color="neutral" size="sm">z{{ layer.zIndex }}</UBadge>
            </div>
            <p v-if="layer.region" class="text-xs text-gray-500 mt-0.5">{{ layer.region }}</p>
          </div>
          <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <UButton icon="i-lucide-pencil" size="xs" variant="ghost" color="neutral" @click.stop="editingLayer = layer" />
            <UButton icon="i-lucide-trash-2" size="xs" variant="ghost" color="error" @click.stop="showDeleteConfirm = layer.id" />
          </div>
        </div>
      </button>
    </div>

    <UModal v-model:open="showCreateModal">
      <template #content>
        <div class="p-4">
          <h3 class="text-lg font-semibold mb-4">Create Layer</h3>
          <ProducerLayerForm @submit="handleCreate" @cancel="showCreateModal = false" />
        </div>
      </template>
    </UModal>

    <UModal :open="!!editingLayer" @update:open="(v: boolean) => { if (!v) editingLayer = null }">
      <template #content>
        <div class="p-4">
          <h3 class="text-lg font-semibold mb-4">Edit Layer</h3>
          <ProducerLayerForm :layer="editingLayer" @submit="handleEdit" @cancel="editingLayer = null" />
        </div>
      </template>
    </UModal>

    <UModal :open="showDeleteConfirm !== null" @update:open="(v: boolean) => { if (!v) showDeleteConfirm = null }">
      <template #content>
        <div class="p-4">
          <h3 class="text-lg font-semibold mb-2">Delete Layer</h3>
          <p class="text-sm text-gray-500 mb-4">Are you sure? This will also delete all elements on this layer.</p>
          <div class="flex justify-end gap-2">
            <UButton label="Cancel" color="neutral" variant="ghost" @click="showDeleteConfirm = null" />
            <UButton label="Delete" color="error" @click="confirmDelete(showDeleteConfirm!)" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
