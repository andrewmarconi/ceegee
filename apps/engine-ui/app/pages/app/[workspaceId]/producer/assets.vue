<script setup lang="ts">
import type { Asset, Element, AssetId } from 'engine-core';

const route = useRoute();
const workspaceId = computed(() => Number(route.params.workspaceId));
const api = useProducerApi(workspaceId);
const toast = useToast();

const assets = ref<Asset[]>([]);
const allElements = ref<Element[]>([]);
const loading = ref(true);
const uploading = ref(false);

const selectedFolder = ref<string | null>(null);

const folders = computed(() => {
  const folderSet = new Set<string>();
  for (const asset of assets.value) {
    if (asset.folderPath) folderSet.add(asset.folderPath);
  }
  return Array.from(folderSet).sort();
});

const usageAsset = ref<Asset | null>(null);
const showUsageModal = ref(false);

onMounted(async () => {
  try {
    const [assetList, channelList] = await Promise.all([
      api.listAssets(),
      api.listChannels()
    ]);
    assets.value = assetList;

    const elementPromises = channelList.map((ch) => api.listElementsByChannel(ch.id));
    const elementLists = await Promise.all(elementPromises);
    allElements.value = elementLists.flat();
  } catch {
    toast.add({ title: 'Failed to load assets', color: 'error' });
  } finally {
    loading.value = false;
  }
});

async function handleUpload(file: File) {
  uploading.value = true;
  try {
    const asset = await api.uploadAsset(file);
    assets.value.push(asset);
    toast.add({ title: `"${asset.name}" uploaded`, color: 'success' });
  } catch {
    toast.add({ title: 'Upload failed', color: 'error' });
  } finally {
    uploading.value = false;
  }
}

async function handleDelete(id: AssetId) {
  try {
    await api.deleteAsset(id);
    assets.value = assets.value.filter((a) => a.id !== id);
    toast.add({ title: 'Asset deleted', color: 'success' });
  } catch {
    toast.add({ title: 'Failed to delete asset', color: 'error' });
  }
}

function handleViewUsage(id: AssetId) {
  usageAsset.value = assets.value.find((a) => a.id === id) ?? null;
  showUsageModal.value = true;
}
</script>

<template>
  <div class="flex flex-col h-full">
    <AppHeader title="Assets" description="Manage workspace images, logos, and graphics">
      <template #actions>
        <NuxtLink :to="`/app/${workspaceId}/producer`">
          <UButton label="Structure" icon="i-lucide-layers" variant="outline" color="neutral" />
        </NuxtLink>
      </template>
    </AppHeader>

    <div class="flex flex-1 min-h-0">
      <div class="w-48 border-r border-gray-200 dark:border-gray-800 flex-shrink-0 overflow-y-auto">
        <div class="px-3 py-2 border-b border-gray-200 dark:border-gray-800">
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Folders</h3>
        </div>

        <button
          class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          :class="{ 'bg-blue-50 dark:bg-blue-900/20 font-medium': selectedFolder === null }"
          @click="selectedFolder = null"
        >
          All Assets
        </button>

        <button
          v-for="folder in folders"
          :key="folder"
          class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors truncate"
          :class="{ 'bg-blue-50 dark:bg-blue-900/20 font-medium': selectedFolder === folder }"
          :title="folder"
          @click="selectedFolder = folder"
        >
          {{ folder }}
        </button>

        <div v-if="folders.length === 0" class="px-3 py-4 text-xs text-gray-400 text-center">
          No folders yet
        </div>
      </div>

      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <ProducerAssetUpload @upload="handleUpload" />
          <div v-if="uploading" class="flex items-center gap-2 mt-2 text-sm text-gray-500">
            <UIcon name="i-lucide-loader-2" class="animate-spin" />
            Uploading...
          </div>
        </div>

        <div class="flex-1 overflow-hidden">
          <ProducerAssetGrid
            :assets="assets"
            :workspace-id="workspaceId"
            :selected-folder="selectedFolder"
            :loading="loading"
            @delete="handleDelete"
            @view-usage="handleViewUsage"
          />
        </div>
      </div>
    </div>

    <ProducerAssetUsageIndicator
      v-model:open="showUsageModal"
      :asset="usageAsset"
      :elements="allElements"
    />
  </div>
</template>
