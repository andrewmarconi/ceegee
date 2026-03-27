<template>
  <UHeader>
    <template #left>
      <NuxtLink to="/">
        <AppLogo class="w-auto h-6 shrink-0" />
      </NuxtLink>
    </template>

    <template #right>
      <NuxtLink to="/app">
        <UButton label="Launch App" trailing-icon="i-lucide-arrow-right" variant="outline" color="neutral" />
      </NuxtLink>
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

  <UMain>
    <slot />
  </UMain>

  <USeparator />

  <UFooter>
    <template #left>
      <p class="text-sm text-muted">CeeGee &copy; {{ new Date().getFullYear() }}</p>
    </template>
  </UFooter>
</template>
