<script setup>
definePageMeta({ layout: 'marketing' })
</script>

<template>
  <section class="flex flex-col items-center justify-center text-center py-24 px-4">
    <h1 class="text-5xl font-bold mb-4">
      CeeGee
    </h1>
    <p class="text-xl text-surface-500 max-w-2xl mb-8">
      A self-hosted, Node-based HTML graphics engine plus web control UI for broadcast-style overlays.
    </p>
    <div class="flex gap-4">
      <NuxtLink to="/app">
        <Button
          label="Launch App"
          icon="pi pi-arrow-right"
          icon-pos="right"
          size="large"
        />
      </NuxtLink>
      <a
        href="https://github.com/andrewmarconi/ceegee"
        target="_blank"
      >
        <Button
          label="View on Github"
          icon="pi pi-github"
          severity="secondary"
          size="large"
          outlined
        />
      </a>
    </div>
  </section>
</template>
