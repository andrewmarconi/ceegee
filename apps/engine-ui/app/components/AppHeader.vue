<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <header class="flex items-center gap-3 px-4 py-2 border-b border-surface-200 dark:border-surface-700">
    <NuxtLink
      to="/app"
      class="flex items-center gap-3"
    >
      <AppLogo class="w-auto h-6 shrink-0" />
      <span class="w-px h-5 bg-surface-300 dark:bg-surface-600" />
      <span class="text-sm font-semibold">{{ title }}</span>
    </NuxtLink>

    <span
      v-if="description"
      class="text-sm text-surface-500 hidden md:inline"
    >{{ description }}</span>

    <div class="flex-1" />

    <div class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
