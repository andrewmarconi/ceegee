<script setup lang="ts">
import type { Asset, AssetId, WorkspaceId } from 'engine-core';

const props = defineProps<{
  assets: Asset[];
  workspaceId: WorkspaceId;
  selectedFolder: string | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  delete: [id: AssetId];
  viewUsage: [id: AssetId];
}>();

const viewMode = ref<'grid' | 'list'>('grid');
const showDeleteConfirm = ref<AssetId | null>(null);

const filteredAssets = computed(() => {
  if (!props.selectedFolder) return props.assets;
  return props.assets.filter((a) => a.folderPath === props.selectedFolder);
});

function getAssetUrl(asset: Asset): string {
  return `/api/workspaces/${props.workspaceId}/assets/${asset.id}/file`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(asset: Asset): boolean {
  return asset.mimeType.startsWith('image/');
}

function confirmDelete(id: AssetId) {
  emit('delete', id);
  showDeleteConfirm.value = null;
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
      <span class="text-sm text-gray-500">{{ filteredAssets.length }} asset{{ filteredAssets.length !== 1 ? 's' : '' }}</span>
      <div class="flex gap-1">
        <UButton icon="i-lucide-grid-2x2" size="xs" :variant="viewMode === 'grid' ? 'soft' : 'ghost'" color="neutral" @click="viewMode = 'grid'" />
        <UButton icon="i-lucide-list" size="xs" :variant="viewMode === 'list' ? 'soft' : 'ghost'" color="neutral" @click="viewMode = 'list'" />
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-gray-400" />
    </div>

    <div v-else-if="filteredAssets.length === 0" class="flex items-center justify-center py-8 text-sm text-gray-400">
      No assets{{ selectedFolder ? ' in this folder' : '' }}. Upload one to get started.
    </div>

    <div v-else-if="viewMode === 'grid'" class="flex-1 overflow-y-auto p-3">
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <div v-for="asset in filteredAssets" :key="asset.id" class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-blue-400 transition-colors group">
          <div class="aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
            <img v-if="isImage(asset)" :src="getAssetUrl(asset)" :alt="asset.name" class="object-contain w-full h-full" loading="lazy" />
            <UIcon v-else name="i-lucide-file" class="text-3xl text-gray-400" />
          </div>
          <div class="p-2">
            <p class="text-xs font-medium truncate" :title="asset.name">{{ asset.name }}</p>
            <div class="flex items-center justify-between mt-1">
              <span class="text-xs text-gray-500">{{ formatSize(asset.sizeBytes) }}</span>
              <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <UButton icon="i-lucide-link" size="xs" variant="ghost" color="neutral" @click="emit('viewUsage', asset.id)" />
                <UButton icon="i-lucide-trash-2" size="xs" variant="ghost" color="error" @click="showDeleteConfirm = asset.id" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex-1 overflow-y-auto">
      <div v-for="asset in filteredAssets" :key="asset.id" class="flex items-center gap-3 px-3 py-2 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
        <div class="w-10 h-10 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
          <img v-if="isImage(asset)" :src="getAssetUrl(asset)" :alt="asset.name" class="object-contain w-full h-full" loading="lazy" />
          <UIcon v-else name="i-lucide-file" class="text-gray-400" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">{{ asset.name }}</p>
          <p class="text-xs text-gray-500">
            {{ asset.mimeType }} &middot; {{ formatSize(asset.sizeBytes) }}
            <template v-if="asset.width && asset.height">&middot; {{ asset.width }}&times;{{ asset.height }}</template>
            <template v-if="asset.folderPath">&middot; {{ asset.folderPath }}</template>
          </p>
        </div>
        <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <UButton icon="i-lucide-link" size="xs" variant="ghost" color="neutral" @click="emit('viewUsage', asset.id)" />
          <UButton icon="i-lucide-trash-2" size="xs" variant="ghost" color="error" @click="showDeleteConfirm = asset.id" />
        </div>
      </div>
    </div>

    <UModal :open="showDeleteConfirm !== null" @update:open="(v: boolean) => { if (!v) showDeleteConfirm = null }">
      <template #content>
        <div class="p-4">
          <h3 class="text-lg font-semibold mb-2">Delete Asset</h3>
          <p class="text-sm text-gray-500 mb-4">Are you sure? This will permanently delete the asset file.</p>
          <div class="flex justify-end gap-2">
            <UButton label="Cancel" color="neutral" variant="ghost" @click="showDeleteConfirm = null" />
            <UButton label="Delete" color="error" @click="confirmDelete(showDeleteConfirm!)" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
