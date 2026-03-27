<script setup lang="ts">
import type { Workspace, WorkspaceId } from 'engine-core';

const api = useEngineApi();
const toast = useToast();

const workspaces = ref<Workspace[]>([]);
const loading = ref(true);

const showCreateModal = ref(false);
const editingWorkspace = ref<Workspace | null>(null);
const showDeleteConfirm = ref<WorkspaceId | null>(null);

onMounted(async () => {
  try {
    workspaces.value = await api.listWorkspaces();
  } catch {
    toast.add({ title: 'Failed to load workspaces', color: 'error' });
  } finally {
    loading.value = false;
  }
});

async function handleCreate(data: { name: string; description: string }) {
  try {
    const ws = await $fetch<Workspace>('/api/workspaces', {
      method: 'POST',
      body: data
    });
    workspaces.value.push(ws);
    showCreateModal.value = false;
    toast.add({ title: `Workspace "${ws.name}" created`, color: 'success' });
  } catch {
    toast.add({ title: 'Failed to create workspace', color: 'error' });
  }
}

async function handleUpdate(data: { name: string; description: string }) {
  if (!editingWorkspace.value) return;
  const id = editingWorkspace.value.id;
  try {
    const updated = await $fetch<Workspace>(`/api/workspaces/${id}`, {
      method: 'PUT',
      body: data
    });
    const idx = workspaces.value.findIndex((w) => w.id === id);
    if (idx !== -1) workspaces.value[idx] = updated;
    editingWorkspace.value = null;
    toast.add({ title: `Workspace updated`, color: 'success' });
  } catch {
    toast.add({ title: 'Failed to update workspace', color: 'error' });
  }
}

async function confirmDelete(id: WorkspaceId) {
  try {
    await $fetch(`/api/workspaces/${id}`, { method: 'DELETE' });
    workspaces.value = workspaces.value.filter((w) => w.id !== id);
    showDeleteConfirm.value = null;
    toast.add({ title: 'Workspace deleted', color: 'success' });
  } catch {
    toast.add({ title: 'Failed to delete workspace', color: 'error' });
  }
}
</script>

<template>
  <div>
    <AppHeader title="Workspaces" description="Select a workspace to open its Operator or Producer view.">
      <template #actions>
        <UButton label="New Workspace" icon="i-lucide-plus" @click="showCreateModal = true" />
      </template>
    </AppHeader>

    <div class="max-w-4xl mx-auto px-4 py-8">

    <div v-if="loading" class="flex items-center justify-center py-16">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-gray-400 text-2xl" />
    </div>

    <div v-else-if="workspaces.length === 0" class="text-center py-16">
      <UIcon name="i-lucide-monitor" class="text-4xl text-gray-400 mb-3" />
      <p class="text-gray-500">No workspaces yet. Create one to get started.</p>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <UCard v-for="ws in workspaces" :key="ws.id">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold truncate">{{ ws.name }}</h3>
            <div class="flex gap-0.5">
              <UButton
                icon="i-lucide-pencil"
                size="xs"
                variant="ghost"
                color="neutral"
                aria-label="Edit workspace"
                @click="editingWorkspace = ws"
              />
              <UButton
                icon="i-lucide-trash-2"
                size="xs"
                variant="ghost"
                color="error"
                aria-label="Delete workspace"
                @click="showDeleteConfirm = ws.id"
              />
            </div>
          </div>
        </template>

        <p v-if="ws.description" class="text-sm text-gray-500 mb-3">{{ ws.description }}</p>
        <p v-else class="text-sm text-gray-400 italic mb-3">No description</p>

        <div class="text-xs text-gray-400 mb-4">
          {{ ws.displayConfig.baseWidth }}&times;{{ ws.displayConfig.baseHeight }}
          &middot; {{ ws.displayConfig.aspectRatio }}
        </div>

        <div class="flex gap-2">
          <NuxtLink :to="`/app/${ws.id}/operator`" class="flex-1">
            <UButton label="Operator" icon="i-lucide-play" variant="solid" block size="sm" />
          </NuxtLink>
          <NuxtLink :to="`/app/${ws.id}/producer`" class="flex-1">
            <UButton label="Producer" icon="i-lucide-settings" variant="outline" color="neutral" block size="sm" />
          </NuxtLink>
        </div>
      </UCard>
    </div>

    </div>

    <!-- Create Modal -->
    <UModal v-model:open="showCreateModal">
      <template #content>
        <div class="p-4">
          <h3 class="text-lg font-semibold mb-4">Create Workspace</h3>
          <WorkspaceForm @submit="handleCreate" @cancel="showCreateModal = false" />
        </div>
      </template>
    </UModal>

    <!-- Edit Modal -->
    <UModal :open="!!editingWorkspace" @update:open="(v: boolean) => { if (!v) editingWorkspace = null }">
      <template #content>
        <div class="p-4">
          <h3 class="text-lg font-semibold mb-4">Edit Workspace</h3>
          <WorkspaceForm :workspace="editingWorkspace" @submit="handleUpdate" @cancel="editingWorkspace = null" />
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal :open="showDeleteConfirm !== null" @update:open="(v: boolean) => { if (!v) showDeleteConfirm = null }">
      <template #content>
        <div class="p-4">
          <h3 class="text-lg font-semibold mb-2">Delete Workspace</h3>
          <p class="text-sm text-gray-500 mb-4">
            Are you sure? This will permanently delete the workspace and all its channels, layers, elements, and assets.
          </p>
          <div class="flex justify-end gap-2">
            <UButton label="Cancel" color="neutral" variant="ghost" @click="showDeleteConfirm = null" />
            <UButton label="Delete" color="error" @click="confirmDelete(showDeleteConfirm!)" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
