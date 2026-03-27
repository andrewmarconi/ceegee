<script setup lang="ts">
import type { Layer } from 'engine-core';

definePageMeta({ layout: 'overlay' });

const route = useRoute();
const workspaceId = Number(route.params.workspaceId);
const layerId = Number(route.params.layerId);

// Fetch layer to get its channelId
const { data: layer } = await useFetch<Layer>(
  `/api/workspaces/${workspaceId}/channels/0/layers/${layerId}`
);
const channelId = computed(() => layer.value?.channelId ?? 0);
</script>

<template>
  <OverlayHost
    v-if="channelId"
    :workspace-id="workspaceId"
    :channel-id="channelId"
    :filter-layer-id="layerId"
  />
</template>
