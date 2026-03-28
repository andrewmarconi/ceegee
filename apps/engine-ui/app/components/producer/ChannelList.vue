<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { Channel, ChannelId } from 'engine-core'

const props = defineProps<{
  channels: Channel[]
  selectedId: ChannelId | null
  loading?: boolean
}>()

const emit = defineEmits<{
  select: [id: ChannelId]
  create: [data: { name: string, description: string }]
  update: [id: ChannelId, data: { name: string, description: string }]
  delete: [id: ChannelId]
}>()

const showCreateModal = ref(false)
const editingChannel = ref<Channel | null>(null)
const showDeleteConfirm = ref<ChannelId | null>(null)

function handleCreate(data: { name: string, description: string }) {
  emit('create', data)
  showCreateModal.value = false
}

function handleEdit(data: { name: string, description: string }) {
  if (editingChannel.value) {
    emit('update', editingChannel.value.id, data)
    editingChannel.value = null
  }
}

function confirmDelete(id: ChannelId) {
  emit('delete', id)
  showDeleteConfirm.value = null
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-3 py-2 border-b border-surface-200 dark:border-surface-700">
      <h3 class="text-sm font-semibold text-surface-500 uppercase tracking-wide">
        Channels
      </h3>
      <Button
        icon="pi pi-plus"
        size="small"
        text
        severity="secondary"
        aria-label="Add channel"
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
      v-else-if="channels.length === 0"
      class="px-3 py-6 text-center text-sm text-surface-400"
    >
      No channels yet. Create one to get started.
    </div>

    <div
      v-else
      class="flex-1 overflow-y-auto"
    >
      <button
        v-for="channel in channels"
        :key="channel.id"
        class="w-full text-left px-3 py-2.5 border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors group"
        :class="{ 'bg-primary-50 dark:bg-primary-900/20': selectedId === channel.id }"
        @click="emit('select', channel.id)"
      >
        <div class="flex items-center justify-between">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium truncate">
              {{ channel.name }}
            </p>
            <p
              v-if="channel.description"
              class="text-xs text-surface-500 truncate mt-0.5"
            >
              {{ channel.description }}
            </p>
          </div>
          <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <Button
              icon="pi pi-pencil"
              size="small"
              text
              severity="secondary"
              @click.stop="editingChannel = channel"
            />
            <Button
              icon="pi pi-trash"
              size="small"
              text
              severity="danger"
              @click.stop="showDeleteConfirm = channel.id"
            />
          </div>
        </div>
      </button>
    </div>

    <Dialog
      v-model:visible="showCreateModal"
      modal
      header="Create Channel"
      class="w-full max-w-md"
    >
      <ProducerChannelForm
        @submit="handleCreate"
        @cancel="showCreateModal = false"
      />
    </Dialog>

    <Dialog
      :visible="!!editingChannel"
      modal
      header="Edit Channel"
      class="w-full max-w-md"
      @update:visible="(v: boolean) => { if (!v) editingChannel = null }"
    >
      <ProducerChannelForm
        :channel="editingChannel"
        @submit="handleEdit"
        @cancel="editingChannel = null"
      />
    </Dialog>

    <Dialog
      :visible="showDeleteConfirm !== null"
      modal
      header="Delete Channel"
      class="w-full max-w-md"
      @update:visible="(v: boolean) => { if (!v) showDeleteConfirm = null }"
    >
      <p class="text-sm text-surface-500 mb-4">
        Are you sure? This will also delete all layers and elements in this channel.
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
