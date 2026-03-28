<template>
  <div class="min-h-screen flex flex-col">
    <header class="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-700">
      <NuxtLink to="/">
        <AppLogo class="w-auto h-6 shrink-0" />
      </NuxtLink>

      <div class="flex items-center gap-2">
        <NuxtLink to="/app">
          <Button
            label="Launch App"
            icon="pi pi-arrow-right"
            icon-pos="right"
            severity="secondary"
            outlined
          />
        </NuxtLink>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <Divider />

    <footer class="px-4 py-4">
      <p class="text-sm text-surface-500">
        CeeGee &copy; {{ new Date().getFullYear() }}
      </p>
    </footer>
  </div>
</template>
