<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <UHeader>
    <template #left>
      <NuxtLink to="/app" class="flex items-center gap-3">
        <AppLogo class="w-auto h-6 shrink-0" />
        <USeparator orientation="vertical" class="h-5" />
        <span class="text-sm font-semibold">{{ title }}</span>
      </NuxtLink>
    </template>

    <span v-if="description" class="text-sm text-muted hidden md:inline">{{ description }}</span>

    <template #right>
      <slot name="actions" />
      <UButton
        to="https://github.com/andrewmarconi/ceegee"
        target="_blank"
        icon="i-simple-icons-github"
        aria-label="GitHub"
        color="neutral"
        variant="ghost"
      />
    </template>
  </UHeader>
</template>
