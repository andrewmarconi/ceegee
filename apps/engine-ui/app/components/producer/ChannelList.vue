<script setup lang="ts">
import type { Channel, ChannelId } from 'engine-core';

const props = defineProps<{
  channels: Channel[];
  selectedId: ChannelId | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  select: [id: ChannelId];
  create: [data: { name: string; description: string }];
  update: [id: ChannelId, data: { name: string; description: string }];
  delete: [id: ChannelId];
}>();

const showCreateModal = ref(false);
const editingChannel = ref<Channel | null>(null);
const showDeleteConfirm = ref<ChannelId | null>(null);

function handleCreate(data: { name: string; description: string }) {
  emit('create', data);
  showCreateModal.value = false;
}

function handleEdit(data: { name: string; description: string }) {
  if (editingChannel.value) {
    emit('update', editingChannel.value.id, data);
    editingChannel.value = null;
  }
}

function confirmDelete(id: ChannelId) {
  emit('delete', id);
  showDeleteConfirm.value = null;
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
      <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Channels</h3>
      <UButton icon="i-lucide-plus" size="xs" variant="ghost" color="neutral" aria-label="Add channel" @click="showCreateModal = true" />
    </div>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-gray-400" />
    </div>

    <div v-else-if="channels.length === 0" class="px-3 py-6 text-center text-sm text-gray-400">
      No channels yet. Create one to get started.
    </div>

    <div v-else class="flex-1 overflow-y-auto">
      <button
        v-for="channel in channels"
        :key="channel.id"
        class="w-full text-left px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
        :class="{ 'bg-blue-50 dark:bg-blue-900/20': selectedId === channel.id }"
        @click="emit('select', channel.id)"
      >
        <div class="flex items-center justify-between">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium truncate">{{ channel.name }}</p>
            <p v-if="channel.description" class="text-xs text-gray-500 truncate mt-0.5">{{ channel.description }}</p>
          </div>
          <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <UButton icon="i-lucide-pencil" size="xs" variant="ghost" color="neutral" @click.stop="editingChannel = channel" />
            <UButton icon="i-lucide-trash-2" size="xs" variant="ghost" color="error" @click.stop="showDeleteConfirm = channel.id" />
          </div>
        </div>
      </button>
    </div>

    <UModal v-model:open="showCreateModal">
      <template #content>
        <div class="p-4">
          <h3 class="text-lg font-semibold mb-4">Create Channel</h3>
          <ProducerChannelForm @submit="handleCreate" @cancel="showCreateModal = false" />
        </div>
      </template>
    </UModal>

    <UModal :open="!!editingChannel" @update:open="(v: boolean) => { if (!v) editingChannel = null }">
      <template #content>
        <div class="p-4">
          <h3 class="text-lg font-semibold mb-4">Edit Channel</h3>
          <ProducerChannelForm :channel="editingChannel" @submit="handleEdit" @cancel="editingChannel = null" />
        </div>
      </template>
    </UModal>

    <UModal :open="showDeleteConfirm !== null" @update:open="(v: boolean) => { if (!v) showDeleteConfirm = null }">
      <template #content>
        <div class="p-4">
          <h3 class="text-lg font-semibold mb-2">Delete Channel</h3>
          <p class="text-sm text-gray-500 mb-4">Are you sure? This will also delete all layers and elements in this channel.</p>
          <div class="flex justify-end gap-2">
            <UButton label="Cancel" color="neutral" variant="ghost" @click="showDeleteConfirm = null" />
            <UButton label="Delete" color="error" @click="confirmDelete(showDeleteConfirm!)" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
