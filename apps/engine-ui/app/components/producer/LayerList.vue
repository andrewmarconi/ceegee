<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { Layer, LayerId, ChannelId } from 'engine-core'

defineProps<{
  layers: Layer[]
  channelId: ChannelId
  selectedId: LayerId | null
  loading?: boolean
}>()

const emit = defineEmits<{
  select: [id: LayerId]
  create: [data: { name: string, zIndex: number, region: string | null }]
  update: [id: LayerId, data: { name: string, zIndex: number, region: string | null }]
  delete: [id: LayerId]
}>()

const showCreateModal = ref(false)
const editingLayer = ref<Layer | null>(null)
const showDeleteConfirm = ref<LayerId | null>(null)

function handleCreate(data: { name: string, zIndex: number, region: string | null }) {
  emit('create', data)
  showCreateModal.value = false
}

function handleEdit(data: { name: string, zIndex: number, region: string | null }) {
  if (editingLayer.value) {
    emit('update', editingLayer.value.id, data)
    editingLayer.value = null
  }
}

function confirmDelete(id: LayerId) {
  emit('delete', id)
  showDeleteConfirm.value = null
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-3 py-2 border-b border-surface-200 dark:border-surface-700">
      <h3 class="text-sm font-semibold text-surface-500 uppercase tracking-wide">
        Layers
      </h3>
      <Button
        icon="pi pi-plus"
        size="small"
        text
        severity="secondary"
        aria-label="Add layer"
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
      v-else-if="layers.length === 0"
      class="px-3 py-6 text-center text-sm text-surface-400"
    >
      No layers yet. Create one to add elements.
    </div>

    <div
      v-else
      class="flex-1 overflow-y-auto"
    >
      <button
        v-for="layer in layers"
        :key="layer.id"
        class="w-full text-left px-3 py-2.5 border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors group"
        :class="{ 'bg-primary-50 dark:bg-primary-900/20': selectedId === layer.id }"
        @click="emit('select', layer.id)"
      >
        <div class="flex items-center justify-between">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium truncate">
                {{ layer.name }}
              </p>
              <Tag
                severity="secondary"
                class="text-xs"
              >
                z{{ layer.zIndex }}
              </Tag>
            </div>
            <p
              v-if="layer.region"
              class="text-xs text-surface-500 mt-0.5"
            >
              {{ layer.region }}
            </p>
          </div>
          <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <Button
              icon="pi pi-pencil"
              size="small"
              text
              severity="secondary"
              @click.stop="editingLayer = layer"
            />
            <Button
              icon="pi pi-trash"
              size="small"
              text
              severity="danger"
              @click.stop="showDeleteConfirm = layer.id"
            />
          </div>
        </div>
      </button>
    </div>

    <Dialog
      v-model:visible="showCreateModal"
      modal
      header="Create Layer"
      class="w-full max-w-md"
    >
      <ProducerLayerForm
        @submit="handleCreate"
        @cancel="showCreateModal = false"
      />
    </Dialog>

    <Dialog
      :visible="!!editingLayer"
      modal
      header="Edit Layer"
      class="w-full max-w-md"
      @update:visible="(v: boolean) => { if (!v) editingLayer = null }"
    >
      <ProducerLayerForm
        :layer="editingLayer"
        @submit="handleEdit"
        @cancel="editingLayer = null"
      />
    </Dialog>

    <Dialog
      :visible="showDeleteConfirm !== null"
      modal
      header="Delete Layer"
      class="w-full max-w-md"
      @update:visible="(v: boolean) => { if (!v) showDeleteConfirm = null }"
    >
      <p class="text-sm text-surface-500 mb-4">
        Are you sure? This will also delete all elements on this layer.
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
