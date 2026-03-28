# Nuxt UI to PrimeVue Migration

## Overview

Migrate engine-ui from Nuxt UI v4 to PrimeVue v4 with Aura theme. File-by-file, bottom-up approach to keep the app functional throughout.

## Motivation

Nuxt UI's dependency on Reka UI causes intermittent SSR hydration errors (`'set' on proxy: trap returned falsish for property 'style'`) due to Vue 3.5 proxy incompatibilities. PrimeVue provides a stable, mature alternative.

## Infrastructure Changes

### Theme & Dark Mode

Force dark mode permanently. No user toggle.

```ts
// nuxt.config.ts
import Aura from '@primeuix/themes/aura'

export default defineNuxtConfig({
  primevue: {
    options: {
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.p-dark'
        }
      }
    }
  }
})
```

```ts
// app.vue
useHead({
  htmlAttrs: { class: 'p-dark' }
})
```

### Toast

Mount `<Toast />` once in `app.vue` (replaces Nuxt UI's built-in toast system).

### Icons

Keep `@iconify-json/lucide` and `@iconify-json/simple-icons`. Install `@iconify/vue` for standalone `<Icon>` component usage. PrimeVue button `icon` props use PrimeIcons format (`pi pi-*`).

### Fonts

Set via `body` in `main.css`:
- Sans: Atkinson Hyperlegible Next
- Mono: Atkinson Hyperlegible Mono

PrimeVue components inherit from body.

### app.config.ts

Remove Nuxt UI color config (`ui.colors.primary`, `ui.colors.neutral`).

## Component Mapping

| Nuxt UI | PrimeVue | Notes |
|---------|----------|-------|
| `UButton` | `Button` | `color` -> `severity`, `variant="ghost"` -> `text`, `variant="outline"` -> `outlined`, `size="xs"` -> `size="small"` |
| `UModal` | `Dialog` | `v-model:open` -> `v-model:visible`, add `modal` prop, use `header` prop for title |
| `UForm` | `<form>` | Plain HTML form, PrimeVue doesn't need a form wrapper |
| `UFormField` | `<div>` + `<label>` | Manual label + input grouping, or PrimeVue `FloatLabel` |
| `UInput` | `InputText` | Direct replacement |
| `UTextarea` | `Textarea` | Direct replacement |
| `USelect` | `Select` | `items` -> `options`, add `optionLabel`/`optionValue` |
| `USelectMenu` | `Select` | Same as above |
| `UBadge` | `Tag` | `color` -> `severity`, `variant="subtle"` -> default Tag styling |
| `UIcon` | `<Icon>` from `@iconify/vue` | Or inline SVG for simple cases |
| `UCard` | `Card` | Use `<template #title>`, `<template #content>` slots |
| `UCheckbox` | `Checkbox` | Add separate `<label>` |
| `UApp` | Remove | Not needed, just render slot content |
| `UHeader` | `<header>` | Custom HTML with styling |
| `UFooter` | `<footer>` | Custom HTML with styling |
| `UMain` | `<main>` | Plain semantic HTML |
| `USeparator` | `Divider` | `orientation` prop same |
| `UPageHero` | Custom HTML | `<section>` with heading + description |
| `useToast()` | `useToast()` | `title` -> `summary`, `color` -> `severity`, `description` -> `detail` |

## Migration Order

Bottom-up by dependency. Each file fully converted before moving to the next.

### Phase 1 -- Forms

1. `components/WorkspaceForm.vue`
2. `components/producer/ChannelForm.vue`
3. `components/producer/LayerForm.vue`
4. `components/producer/ElementForm.vue`
5. `components/producer/ConfigForm.vue`

### Phase 2 -- Lists & Panels

6. `components/producer/ChannelList.vue`
7. `components/producer/LayerList.vue`
8. `components/producer/ElementList.vue`
9. `components/producer/AssetUpload.vue`
10. `components/producer/AssetGrid.vue`
11. `components/producer/AssetUsageIndicator.vue`

### Phase 3 -- Operator Components

12. `components/operator/TopBar.vue`
13. `components/operator/Rundown.vue`
14. `components/operator/LayerDashboard.vue`
15. `components/operator/ContextPanel.vue`

### Phase 4 -- Pages

16. `pages/app/index.vue`
17. `pages/app/[workspaceId]/producer/index.vue`
18. `pages/app/[workspaceId]/producer/assets.vue`
19. `pages/app/[workspaceId]/operator.vue` (pass-through, minimal changes)

### Phase 5 -- Layout & App Shell

20. `components/AppHeader.vue`
21. `layouts/marketing.vue`
22. `pages/index.vue`
23. `app.vue` (remove UApp, add Toast, add dark mode class)
24. `app.config.ts` (remove Nuxt UI colors)

### Phase 6 -- Cleanup

25. Remove `@nuxt/ui` from dependencies
26. Remove any leftover Nuxt UI references from lockfile/config

## Out of Scope

- Visual redesign (accept PrimeVue Aura defaults)
- New features or functionality changes
- Overlay system (`OverlayHost.vue`, `AppLogo.vue` -- no Nuxt UI usage)
