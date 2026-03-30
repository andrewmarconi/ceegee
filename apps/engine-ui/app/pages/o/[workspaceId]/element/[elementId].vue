<script setup lang="ts">
import type { Element } from 'engine-core'

definePageMeta({ layout: 'overlay' })

const route = useRoute()
const workspaceId = Number(route.params.workspaceId)
const elementId = Number(route.params.elementId)

// Fetch element to get its channelId
const { data: element } = await useFetch<Element>(
  `/api/workspaces/${workspaceId}/channels/0/elements/${elementId}`
)
const channelId = computed(() => element.value?.channelId ?? 0)
</script>

<template>
  <OverlayHost
    v-if="channelId"
    :workspace-id="workspaceId"
    :channel-id="channelId"
    :filter-element-id="elementId"
  />
</template>
