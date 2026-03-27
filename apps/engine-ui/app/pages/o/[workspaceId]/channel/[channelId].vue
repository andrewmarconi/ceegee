<script setup lang="ts">
definePageMeta({ layout: 'overlay' });

const route = useRoute();
const workspaceId = Number(route.params.workspaceId);
const channelId = Number(route.params.channelId);
</script>

<template>
  <OverlayHost :workspace-id="workspaceId" :channel-id="channelId" />
</template>
