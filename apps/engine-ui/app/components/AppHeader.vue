<script setup lang="ts">
defineProps<{
  title: string
  workspaceName?: string
}>()
</script>

<template>
  <header class="flex items-center gap-3 px-4 py-2 border-b border-surface-200 dark:border-surface-700">
    <NuxtLink
      v-tooltip.bottom="'Back to Workspaces'"
      to="/app"
      class="shrink-0"
    >
      <AppLogo class="w-auto h-6" />
    </NuxtLink>

    <span class="w-px h-5 bg-surface-300 dark:bg-surface-600 shrink-0" />

    <template v-if="workspaceName">
      <span class="text-sm font-semibold truncate">{{ workspaceName }}</span>
      <span class="text-surface-400 shrink-0">&#8250;</span>
      <span class="text-sm font-semibold whitespace-nowrap">{{ title }}</span>
    </template>
    <template v-else>
      <span class="text-sm font-semibold whitespace-nowrap">{{ title }}</span>
    </template>

    <slot name="breadcrumb-extra" />

    <div class="flex-1" />

    <div class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
