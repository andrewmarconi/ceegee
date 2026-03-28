<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { Element, ElementId, ModuleRecord, LayerId, WorkspaceId } from 'engine-core'

const props = defineProps<{
  elements: Element[]
  modules: ModuleRecord[]
  layerId: LayerId
  workspaceId: WorkspaceId
  loading?: boolean
}>()

const emit = defineEmits<{
  create: [data: { name: string, moduleId: number, layerId: number, sortOrder: number, config: unknown }]
  update: [id: ElementId, data: { name?: string, sortOrder?: number, config?: unknown }]
  delete: [id: ElementId]
  reorder: [elementIds: ElementId[]]
}>()

const showCreateModal = ref(false)
const editingElement = ref<Element | null>(null)
const showDeleteConfirm = ref<ElementId | null>(null)

function getModuleLabel(moduleId: number): string {
  return props.modules.find(m => m.id === moduleId)?.label ?? 'Unknown'
}

function getModuleCategory(moduleId: number): string {
  return props.modules.find(m => m.id === moduleId)?.category ?? ''
}

function handleCreate(data: { name: string, moduleId: number, layerId: number, sortOrder: number, config: unknown }) {
  emit('create', data)
  showCreateModal.value = false
}

function handleEdit(data: { name: string, moduleId: number, layerId: number, sortOrder: number, config: unknown }) {
  if (editingElement.value) {
    emit('update', editingElement.value.id, { name: data.name, sortOrder: data.sortOrder, config: data.config })
    editingElement.value = null
  }
}

function confirmDelete(id: ElementId) {
  emit('delete', id)
  showDeleteConfirm.value = null
}

function moveElement(index: number, direction: 'up' | 'down') {
  const ids = props.elements.map(e => e.id)
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= ids.length) return
  ;[ids[index], ids[targetIndex]] = [ids[targetIndex], ids[index]]
  emit('reorder', ids)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-3 py-2 border-b border-surface-200 dark:border-surface-700">
      <h3 class="text-sm font-semibold text-surface-500 uppercase tracking-wide">
        Elements
      </h3>
      <Button
        icon="pi pi-plus"
        size="small"
        text
        severity="secondary"
        aria-label="Add element"
        @click="showCreateModal = true"
      />
    </div>

    <div
      v-if="loading"
      class="flex items-center justify-center py-8"
    >
      <Icon
        icon="lucide:loader-2"
        class="animate-spin text-surface-400"
      />
    </div>

    <div
      v-else-if="elements.length === 0"
      class="px-3 py-6 text-center text-sm text-surface-400"
    >
      No elements yet. Create one to get started.
    </div>

    <div
      v-else
      class="flex-1 overflow-y-auto"
    >
      <div
        v-for="(element, index) in elements"
        :key="element.id"
        class="px-3 py-2.5 border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors group"
      >
        <div class="flex items-center justify-between">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium truncate">
                {{ element.name }}
              </p>
              <Tag
                severity="secondary"
                class="text-xs"
              >
                {{ getModuleLabel(element.moduleId) }}
              </Tag>
            </div>
            <p class="text-xs text-surface-500 mt-0.5">
              {{ getModuleCategory(element.moduleId) }} &middot; #{{ element.sortOrder }}
            </p>
          </div>
          <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <Button
              icon="pi pi-chevron-up"
              size="small"
              text
              severity="secondary"
              :disabled="index === 0"
              @click="moveElement(index, 'up')"
            />
            <Button
              icon="pi pi-chevron-down"
              size="small"
              text
              severity="secondary"
              :disabled="index === elements.length - 1"
              @click="moveElement(index, 'down')"
            />
            <Button
              icon="pi pi-pencil"
              size="small"
              text
              severity="secondary"
              @click="editingElement = element"
            />
            <Button
              icon="pi pi-trash"
              size="small"
              text
              severity="danger"
              @click="showDeleteConfirm = element.id"
            />
          </div>
        </div>
      </div>
    </div>

    <Dialog
      v-model:visible="showCreateModal"
      modal
      header="Create Element"
      class="w-full max-w-lg"
    >
      <div class="max-h-[70vh] overflow-y-auto">
        <ProducerElementForm
          :modules="modules"
          :layer-id="layerId"
          :workspace-id="workspaceId"
          @submit="handleCreate"
          @cancel="showCreateModal = false"
        />
      </div>
    </Dialog>

    <Dialog
      :visible="!!editingElement"
      modal
      header="Edit Element"
      class="w-full max-w-lg"
      @update:visible="(v: boolean) => { if (!v) editingElement = null }"
    >
      <div class="max-h-[70vh] overflow-y-auto">
        <ProducerElementForm
          :element="editingElement"
          :modules="modules"
          :layer-id="layerId"
          :workspace-id="workspaceId"
          @submit="handleEdit"
          @cancel="editingElement = null"
        />
      </div>
    </Dialog>

    <Dialog
      :visible="showDeleteConfirm !== null"
      modal
      header="Delete Element"
      class="w-full max-w-md"
      @update:visible="(v: boolean) => { if (!v) showDeleteConfirm = null }"
    >
      <p class="text-sm text-surface-500 mb-4">
        Are you sure you want to delete this element?
      </p>
      <div class="flex justify-end gap-2">
        <Button
          label="Cancel"
          severity="secondary"
          text
          @click="showDeleteConfirm = null"
        />
        <Button
          label="Delete"
          severity="danger"
          @click="confirmDelete(showDeleteConfirm!)"
        />
      </div>
    </Dialog>
  </div>
</template>
