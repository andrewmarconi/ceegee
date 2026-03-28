<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { Asset, AssetId, WorkspaceId } from 'engine-core'

const props = defineProps<{
  assets: Asset[]
  workspaceId: WorkspaceId
  selectedFolder: string | null
  loading?: boolean
}>()

const emit = defineEmits<{
  delete: [id: AssetId]
  viewUsage: [id: AssetId]
}>()

const viewMode = ref<'grid' | 'list'>('grid')
const showDeleteConfirm = ref<AssetId | null>(null)

const filteredAssets = computed(() => {
  if (!props.selectedFolder) return props.assets
  return props.assets.filter(a => a.folderPath === props.selectedFolder)
})

function getAssetUrl(asset: Asset): string {
  return `/api/workspaces/${props.workspaceId}/assets/${asset.id}/file`
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImage(asset: Asset): boolean {
  return asset.mimeType.startsWith('image/')
}

function confirmDelete(id: AssetId) {
  emit('delete', id)
  showDeleteConfirm.value = null
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-3 py-2 border-b border-surface-200 dark:border-surface-700">
      <span class="text-sm text-surface-500">{{ filteredAssets.length }} asset{{ filteredAssets.length !== 1 ? 's' : '' }}</span>
      <div class="flex gap-1">
        <Button
          icon="pi pi-th-large"
          size="small"
          :text="viewMode !== 'grid'"
          :severity="viewMode === 'grid' ? undefined : 'secondary'"
          @click="viewMode = 'grid'"
        />
        <Button
          icon="pi pi-list"
          size="small"
          :text="viewMode !== 'list'"
          :severity="viewMode === 'list' ? undefined : 'secondary'"
          @click="viewMode = 'list'"
        />
      </div>
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
      v-else-if="filteredAssets.length === 0"
      class="flex items-center justify-center py-8 text-sm text-surface-400"
    >
      No assets{{ selectedFolder ? ' in this folder' : '' }}. Upload one to get started.
    </div>

    <div
      v-else-if="viewMode === 'grid'"
      class="flex-1 overflow-y-auto p-3"
    >
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <div
          v-for="asset in filteredAssets"
          :key="asset.id"
          class="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden hover:border-primary-400 transition-colors group"
        >
          <div class="aspect-square bg-surface-100 dark:bg-surface-800 flex items-center justify-center overflow-hidden">
            <img
              v-if="isImage(asset)"
              :src="getAssetUrl(asset)"
              :alt="asset.name"
              class="object-contain w-full h-full"
              loading="lazy"
            >
            <Icon
              v-else
              icon="lucide:file"
              class="text-3xl text-surface-400"
            />
          </div>
          <div class="p-2">
            <p
              class="text-xs font-medium truncate"
              :title="asset.name"
            >
              {{ asset.name }}
            </p>
            <div class="flex items-center justify-between mt-1">
              <span class="text-xs text-surface-500">{{ formatSize(asset.sizeBytes) }}</span>
              <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  icon="pi pi-link"
                  size="small"
                  text
                  severity="secondary"
                  @click="emit('viewUsage', asset.id)"
                />
                <Button
                  icon="pi pi-trash"
                  size="small"
                  text
                  severity="danger"
                  @click="showDeleteConfirm = asset.id"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else
      class="flex-1 overflow-y-auto"
    >
      <div
        v-for="asset in filteredAssets"
        :key="asset.id"
        class="flex items-center gap-3 px-3 py-2 border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors group"
      >
        <div class="w-10 h-10 rounded bg-surface-100 dark:bg-surface-800 flex items-center justify-center overflow-hidden flex-shrink-0">
          <img
            v-if="isImage(asset)"
            :src="getAssetUrl(asset)"
            :alt="asset.name"
            class="object-contain w-full h-full"
            loading="lazy"
          >
          <Icon
            v-else
            icon="lucide:file"
            class="text-surface-400"
          />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">
            {{ asset.name }}
          </p>
          <p class="text-xs text-surface-500">
            {{ asset.mimeType }} &middot; {{ formatSize(asset.sizeBytes) }}
            <template v-if="asset.width && asset.height">
              &middot; {{ asset.width }}&times;{{ asset.height }}
            </template>
            <template v-if="asset.folderPath">
              &middot; {{ asset.folderPath }}
            </template>
          </p>
        </div>
        <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            icon="pi pi-link"
            size="small"
            text
            severity="secondary"
            @click="emit('viewUsage', asset.id)"
          />
          <Button
            icon="pi pi-trash"
            size="small"
            text
            severity="danger"
            @click="showDeleteConfirm = asset.id"
          />
        </div>
      </div>
    </div>

    <Dialog
      :visible="showDeleteConfirm !== null"
      modal
      header="Delete Asset"
      class="w-full max-w-md"
      @update:visible="(v: boolean) => { if (!v) showDeleteConfirm = null }"
    >
      <p class="text-sm text-surface-500 mb-4">
        Are you sure? This will permanently delete the asset file.
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
