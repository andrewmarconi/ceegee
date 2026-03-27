<script setup lang="ts">
import type { Element, ElementId, ModuleRecord, LayerId } from 'engine-core';

const props = defineProps<{
  elements: Element[];
  modules: ModuleRecord[];
  layerId: LayerId;
  loading?: boolean;
}>();

const emit = defineEmits<{
  create: [data: { name: string; moduleId: number; layerId: number; sortOrder: number; config: unknown }];
  update: [id: ElementId, data: { name?: string; sortOrder?: number; config?: unknown }];
  delete: [id: ElementId];
  reorder: [elementIds: ElementId[]];
}>();

const showCreateModal = ref(false);
const editingElement = ref<Element | null>(null);
const showDeleteConfirm = ref<ElementId | null>(null);

function getModuleLabel(moduleId: number): string {
  return props.modules.find((m) => m.id === moduleId)?.label ?? 'Unknown';
}

function getModuleCategory(moduleId: number): string {
  return props.modules.find((m) => m.id === moduleId)?.category ?? '';
}

function handleCreate(data: { name: string; moduleId: number; layerId: number; sortOrder: number; config: unknown }) {
  emit('create', data);
  showCreateModal.value = false;
}

function handleEdit(data: { name: string; moduleId: number; layerId: number; sortOrder: number; config: unknown }) {
  if (editingElement.value) {
    emit('update', editingElement.value.id, { name: data.name, sortOrder: data.sortOrder, config: data.config });
    editingElement.value = null;
  }
}

function confirmDelete(id: ElementId) {
  emit('delete', id);
  showDeleteConfirm.value = null;
}

function moveElement(index: number, direction: 'up' | 'down') {
  const ids = props.elements.map((e) => e.id);
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= ids.length) return;
  [ids[index], ids[targetIndex]] = [ids[targetIndex], ids[index]];
  emit('reorder', ids);
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
      <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Elements</h3>
      <UButton icon="i-lucide-plus" size="xs" variant="ghost" color="neutral" aria-label="Add element" @click="showCreateModal = true" />
    </div>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-gray-400" />
    </div>

    <div v-else-if="elements.length === 0" class="px-3 py-6 text-center text-sm text-gray-400">
      No elements yet. Create one to get started.
    </div>

    <div v-else class="flex-1 overflow-y-auto">
      <div
        v-for="(element, index) in elements"
        :key="element.id"
        class="px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
      >
        <div class="flex items-center justify-between">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium truncate">{{ element.name }}</p>
              <UBadge variant="subtle" color="neutral" size="sm">{{ getModuleLabel(element.moduleId) }}</UBadge>
            </div>
            <p class="text-xs text-gray-500 mt-0.5">{{ getModuleCategory(element.moduleId) }} &middot; #{{ element.sortOrder }}</p>
          </div>
          <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <UButton icon="i-lucide-chevron-up" size="xs" variant="ghost" color="neutral" :disabled="index === 0" @click="moveElement(index, 'up')" />
            <UButton icon="i-lucide-chevron-down" size="xs" variant="ghost" color="neutral" :disabled="index === elements.length - 1" @click="moveElement(index, 'down')" />
            <UButton icon="i-lucide-pencil" size="xs" variant="ghost" color="neutral" @click="editingElement = element" />
            <UButton icon="i-lucide-trash-2" size="xs" variant="ghost" color="error" @click="showDeleteConfirm = element.id" />
          </div>
        </div>
      </div>
    </div>

    <UModal v-model:open="showCreateModal">
      <template #content>
        <div class="p-4 max-h-[80vh] overflow-y-auto">
          <h3 class="text-lg font-semibold mb-4">Create Element</h3>
          <ProducerElementForm :modules="modules" :layer-id="layerId" @submit="handleCreate" @cancel="showCreateModal = false" />
        </div>
      </template>
    </UModal>

    <UModal :open="!!editingElement" @update:open="(v: boolean) => { if (!v) editingElement = null }">
      <template #content>
        <div class="p-4 max-h-[80vh] overflow-y-auto">
          <h3 class="text-lg font-semibold mb-4">Edit Element</h3>
          <ProducerElementForm :element="editingElement" :modules="modules" :layer-id="layerId" @submit="handleEdit" @cancel="editingElement = null" />
        </div>
      </template>
    </UModal>

    <UModal :open="showDeleteConfirm !== null" @update:open="(v: boolean) => { if (!v) showDeleteConfirm = null }">
      <template #content>
        <div class="p-4">
          <h3 class="text-lg font-semibold mb-2">Delete Element</h3>
          <p class="text-sm text-gray-500 mb-4">Are you sure you want to delete this element?</p>
          <div class="flex justify-end gap-2">
            <UButton label="Cancel" color="neutral" variant="ghost" @click="showDeleteConfirm = null" />
            <UButton label="Delete" color="error" @click="confirmDelete(showDeleteConfirm!)" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
