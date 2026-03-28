<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { Workspace, WorkspaceId } from 'engine-core'

const api = useEngineApi()
const toast = useToast()

const workspaces = ref<Workspace[]>([])
const loading = ref(true)

const showCreateModal = ref(false)
const editingWorkspace = ref<Workspace | null>(null)
const showDeleteConfirm = ref<WorkspaceId | null>(null)

onMounted(async () => {
  try {
    workspaces.value = await api.listWorkspaces()
  } catch {
    toast.add({ summary: 'Failed to load workspaces', severity: 'error', life: 3000 })
  } finally {
    loading.value = false
  }
})

async function handleCreate(data: { name: string, description: string }) {
  try {
    const ws = await $fetch<Workspace>('/api/workspaces', {
      method: 'POST',
      body: data
    })
    workspaces.value.push(ws)
    showCreateModal.value = false
    toast.add({ summary: `Workspace "${ws.name}" created`, severity: 'success', life: 3000 })
  } catch {
    toast.add({ summary: 'Failed to create workspace', severity: 'error', life: 3000 })
  }
}

async function handleUpdate(data: { name: string, description: string }) {
  if (!editingWorkspace.value) return
  const id = editingWorkspace.value.id
  try {
    const updated = await $fetch<Workspace>(`/api/workspaces/${id}`, {
      method: 'PUT',
      body: data
    })
    const idx = workspaces.value.findIndex(w => w.id === id)
    if (idx !== -1) workspaces.value[idx] = updated
    editingWorkspace.value = null
    toast.add({ summary: 'Workspace updated', severity: 'success', life: 3000 })
  } catch {
    toast.add({ summary: 'Failed to update workspace', severity: 'error', life: 3000 })
  }
}

async function confirmDelete(id: WorkspaceId) {
  try {
    await $fetch(`/api/workspaces/${id}`, { method: 'DELETE' })
    workspaces.value = workspaces.value.filter(w => w.id !== id)
    showDeleteConfirm.value = null
    toast.add({ summary: 'Workspace deleted', severity: 'success', life: 3000 })
  } catch {
    toast.add({ summary: 'Failed to delete workspace', severity: 'error', life: 3000 })
  }
}
</script>

<template>
  <div>
    <AppHeader
      title="Workspaces"
      description="Select a workspace to open its Operator or Producer view."
    >
      <template #actions>
        <Button
          label="New Workspace"
          icon="pi pi-plus"
          @click="showCreateModal = true"
        />
      </template>
    </AppHeader>

    <div class="max-w-4xl mx-auto px-4 py-8">
      <div
        v-if="loading"
        class="flex items-center justify-center py-16"
      >
        <Icon
          icon="lucide:loader-2"
          class="animate-spin text-surface-400 text-2xl"
        />
      </div>

      <div
        v-else-if="workspaces.length === 0"
        class="text-center py-16"
      >
        <Icon
          icon="lucide:monitor"
          class="text-4xl text-surface-400 mb-3"
        />
        <p class="text-surface-500">
          No workspaces yet. Create one to get started.
        </p>
      </div>

      <div
        v-else
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <Card
          v-for="ws in workspaces"
          :key="ws.id"
        >
          <template #title>
            <div class="flex items-center justify-between">
              <h3 class="text-base font-semibold truncate">
                {{ ws.name }}
              </h3>
              <div class="flex gap-0.5">
                <Button
                  icon="pi pi-pencil"
                  size="small"
                  text
                  severity="secondary"
                  aria-label="Edit workspace"
                  @click="editingWorkspace = ws"
                />
                <Button
                  icon="pi pi-trash"
                  size="small"
                  text
                  severity="danger"
                  aria-label="Delete workspace"
                  @click="showDeleteConfirm = ws.id"
                />
              </div>
            </div>
          </template>

          <template #content>
            <p
              v-if="ws.description"
              class="text-sm text-surface-500 mb-3"
            >
              {{ ws.description }}
            </p>
            <p
              v-else
              class="text-sm text-surface-400 italic mb-3"
            >
              No description
            </p>

            <div class="text-xs text-surface-400 mb-4">
              {{ ws.displayConfig.baseWidth }}&times;{{ ws.displayConfig.baseHeight }}
              &middot; {{ ws.displayConfig.aspectRatio }}
            </div>

            <div class="flex gap-2">
              <NuxtLink
                :to="`/app/${ws.id}/operator`"
                class="flex-1"
              >
                <Button
                  label="Operator"
                  icon="pi pi-play"
                  class="w-full"
                  size="small"
                />
              </NuxtLink>
              <NuxtLink
                :to="`/app/${ws.id}/producer`"
                class="flex-1"
              >
                <Button
                  label="Producer"
                  icon="pi pi-cog"
                  severity="secondary"
                  outlined
                  class="w-full"
                  size="small"
                />
              </NuxtLink>
            </div>
          </template>
        </Card>
      </div>
    </div>

    <Dialog
      v-model:visible="showCreateModal"
      modal
      header="Create Workspace"
      class="w-full max-w-md"
    >
      <WorkspaceForm
        @submit="handleCreate"
        @cancel="showCreateModal = false"
      />
    </Dialog>

    <Dialog
      :visible="!!editingWorkspace"
      modal
      header="Edit Workspace"
      class="w-full max-w-md"
      @update:visible="(v: boolean) => { if (!v) editingWorkspace = null }"
    >
      <WorkspaceForm
        :workspace="editingWorkspace"
        @submit="handleUpdate"
        @cancel="editingWorkspace = null"
      />
    </Dialog>

    <Dialog
      :visible="showDeleteConfirm !== null"
      modal
      header="Delete Workspace"
      class="w-full max-w-md"
      @update:visible="(v: boolean) => { if (!v) showDeleteConfirm = null }"
    >
      <p class="text-sm text-surface-500 mb-4">
        Are you sure? This will permanently delete the workspace and all its channels, layers, elements, and assets.
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
