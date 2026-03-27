<template>
  <div>
    <AppHeader title="Home">
      <template #actions>
        <NuxtLink to="/app">
          <UButton label="Launch App" icon="i-lucide-arrow-right" variant="outline" color="neutral" />
        </NuxtLink>
      </template>
    </AppHeader>

    <UPageHero
      title="CeeGee"
      description="A self-hosted, Node-based HTML graphics engine plus web control UI for broadcast-style overlays."
      :links="[{
        label: 'Launch App',
        to: '/app',
        trailingIcon: 'i-lucide-arrow-right',
        size: 'xl'
      }, {
        label: 'View on Github',
        to: 'https://github.com/andrewmarconi/ceegee',
        target: '_blank',
        icon: 'i-simple-icons-github',
        size: 'xl',
        color: 'neutral',
        variant: 'subtle'
      }]"
    />
  </div>
</template>
