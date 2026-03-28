# Nuxt UI to PrimeVue Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all Nuxt UI components with PrimeVue equivalents across the engine-ui app.

**Architecture:** Bottom-up file-by-file migration. Forms first, then lists/panels, then operator components, then pages, then layouts/app shell. Each task produces a working commit.

**Tech Stack:** PrimeVue 4 (Aura theme), @iconify/vue for icons, Nuxt 4

---

### Task 0: Install dependencies and configure infrastructure

**Files:**
- Modify: `apps/engine-ui/package.json`
- Modify: `apps/engine-ui/nuxt.config.ts`
- Modify: `apps/engine-ui/app/app.vue`
- Modify: `apps/engine-ui/app/assets/css/main.css`

- [ ] **Step 1: Install @iconify/vue**

Run: `pnpm --filter engine-ui add @iconify/vue`

- [ ] **Step 2: Update nuxt.config.ts with dark mode selector**

```ts
// nuxt.config.ts
import Aura from '@primeuix/themes/aura'

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@primevue/nuxt-module'],
  devtools: {
    enabled: true
  },
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-01-15',
  nitro: {
    experimental: {
      websocket: true
    }
  },
  debug: true,
  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },
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

- [ ] **Step 3: Update app.vue — remove UApp, add Toast, force dark mode**

```vue
<script setup>
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en',
    class: 'p-dark'
  }
})

const title = 'CeeGee'
const description = 'Broadcast Quality Titling and Graphics'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: '/ogimage.jpg',
  twitterImage: '/ogimage.jpg',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <Toast />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

- [ ] **Step 4: Verify main.css is clean (no Tailwind/Nuxt UI imports)**

```css
body {
  font-family: 'Atkinson Hyperlegible Next', sans-serif;
}

code, pre {
  font-family: 'Atkinson Hyperlegible Mono', monospace;
}
```

- [ ] **Step 5: Run lint and fix**

Run: `cd apps/engine-ui && npx eslint --fix nuxt.config.ts app/app.vue`

- [ ] **Step 6: Commit**

```bash
git add apps/engine-ui/package.json apps/engine-ui/nuxt.config.ts apps/engine-ui/app/app.vue apps/engine-ui/app/assets/css/main.css
git commit -m "chore: configure PrimeVue infrastructure — dark mode, Toast, iconify"
```

---

### Task 1: Migrate WorkspaceForm.vue

**Files:**
- Modify: `apps/engine-ui/app/components/WorkspaceForm.vue`

- [ ] **Step 1: Replace template with PrimeVue components**

Replace `UForm` with `<form>`, `UFormField` with `<div>` + `<label>`, `UInput` with `InputText`, `UTextarea` with `Textarea`, `UButton` with `Button`.

```vue
<script setup lang="ts">
import type { Workspace } from 'engine-core'

const props = defineProps<{
  workspace?: Workspace | null
}>()

const emit = defineEmits<{
  submit: [data: { name: string; description: string; themeTokens?: Record<string, string> }]
  cancel: []
}>()

const state = reactive({
  name: props.workspace?.name ?? '',
  description: props.workspace?.description ?? ''
})

const isEdit = computed(() => !!props.workspace)

function handleSubmit() {
  if (!state.name.trim()) return
  emit('submit', {
    name: state.name.trim(),
    description: state.description.trim()
  })
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium">Name <span class="text-red-500">*</span></label>
      <InputText v-model="state.name" placeholder="e.g. Live Show 2026" autofocus fluid />
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium">Description</label>
      <Textarea v-model="state.description" placeholder="Optional description" fluid />
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <Button :label="'Cancel'" severity="secondary" text @click="emit('cancel')" />
      <Button :label="isEdit ? 'Save' : 'Create'" type="submit" />
    </div>
  </form>
</template>
```

- [ ] **Step 2: Run lint fix**

Run: `cd apps/engine-ui && npx eslint --fix app/components/WorkspaceForm.vue`

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/components/WorkspaceForm.vue
git commit -m "refactor: migrate WorkspaceForm to PrimeVue"
```

---

### Task 2: Migrate ChannelForm.vue

**Files:**
- Modify: `apps/engine-ui/app/components/producer/ChannelForm.vue`

- [ ] **Step 1: Replace template with PrimeVue components**

```vue
<script setup lang="ts">
import type { Channel } from 'engine-core'

const props = defineProps<{
  channel?: Channel | null
}>()

const emit = defineEmits<{
  submit: [data: { name: string; description: string }]
  cancel: []
}>()

const state = reactive({
  name: props.channel?.name ?? '',
  description: props.channel?.description ?? ''
})

const isEdit = computed(() => !!props.channel)

function handleSubmit() {
  if (!state.name.trim()) return
  emit('submit', { name: state.name.trim(), description: state.description.trim() })
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium">Name <span class="text-red-500">*</span></label>
      <InputText v-model="state.name" placeholder="e.g. Main Program" autofocus fluid />
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium">Description</label>
      <Textarea v-model="state.description" placeholder="Optional description" fluid />
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <Button label="Cancel" severity="secondary" text @click="emit('cancel')" />
      <Button :label="isEdit ? 'Save' : 'Create'" type="submit" />
    </div>
  </form>
</template>
```

- [ ] **Step 2: Run lint fix**

Run: `cd apps/engine-ui && npx eslint --fix app/components/producer/ChannelForm.vue`

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/components/producer/ChannelForm.vue
git commit -m "refactor: migrate ChannelForm to PrimeVue"
```

---

### Task 3: Migrate LayerForm.vue

**Files:**
- Modify: `apps/engine-ui/app/components/producer/LayerForm.vue`

- [ ] **Step 1: Replace template — includes USelect → Select**

```vue
<script setup lang="ts">
import type { Layer, LayerRegion } from 'engine-core'

const props = defineProps<{
  layer?: Layer | null
}>()

const emit = defineEmits<{
  submit: [data: { name: string; zIndex: number; region: LayerRegion | null }]
  cancel: []
}>()

const regionOptions = [
  { label: 'None', value: '' },
  { label: 'Full', value: 'full' },
  { label: 'Lower Band', value: 'band-lower' },
  { label: 'Upper Band', value: 'band-upper' },
  { label: 'Top Left', value: 'corner-tl' },
  { label: 'Top Right', value: 'corner-tr' },
  { label: 'Bottom Left', value: 'corner-bl' },
  { label: 'Bottom Right', value: 'corner-br' }
]

const state = reactive({
  name: props.layer?.name ?? '',
  zIndex: props.layer?.zIndex ?? 0,
  region: props.layer?.region ?? ''
})

const isEdit = computed(() => !!props.layer)

function handleSubmit() {
  if (!state.name.trim()) return
  emit('submit', {
    name: state.name.trim(),
    zIndex: Number(state.zIndex),
    region: (state.region || null) as LayerRegion | null
  })
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium">Name <span class="text-red-500">*</span></label>
      <InputText v-model="state.name" placeholder="e.g. Lower Thirds" autofocus fluid />
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium">Z-Index</label>
      <small class="text-surface-500">Higher values render on top</small>
      <InputNumber v-model="state.zIndex" fluid />
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium">Region</label>
      <Select v-model="state.region" :options="regionOptions" option-label="label" option-value="value" placeholder="Select region" fluid />
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <Button label="Cancel" severity="secondary" text @click="emit('cancel')" />
      <Button :label="isEdit ? 'Save' : 'Create'" type="submit" />
    </div>
  </form>
</template>
```

Note: Uses `InputNumber` instead of `InputText type="number"` for proper PrimeVue number handling.

- [ ] **Step 2: Run lint fix**

Run: `cd apps/engine-ui && npx eslint --fix app/components/producer/LayerForm.vue`

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/components/producer/LayerForm.vue
git commit -m "refactor: migrate LayerForm to PrimeVue"
```

---

### Task 4: Migrate ElementForm.vue

**Files:**
- Modify: `apps/engine-ui/app/components/producer/ElementForm.vue`

- [ ] **Step 1: Replace template with PrimeVue components**

```vue
<script setup lang="ts">
import type { Element, ModuleRecord, ModulePk, LayerId, JsonSchemaLike } from 'engine-core'

const props = defineProps<{
  element?: Element | null
  modules: ModuleRecord[]
  layerId: LayerId
}>()

const emit = defineEmits<{
  submit: [data: { name: string; moduleId: ModulePk; layerId: LayerId; sortOrder: number; config: unknown }]
  cancel: []
}>()

const isEdit = computed(() => !!props.element)

const state = reactive({
  name: props.element?.name ?? '',
  moduleId: props.element?.moduleId ?? (props.modules[0]?.id ?? 0),
  sortOrder: props.element?.sortOrder ?? 0,
  config: (props.element?.config ?? {}) as Record<string, unknown>
})

const selectedModule = computed(() =>
  props.modules.find((m) => m.id === state.moduleId)
)

const configSchema = computed<JsonSchemaLike>(() =>
  selectedModule.value?.configSchema ?? { type: 'object', properties: {} }
)

watch(() => state.moduleId, (newId, oldId) => {
  if (!isEdit.value && newId !== oldId) {
    const mod = props.modules.find((m) => m.id === newId)
    if (mod?.configSchema) {
      const defaults: Record<string, unknown> = {}
      const properties = (mod.configSchema.properties ?? {}) as Record<string, Record<string, unknown>>
      for (const [key, prop] of Object.entries(properties)) {
        if (prop.default !== undefined) {
          defaults[key] = prop.default
        }
      }
      state.config = defaults
    } else {
      state.config = {}
    }
  }
})

const moduleItems = computed(() =>
  props.modules.map((m) => ({ label: m.label, value: m.id }))
)

function handleSubmit() {
  if (!state.name.trim()) return
  emit('submit', {
    name: state.name.trim(),
    moduleId: state.moduleId,
    layerId: props.layerId,
    sortOrder: state.sortOrder,
    config: state.config
  })
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium">Name <span class="text-red-500">*</span></label>
      <InputText v-model="state.name" placeholder="e.g. Guest Lower Third" autofocus fluid />
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium">Module <span class="text-red-500">*</span></label>
      <Select v-model="state.moduleId" :options="moduleItems" option-label="label" option-value="value" :disabled="isEdit" fluid />
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium">Sort Order</label>
      <small class="text-surface-500">Position in the rundown</small>
      <InputNumber v-model="state.sortOrder" fluid />
    </div>

    <fieldset v-if="selectedModule" class="border border-surface-200 dark:border-surface-700 rounded-md p-3">
      <legend class="text-sm font-medium px-1">{{ selectedModule.label }} Configuration</legend>
      <ProducerConfigForm v-model="state.config" :schema="configSchema" />
    </fieldset>

    <div class="flex justify-end gap-2 pt-2">
      <Button label="Cancel" severity="secondary" text @click="emit('cancel')" />
      <Button :label="isEdit ? 'Save' : 'Create'" type="submit" />
    </div>
  </form>
</template>
```

- [ ] **Step 2: Run lint fix**

Run: `cd apps/engine-ui && npx eslint --fix app/components/producer/ElementForm.vue`

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/components/producer/ElementForm.vue
git commit -m "refactor: migrate ElementForm to PrimeVue"
```

---

### Task 5: Migrate ConfigForm.vue

**Files:**
- Modify: `apps/engine-ui/app/components/producer/ConfigForm.vue`

- [ ] **Step 1: Replace template — UFormField, USelect, UInput, UCheckbox**

```vue
<script setup lang="ts">
import type { JsonSchemaLike } from 'engine-core'

const props = defineProps<{
  schema: JsonSchemaLike
  modelValue: Record<string, unknown>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
}>()

type SchemaProperty = {
  key: string
  type: string
  title: string
  description?: string
  enumValues?: string[]
  default?: unknown
  properties?: Record<string, unknown>
  required?: boolean
}

const fields = computed<SchemaProperty[]>(() => {
  const properties = (props.schema.properties ?? {}) as Record<string, Record<string, unknown>>
  const required = ((props.schema.required ?? []) as string[])

  return Object.entries(properties).map(([key, prop]) => ({
    key,
    type: (prop.type as string) ?? 'string',
    title: (prop.title as string) ?? key,
    description: prop.description as string | undefined,
    enumValues: prop.enum as string[] | undefined,
    default: prop.default,
    properties: prop.properties as Record<string, unknown> | undefined,
    required: required.includes(key)
  }))
})

function getValue(key: string): unknown {
  return props.modelValue[key]
}

function setValue(key: string, value: unknown) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function getStringValue(key: string): string {
  return (getValue(key) as string) ?? ''
}

function getNumberValue(key: string): number {
  return (getValue(key) as number) ?? 0
}

function getBooleanValue(key: string): boolean {
  return (getValue(key) as boolean) ?? false
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-if="fields.length === 0" class="text-sm text-surface-400 py-2">
      This module has no configuration options.
    </div>

    <template v-for="field in fields" :key="field.key">
      <div v-if="field.type === 'string' && field.enumValues" class="flex flex-col gap-1">
        <label class="text-sm font-medium">
          {{ field.title }}
          <span v-if="field.required" class="text-red-500">*</span>
        </label>
        <small v-if="field.description" class="text-surface-500">{{ field.description }}</small>
        <Select
          :model-value="getStringValue(field.key)"
          :options="field.enumValues"
          fluid
          @update:model-value="setValue(field.key, $event)"
        />
      </div>

      <div v-else-if="field.type === 'string'" class="flex flex-col gap-1">
        <label class="text-sm font-medium">
          {{ field.title }}
          <span v-if="field.required" class="text-red-500">*</span>
        </label>
        <small v-if="field.description" class="text-surface-500">{{ field.description }}</small>
        <InputText
          :model-value="getStringValue(field.key)"
          fluid
          @update:model-value="setValue(field.key, $event)"
        />
      </div>

      <div v-else-if="field.type === 'number' || field.type === 'integer'" class="flex flex-col gap-1">
        <label class="text-sm font-medium">
          {{ field.title }}
          <span v-if="field.required" class="text-red-500">*</span>
        </label>
        <small v-if="field.description" class="text-surface-500">{{ field.description }}</small>
        <InputNumber
          :model-value="getNumberValue(field.key)"
          fluid
          @update:model-value="setValue(field.key, $event)"
        />
      </div>

      <div v-else-if="field.type === 'boolean'" class="flex items-center gap-2">
        <Checkbox
          :model-value="getBooleanValue(field.key)"
          :binary="true"
          :input-id="field.key"
          @update:model-value="setValue(field.key, $event)"
        />
        <label :for="field.key" class="text-sm font-medium">{{ field.title }}</label>
        <small v-if="field.description" class="text-surface-500">{{ field.description }}</small>
      </div>

      <div v-else class="flex flex-col gap-1">
        <label class="text-sm font-medium">{{ field.title }}</label>
        <small class="text-surface-500">Type '{{ field.type }}' — edit as JSON</small>
        <InputText
          :model-value="JSON.stringify(getValue(field.key) ?? '')"
          disabled
          fluid
        />
      </div>
    </template>
  </div>
</template>
```

- [ ] **Step 2: Run lint fix**

Run: `cd apps/engine-ui && npx eslint --fix app/components/producer/ConfigForm.vue`

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/components/producer/ConfigForm.vue
git commit -m "refactor: migrate ConfigForm to PrimeVue"
```

---

### Task 6: Migrate ChannelList.vue

**Files:**
- Modify: `apps/engine-ui/app/components/producer/ChannelList.vue`

- [ ] **Step 1: Replace template — UButton, UIcon, UModal → Button, Icon, Dialog**

```vue
<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { Channel, ChannelId } from 'engine-core'

const props = defineProps<{
  channels: Channel[]
  selectedId: ChannelId | null
  loading?: boolean
}>()

const emit = defineEmits<{
  select: [id: ChannelId]
  create: [data: { name: string; description: string }]
  update: [id: ChannelId, data: { name: string; description: string }]
  delete: [id: ChannelId]
}>()

const showCreateModal = ref(false)
const editingChannel = ref<Channel | null>(null)
const showDeleteConfirm = ref<ChannelId | null>(null)

function handleCreate(data: { name: string; description: string }) {
  emit('create', data)
  showCreateModal.value = false
}

function handleEdit(data: { name: string; description: string }) {
  if (editingChannel.value) {
    emit('update', editingChannel.value.id, data)
    editingChannel.value = null
  }
}

function confirmDelete(id: ChannelId) {
  emit('delete', id)
  showDeleteConfirm.value = null
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-3 py-2 border-b border-surface-200 dark:border-surface-700">
      <h3 class="text-sm font-semibold text-surface-500 uppercase tracking-wide">Channels</h3>
      <Button icon="pi pi-plus" size="small" text severity="secondary" aria-label="Add channel" @click="showCreateModal = true" />
    </div>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <Icon icon="lucide:loader-2" class="animate-spin text-surface-400" />
    </div>

    <div v-else-if="channels.length === 0" class="px-3 py-6 text-center text-sm text-surface-400">
      No channels yet. Create one to get started.
    </div>

    <div v-else class="flex-1 overflow-y-auto">
      <button
        v-for="channel in channels"
        :key="channel.id"
        class="w-full text-left px-3 py-2.5 border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors group"
        :class="{ 'bg-primary-50 dark:bg-primary-900/20': selectedId === channel.id }"
        @click="emit('select', channel.id)"
      >
        <div class="flex items-center justify-between">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium truncate">{{ channel.name }}</p>
            <p v-if="channel.description" class="text-xs text-surface-500 truncate mt-0.5">{{ channel.description }}</p>
          </div>
          <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <Button icon="pi pi-pencil" size="small" text severity="secondary" @click.stop="editingChannel = channel" />
            <Button icon="pi pi-trash" size="small" text severity="danger" @click.stop="showDeleteConfirm = channel.id" />
          </div>
        </div>
      </button>
    </div>

    <Dialog v-model:visible="showCreateModal" modal header="Create Channel" class="w-full max-w-md">
      <ProducerChannelForm @submit="handleCreate" @cancel="showCreateModal = false" />
    </Dialog>

    <Dialog :visible="!!editingChannel" modal header="Edit Channel" class="w-full max-w-md" @update:visible="(v: boolean) => { if (!v) editingChannel = null }">
      <ProducerChannelForm :channel="editingChannel" @submit="handleEdit" @cancel="editingChannel = null" />
    </Dialog>

    <Dialog :visible="showDeleteConfirm !== null" modal header="Delete Channel" class="w-full max-w-md" @update:visible="(v: boolean) => { if (!v) showDeleteConfirm = null }">
      <p class="text-sm text-surface-500 mb-4">Are you sure? This will also delete all layers and elements in this channel.</p>
      <div class="flex justify-end gap-2">
        <Button label="Cancel" severity="secondary" text @click="showDeleteConfirm = null" />
        <Button label="Delete" severity="danger" @click="confirmDelete(showDeleteConfirm!)" />
      </div>
    </Dialog>
  </div>
</template>
```

- [ ] **Step 2: Run lint fix**

Run: `cd apps/engine-ui && npx eslint --fix app/components/producer/ChannelList.vue`

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/components/producer/ChannelList.vue
git commit -m "refactor: migrate ChannelList to PrimeVue"
```

---

### Task 7: Migrate LayerList.vue

**Files:**
- Modify: `apps/engine-ui/app/components/producer/LayerList.vue`

- [ ] **Step 1: Replace template — adds Tag for z-index badge**

```vue
<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { Layer, LayerId, ChannelId } from 'engine-core'

const props = defineProps<{
  layers: Layer[]
  channelId: ChannelId
  selectedId: LayerId | null
  loading?: boolean
}>()

const emit = defineEmits<{
  select: [id: LayerId]
  create: [data: { name: string; zIndex: number; region: string | null }]
  update: [id: LayerId, data: { name: string; zIndex: number; region: string | null }]
  delete: [id: LayerId]
}>()

const showCreateModal = ref(false)
const editingLayer = ref<Layer | null>(null)
const showDeleteConfirm = ref<LayerId | null>(null)

function handleCreate(data: { name: string; zIndex: number; region: string | null }) {
  emit('create', data)
  showCreateModal.value = false
}

function handleEdit(data: { name: string; zIndex: number; region: string | null }) {
  if (editingLayer.value) {
    emit('update', editingLayer.value.id, data)
    editingLayer.value = null
  }
}

function confirmDelete(id: LayerId) {
  emit('delete', id)
  showDeleteConfirm.value = null
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-3 py-2 border-b border-surface-200 dark:border-surface-700">
      <h3 class="text-sm font-semibold text-surface-500 uppercase tracking-wide">Layers</h3>
      <Button icon="pi pi-plus" size="small" text severity="secondary" aria-label="Add layer" @click="showCreateModal = true" />
    </div>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <Icon icon="lucide:loader-2" class="animate-spin text-surface-400" />
    </div>

    <div v-else-if="layers.length === 0" class="px-3 py-6 text-center text-sm text-surface-400">
      No layers yet. Create one to add elements.
    </div>

    <div v-else class="flex-1 overflow-y-auto">
      <button
        v-for="layer in layers"
        :key="layer.id"
        class="w-full text-left px-3 py-2.5 border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors group"
        :class="{ 'bg-primary-50 dark:bg-primary-900/20': selectedId === layer.id }"
        @click="emit('select', layer.id)"
      >
        <div class="flex items-center justify-between">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium truncate">{{ layer.name }}</p>
              <Tag severity="secondary" class="text-xs">z{{ layer.zIndex }}</Tag>
            </div>
            <p v-if="layer.region" class="text-xs text-surface-500 mt-0.5">{{ layer.region }}</p>
          </div>
          <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <Button icon="pi pi-pencil" size="small" text severity="secondary" @click.stop="editingLayer = layer" />
            <Button icon="pi pi-trash" size="small" text severity="danger" @click.stop="showDeleteConfirm = layer.id" />
          </div>
        </div>
      </button>
    </div>

    <Dialog v-model:visible="showCreateModal" modal header="Create Layer" class="w-full max-w-md">
      <ProducerLayerForm @submit="handleCreate" @cancel="showCreateModal = false" />
    </Dialog>

    <Dialog :visible="!!editingLayer" modal header="Edit Layer" class="w-full max-w-md" @update:visible="(v: boolean) => { if (!v) editingLayer = null }">
      <ProducerLayerForm :layer="editingLayer" @submit="handleEdit" @cancel="editingLayer = null" />
    </Dialog>

    <Dialog :visible="showDeleteConfirm !== null" modal header="Delete Layer" class="w-full max-w-md" @update:visible="(v: boolean) => { if (!v) showDeleteConfirm = null }">
      <p class="text-sm text-surface-500 mb-4">Are you sure? This will also delete all elements on this layer.</p>
      <div class="flex justify-end gap-2">
        <Button label="Cancel" severity="secondary" text @click="showDeleteConfirm = null" />
        <Button label="Delete" severity="danger" @click="confirmDelete(showDeleteConfirm!)" />
      </div>
    </Dialog>
  </div>
</template>
```

- [ ] **Step 2: Run lint fix**

Run: `cd apps/engine-ui && npx eslint --fix app/components/producer/LayerList.vue`

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/components/producer/LayerList.vue
git commit -m "refactor: migrate LayerList to PrimeVue"
```

---

### Task 8: Migrate ElementList.vue

**Files:**
- Modify: `apps/engine-ui/app/components/producer/ElementList.vue`

- [ ] **Step 1: Replace template**

```vue
<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { Element, ElementId, ModuleRecord, LayerId } from 'engine-core'

const props = defineProps<{
  elements: Element[]
  modules: ModuleRecord[]
  layerId: LayerId
  loading?: boolean
}>()

const emit = defineEmits<{
  create: [data: { name: string; moduleId: number; layerId: number; sortOrder: number; config: unknown }]
  update: [id: ElementId, data: { name?: string; sortOrder?: number; config?: unknown }]
  delete: [id: ElementId]
  reorder: [elementIds: ElementId[]]
}>()

const showCreateModal = ref(false)
const editingElement = ref<Element | null>(null)
const showDeleteConfirm = ref<ElementId | null>(null)

function getModuleLabel(moduleId: number): string {
  return props.modules.find((m) => m.id === moduleId)?.label ?? 'Unknown'
}

function getModuleCategory(moduleId: number): string {
  return props.modules.find((m) => m.id === moduleId)?.category ?? ''
}

function handleCreate(data: { name: string; moduleId: number; layerId: number; sortOrder: number; config: unknown }) {
  emit('create', data)
  showCreateModal.value = false
}

function handleEdit(data: { name: string; moduleId: number; layerId: number; sortOrder: number; config: unknown }) {
  if (editingElement.value) {
    emit('update', editingElement.value.id, { name: data.name, sortOrder: data.sortOrder, config: data.config })
    editingElement.value = null
  }
}

function confirmDelete(id: ElementId) {
  emit('delete', id)
  showDeleteConfirm.value = null
}

function moveElement(index: number, direction: 'up' | 'down') {
  const ids = props.elements.map((e) => e.id)
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= ids.length) return
  ;[ids[index], ids[targetIndex]] = [ids[targetIndex], ids[index]]
  emit('reorder', ids)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-3 py-2 border-b border-surface-200 dark:border-surface-700">
      <h3 class="text-sm font-semibold text-surface-500 uppercase tracking-wide">Elements</h3>
      <Button icon="pi pi-plus" size="small" text severity="secondary" aria-label="Add element" @click="showCreateModal = true" />
    </div>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <Icon icon="lucide:loader-2" class="animate-spin text-surface-400" />
    </div>

    <div v-else-if="elements.length === 0" class="px-3 py-6 text-center text-sm text-surface-400">
      No elements yet. Create one to get started.
    </div>

    <div v-else class="flex-1 overflow-y-auto">
      <div
        v-for="(element, index) in elements"
        :key="element.id"
        class="px-3 py-2.5 border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors group"
      >
        <div class="flex items-center justify-between">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium truncate">{{ element.name }}</p>
              <Tag severity="secondary" class="text-xs">{{ getModuleLabel(element.moduleId) }}</Tag>
            </div>
            <p class="text-xs text-surface-500 mt-0.5">{{ getModuleCategory(element.moduleId) }} &middot; #{{ element.sortOrder }}</p>
          </div>
          <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <Button icon="pi pi-chevron-up" size="small" text severity="secondary" :disabled="index === 0" @click="moveElement(index, 'up')" />
            <Button icon="pi pi-chevron-down" size="small" text severity="secondary" :disabled="index === elements.length - 1" @click="moveElement(index, 'down')" />
            <Button icon="pi pi-pencil" size="small" text severity="secondary" @click="editingElement = element" />
            <Button icon="pi pi-trash" size="small" text severity="danger" @click="showDeleteConfirm = element.id" />
          </div>
        </div>
      </div>
    </div>

    <Dialog v-model:visible="showCreateModal" modal header="Create Element" class="w-full max-w-lg">
      <div class="max-h-[70vh] overflow-y-auto">
        <ProducerElementForm :modules="modules" :layer-id="layerId" @submit="handleCreate" @cancel="showCreateModal = false" />
      </div>
    </Dialog>

    <Dialog :visible="!!editingElement" modal header="Edit Element" class="w-full max-w-lg" @update:visible="(v: boolean) => { if (!v) editingElement = null }">
      <div class="max-h-[70vh] overflow-y-auto">
        <ProducerElementForm :element="editingElement" :modules="modules" :layer-id="layerId" @submit="handleEdit" @cancel="editingElement = null" />
      </div>
    </Dialog>

    <Dialog :visible="showDeleteConfirm !== null" modal header="Delete Element" class="w-full max-w-md" @update:visible="(v: boolean) => { if (!v) showDeleteConfirm = null }">
      <p class="text-sm text-surface-500 mb-4">Are you sure you want to delete this element?</p>
      <div class="flex justify-end gap-2">
        <Button label="Cancel" severity="secondary" text @click="showDeleteConfirm = null" />
        <Button label="Delete" severity="danger" @click="confirmDelete(showDeleteConfirm!)" />
      </div>
    </Dialog>
  </div>
</template>
```

- [ ] **Step 2: Run lint fix**

Run: `cd apps/engine-ui && npx eslint --fix app/components/producer/ElementList.vue`

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/components/producer/ElementList.vue
git commit -m "refactor: migrate ElementList to PrimeVue"
```

---

### Task 9: Migrate AssetUpload.vue

**Files:**
- Modify: `apps/engine-ui/app/components/producer/AssetUpload.vue`

- [ ] **Step 1: Replace UIcon with @iconify/vue Icon**

```vue
<script setup lang="ts">
import { Icon } from '@iconify/vue'

const emit = defineEmits<{
  upload: [file: File]
}>()

const dragOver = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const error = ref<string | null>(null)

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
const MAX_SIZE = 10 * 1024 * 1024

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `Invalid file type "${file.type}". Allowed: PNG, JPEG, GIF, WebP, SVG.`
  }
  if (file.size > MAX_SIZE) {
    return `File too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum: 10 MB.`
  }
  return null
}

function handleFiles(files: FileList | null) {
  error.value = null
  if (!files || files.length === 0) return
  for (let i = 0; i < files.length; i++) {
    const validationError = validateFile(files[i])
    if (validationError) {
      error.value = validationError
      return
    }
    emit('upload', files[i])
  }
}

function handleDrop(event: DragEvent) {
  dragOver.value = false
  handleFiles(event.dataTransfer?.files ?? null)
}

function openFilePicker() {
  fileInputRef.value?.click()
}

function handleInputChange(event: Event) {
  const target = event.target as HTMLInputElement
  handleFiles(target.files)
  target.value = ''
}
</script>

<template>
  <div>
    <div
      class="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors"
      :class="dragOver ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/10' : 'border-surface-300 dark:border-surface-600 hover:border-primary-300'"
      @drop.prevent="handleDrop"
      @dragover.prevent="dragOver = true"
      @dragleave="dragOver = false"
      @click="openFilePicker"
    >
      <Icon icon="lucide:upload-cloud" class="text-3xl text-surface-400 mb-2" />
      <p class="text-sm font-medium">Drop files here or click to browse</p>
      <p class="text-xs text-surface-500 mt-1">PNG, JPEG, GIF, WebP, SVG up to 10 MB</p>
    </div>

    <p v-if="error" class="text-sm text-red-500 mt-2">{{ error }}</p>

    <input
      ref="fileInputRef"
      type="file"
      accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
      multiple
      class="hidden"
      @change="handleInputChange"
    />
  </div>
</template>
```

- [ ] **Step 2: Run lint fix**

Run: `cd apps/engine-ui && npx eslint --fix app/components/producer/AssetUpload.vue`

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/components/producer/AssetUpload.vue
git commit -m "refactor: migrate AssetUpload to PrimeVue"
```

---

### Task 10: Migrate AssetGrid.vue

**Files:**
- Modify: `apps/engine-ui/app/components/producer/AssetGrid.vue`

- [ ] **Step 1: Replace template**

```vue
<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { Asset, AssetId, WorkspaceId } from 'engine-core'

const props = defineProps<{
  assets: Asset[]
  workspaceId: WorkspaceId
  selectedFolder: string | null
  loading?: boolean
}>()

const emit = defineEmits<{
  delete: [id: AssetId]
  viewUsage: [id: AssetId]
}>()

const viewMode = ref<'grid' | 'list'>('grid')
const showDeleteConfirm = ref<AssetId | null>(null)

const filteredAssets = computed(() => {
  if (!props.selectedFolder) return props.assets
  return props.assets.filter((a) => a.folderPath === props.selectedFolder)
})

function getAssetUrl(asset: Asset): string {
  return `/api/workspaces/${props.workspaceId}/assets/${asset.id}/file`
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImage(asset: Asset): boolean {
  return asset.mimeType.startsWith('image/')
}

function confirmDelete(id: AssetId) {
  emit('delete', id)
  showDeleteConfirm.value = null
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-3 py-2 border-b border-surface-200 dark:border-surface-700">
      <span class="text-sm text-surface-500">{{ filteredAssets.length }} asset{{ filteredAssets.length !== 1 ? 's' : '' }}</span>
      <div class="flex gap-1">
        <Button icon="pi pi-th-large" size="small" :text="viewMode !== 'grid'" :severity="viewMode === 'grid' ? undefined : 'secondary'" @click="viewMode = 'grid'" />
        <Button icon="pi pi-list" size="small" :text="viewMode !== 'list'" :severity="viewMode === 'list' ? undefined : 'secondary'" @click="viewMode = 'list'" />
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <Icon icon="lucide:loader-2" class="animate-spin text-surface-400" />
    </div>

    <div v-else-if="filteredAssets.length === 0" class="flex items-center justify-center py-8 text-sm text-surface-400">
      No assets{{ selectedFolder ? ' in this folder' : '' }}. Upload one to get started.
    </div>

    <div v-else-if="viewMode === 'grid'" class="flex-1 overflow-y-auto p-3">
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <div v-for="asset in filteredAssets" :key="asset.id" class="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden hover:border-primary-400 transition-colors group">
          <div class="aspect-square bg-surface-100 dark:bg-surface-800 flex items-center justify-center overflow-hidden">
            <img v-if="isImage(asset)" :src="getAssetUrl(asset)" :alt="asset.name" class="object-contain w-full h-full" loading="lazy">
            <Icon v-else icon="lucide:file" class="text-3xl text-surface-400" />
          </div>
          <div class="p-2">
            <p class="text-xs font-medium truncate" :title="asset.name">{{ asset.name }}</p>
            <div class="flex items-center justify-between mt-1">
              <span class="text-xs text-surface-500">{{ formatSize(asset.sizeBytes) }}</span>
              <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button icon="pi pi-link" size="small" text severity="secondary" @click="emit('viewUsage', asset.id)" />
                <Button icon="pi pi-trash" size="small" text severity="danger" @click="showDeleteConfirm = asset.id" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex-1 overflow-y-auto">
      <div v-for="asset in filteredAssets" :key="asset.id" class="flex items-center gap-3 px-3 py-2 border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors group">
        <div class="w-10 h-10 rounded bg-surface-100 dark:bg-surface-800 flex items-center justify-center overflow-hidden flex-shrink-0">
          <img v-if="isImage(asset)" :src="getAssetUrl(asset)" :alt="asset.name" class="object-contain w-full h-full" loading="lazy">
          <Icon v-else icon="lucide:file" class="text-surface-400" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">{{ asset.name }}</p>
          <p class="text-xs text-surface-500">
            {{ asset.mimeType }} &middot; {{ formatSize(asset.sizeBytes) }}
            <template v-if="asset.width && asset.height">&middot; {{ asset.width }}&times;{{ asset.height }}</template>
            <template v-if="asset.folderPath">&middot; {{ asset.folderPath }}</template>
          </p>
        </div>
        <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button icon="pi pi-link" size="small" text severity="secondary" @click="emit('viewUsage', asset.id)" />
          <Button icon="pi pi-trash" size="small" text severity="danger" @click="showDeleteConfirm = asset.id" />
        </div>
      </div>
    </div>

    <Dialog :visible="showDeleteConfirm !== null" modal header="Delete Asset" class="w-full max-w-md" @update:visible="(v: boolean) => { if (!v) showDeleteConfirm = null }">
      <p class="text-sm text-surface-500 mb-4">Are you sure? This will permanently delete the asset file.</p>
      <div class="flex justify-end gap-2">
        <Button label="Cancel" severity="secondary" text @click="showDeleteConfirm = null" />
        <Button label="Delete" severity="danger" @click="confirmDelete(showDeleteConfirm!)" />
      </div>
    </Dialog>
  </div>
</template>
```

- [ ] **Step 2: Run lint fix**

Run: `cd apps/engine-ui && npx eslint --fix app/components/producer/AssetGrid.vue`

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/components/producer/AssetGrid.vue
git commit -m "refactor: migrate AssetGrid to PrimeVue"
```

---

### Task 11: Migrate AssetUsageIndicator.vue

**Files:**
- Modify: `apps/engine-ui/app/components/producer/AssetUsageIndicator.vue`

- [ ] **Step 1: Replace template**

```vue
<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { Asset, Element } from 'engine-core'

const props = defineProps<{
  asset: Asset | null
  elements: Element[]
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const referencingElements = computed(() => {
  if (!props.asset) return []
  const assetId = props.asset.id
  return props.elements.filter((el) => {
    const configStr = JSON.stringify(el.config)
    return configStr.includes(`${assetId}`)
  })
})
</script>

<template>
  <Dialog :visible="open" modal header="Asset Usage" class="w-full max-w-md" @update:visible="emit('update:open', $event)">
    <p v-if="asset" class="text-sm text-surface-500 mb-4">
      References to <strong>{{ asset.name }}</strong> (ID: {{ asset.id }})
    </p>

    <div v-if="referencingElements.length === 0" class="text-sm text-surface-400 py-4 text-center">
      This asset is not referenced by any elements.
    </div>

    <div v-else class="space-y-2">
      <div v-for="el in referencingElements" :key="el.id" class="flex items-center gap-2 p-2 border border-surface-200 dark:border-surface-700 rounded">
        <Icon icon="lucide:box" class="text-surface-400 flex-shrink-0" />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium truncate">{{ el.name }}</p>
          <p class="text-xs text-surface-500">Element #{{ el.id }} &middot; Layer #{{ el.layerId }}</p>
        </div>
      </div>
    </div>

    <div class="flex justify-end mt-4">
      <Button label="Close" severity="secondary" text @click="emit('update:open', false)" />
    </div>
  </Dialog>
</template>
```

- [ ] **Step 2: Run lint fix**

Run: `cd apps/engine-ui && npx eslint --fix app/components/producer/AssetUsageIndicator.vue`

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/components/producer/AssetUsageIndicator.vue
git commit -m "refactor: migrate AssetUsageIndicator to PrimeVue"
```

---

### Task 12: Migrate operator/TopBar.vue

**Files:**
- Modify: `apps/engine-ui/app/components/operator/TopBar.vue`

- [ ] **Step 1: Replace template — USelect → Select, UBadge → Tag**

```vue
<script setup lang="ts">
import type { Workspace, Channel, ChannelState } from 'engine-core'
import type { WsConnectionStatus } from '~/composables/useEngineWs'

const props = defineProps<{
  workspaces: Workspace[]
  channels: Channel[]
  selectedWorkspaceId: number | null
  selectedChannelId: number | null
  wsStatus: WsConnectionStatus
  channelState: ChannelState | null
}>()

const emit = defineEmits<{
  'update:selectedWorkspaceId': [value: number]
  'update:selectedChannelId': [value: number]
}>()

const workspaceItems = computed(() =>
  props.workspaces.map(w => ({ label: w.name, value: String(w.id) }))
)

const channelItems = computed(() =>
  props.channels.map(c => ({ label: c.name, value: String(c.id) }))
)

const selectedWorkspaceValue = computed({
  get: () => props.selectedWorkspaceId !== null ? String(props.selectedWorkspaceId) : undefined,
  set: (val) => {
    if (val) emit('update:selectedWorkspaceId', Number(val))
  }
})

const selectedChannelValue = computed({
  get: () => props.selectedChannelId !== null ? String(props.selectedChannelId) : undefined,
  set: (val) => {
    if (val) emit('update:selectedChannelId', Number(val))
  }
})

const isOnAir = computed(() => {
  if (!props.channelState) return false
  return props.channelState.layers.some(layer =>
    layer.elements.some(el => el.visibility === 'visible' || el.visibility === 'entering')
  )
})

const wsStatusSeverity = computed(() => {
  switch (props.wsStatus) {
    case 'connected': return 'success'
    case 'connecting': return 'warn'
    case 'disconnected': return 'danger'
    default: return 'secondary'
  }
})

const wsStatusLabel = computed(() => {
  switch (props.wsStatus) {
    case 'connected': return 'Connected'
    case 'connecting': return 'Connecting...'
    case 'disconnected': return 'Disconnected'
    default: return 'Unknown'
  }
})
</script>

<template>
  <div class="flex items-center gap-4 px-4 py-2 border-b border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900">
    <div class="flex items-center gap-2">
      <label class="text-sm font-medium text-surface-500 whitespace-nowrap">Workspace</label>
      <Select
        v-model="selectedWorkspaceValue"
        :options="workspaceItems"
        option-label="label"
        option-value="value"
        placeholder="Select workspace"
        class="w-48"
      />
    </div>

    <div class="flex items-center gap-2">
      <label class="text-sm font-medium text-surface-500 whitespace-nowrap">Channel</label>
      <Select
        v-model="selectedChannelValue"
        :options="channelItems"
        option-label="label"
        option-value="value"
        :disabled="!selectedWorkspaceId"
        placeholder="Select channel"
        class="w-48"
      />
    </div>

    <div class="flex-1" />

    <Tag :severity="wsStatusSeverity" class="gap-1.5">
      <span
        class="size-2 rounded-full"
        :class="{
          'bg-green-500': wsStatus === 'connected',
          'bg-yellow-500 animate-pulse': wsStatus === 'connecting',
          'bg-red-500': wsStatus === 'disconnected'
        }"
      />
      {{ wsStatusLabel }}
    </Tag>

    <Tag
      v-if="isOnAir"
      severity="danger"
      class="uppercase font-bold tracking-wider animate-pulse"
    >
      On Air
    </Tag>
    <Tag
      v-else
      severity="secondary"
      class="uppercase font-bold tracking-wider"
    >
      Off Air
    </Tag>
  </div>
</template>
```

- [ ] **Step 2: Run lint fix**

Run: `cd apps/engine-ui && npx eslint --fix app/components/operator/TopBar.vue`

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/components/operator/TopBar.vue
git commit -m "refactor: migrate operator TopBar to PrimeVue"
```

---

### Task 13: Migrate operator/Rundown.vue

**Files:**
- Modify: `apps/engine-ui/app/components/operator/Rundown.vue`

- [ ] **Step 1: Replace UBadge with Tag**

```vue
<script setup lang="ts">
import type { Element, Layer, ChannelState, ElementVisibility } from 'engine-core'

const props = defineProps<{
  elements: Element[]
  layers: Layer[]
  channelState: ChannelState | null
  selectedElementId: number | null
}>()

const emit = defineEmits<{
  'update:selectedElementId': [value: number]
}>()

const layerMap = computed(() => {
  const map = new Map<number, Layer>()
  for (const layer of props.layers) map.set(layer.id, layer)
  return map
})

function getElementVisibility(elementId: number): ElementVisibility {
  if (!props.channelState) return 'hidden'
  for (const layer of props.channelState.layers) {
    for (const el of layer.elements) {
      if (el.elementId === elementId) return el.visibility
    }
  }
  return 'hidden'
}

function getStatusLabel(visibility: ElementVisibility): string {
  switch (visibility) {
    case 'visible': case 'entering': return 'On Air'
    case 'exiting': return 'Exiting'
    default: return 'Ready'
  }
}

function getStatusSeverity(visibility: ElementVisibility): 'success' | 'danger' | 'warn' | 'secondary' {
  switch (visibility) {
    case 'visible': case 'entering': return 'danger'
    case 'exiting': return 'warn'
    default: return 'secondary'
  }
}

const sortedElements = computed(() =>
  [...props.elements].sort((a, b) => a.sortOrder - b.sortOrder)
)
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="px-3 py-2 border-b border-surface-200 dark:border-surface-700">
      <h2 class="text-sm font-semibold text-surface-500 uppercase tracking-wide">Rundown</h2>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div v-if="sortedElements.length === 0" class="p-4 text-sm text-surface-400 text-center">
        No elements in this channel.
      </div>

      <button
        v-for="element in sortedElements"
        :key="element.id"
        class="w-full text-left px-3 py-2.5 border-b border-surface-100 dark:border-surface-800 transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/50 focus:outline-none"
        :class="{
          'bg-primary-50 dark:bg-primary-900/20 border-l-2 border-l-primary-500': selectedElementId === element.id,
          'border-l-2 border-l-transparent': selectedElementId !== element.id
        }"
        @click="emit('update:selectedElementId', element.id)"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium truncate">{{ element.name }}</p>
            <p class="text-xs text-surface-500 truncate">
              {{ layerMap.get(element.layerId)?.name ?? 'Unknown layer' }}
            </p>
          </div>
          <Tag
            :severity="getStatusSeverity(getElementVisibility(element.id))"
            class="text-xs"
          >
            {{ getStatusLabel(getElementVisibility(element.id)) }}
          </Tag>
        </div>
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Run lint fix**

Run: `cd apps/engine-ui && npx eslint --fix app/components/operator/Rundown.vue`

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/components/operator/Rundown.vue
git commit -m "refactor: migrate operator Rundown to PrimeVue"
```

---

### Task 14: Migrate operator/LayerDashboard.vue

**Files:**
- Modify: `apps/engine-ui/app/components/operator/LayerDashboard.vue`

- [ ] **Step 1: Replace template — UCard → Card, USelectMenu → Select, UBadge → Tag, UButton → Button**

```vue
<script setup lang="ts">
import type { Element, Layer, ChannelState, ElementVisibility } from 'engine-core'

const props = defineProps<{
  layers: Layer[]
  elements: Element[]
  channelState: ChannelState | null
  selectedElements: Record<number, number | null>
}>()

const emit = defineEmits<{
  'select-element': [layerId: number, elementId: number | null]
  'take': [layerId: number, elementId: number]
  'clear': [layerId: number, elementId: number]
}>()

const sortedLayers = computed(() =>
  [...props.layers].sort((a, b) => a.zIndex - b.zIndex)
)

function elementsForLayer(layerId: number): Element[] {
  return props.elements
    .filter(e => e.layerId === layerId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

function getElementVisibility(elementId: number): ElementVisibility {
  if (!props.channelState) return 'hidden'
  for (const layer of props.channelState.layers) {
    for (const el of layer.elements) {
      if (el.elementId === elementId) return el.visibility
    }
  }
  return 'hidden'
}

function liveElementForLayer(layerId: number): Element | null {
  for (const el of elementsForLayer(layerId)) {
    const vis = getElementVisibility(el.id)
    if (vis === 'visible' || vis === 'entering') return el
  }
  return null
}

function selectMenuItems(layerId: number) {
  return elementsForLayer(layerId).map(el => ({
    label: el.name,
    value: String(el.id)
  }))
}

function onSelectElement(layerId: number, value: string | undefined) {
  emit('select-element', layerId, value ? Number(value) : null)
}

function onTake(layerId: number) {
  const selectedId = props.selectedElements[layerId]
  if (selectedId) emit('take', layerId, selectedId)
}

function onClear(layerId: number) {
  const liveEl = liveElementForLayer(layerId)
  if (liveEl) emit('clear', layerId, liveEl.id)
}

function getSelectedValue(layerId: number): string | undefined {
  const id = props.selectedElements[layerId]
  return id != null ? String(id) : undefined
}

function layerHasLive(layerId: number): boolean {
  return liveElementForLayer(layerId) !== null
}

function layerHasSelection(layerId: number): boolean {
  return props.selectedElements[layerId] != null
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="px-3 py-2 border-b border-surface-200 dark:border-surface-700">
      <h2 class="text-sm font-semibold text-surface-500 uppercase tracking-wide">Layers</h2>
    </div>

    <div class="flex-1 overflow-y-auto p-3 space-y-3">
      <div v-if="sortedLayers.length === 0" class="text-sm text-surface-400 text-center py-8">
        No layers in this channel.
      </div>

      <Card
        v-for="layer in sortedLayers"
        :key="layer.id"
        :class="{ 'ring-2 ring-red-500/50': layerHasLive(layer.id) }"
      >
        <template #title>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold">{{ layer.name }}</span>
              <Tag severity="secondary" class="text-xs">z{{ layer.zIndex }}</Tag>
            </div>
            <div v-if="layerHasLive(layer.id)" class="flex items-center gap-1.5">
              <span class="size-2 rounded-full bg-red-500 animate-pulse" />
              <span class="text-xs font-medium text-red-600 dark:text-red-400">
                {{ liveElementForLayer(layer.id)?.name }}
              </span>
            </div>
            <span v-else class="text-xs text-surface-400">No element live</span>
          </div>
        </template>

        <template #content>
          <div class="flex items-center gap-3">
            <div class="flex-1">
              <Select
                :model-value="getSelectedValue(layer.id)"
                :options="selectMenuItems(layer.id)"
                option-label="label"
                option-value="value"
                placeholder="Select element..."
                fluid
                @update:model-value="(val: string) => onSelectElement(layer.id, val)"
              />
            </div>

            <Button
              label="TAKE"
              :disabled="!layerHasSelection(layer.id)"
              class="font-bold"
              @click="onTake(layer.id)"
            />

            <Button
              label="CLEAR"
              severity="danger"
              outlined
              :disabled="!layerHasLive(layer.id)"
              class="font-bold"
              @click="onClear(layer.id)"
            />
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Run lint fix**

Run: `cd apps/engine-ui && npx eslint --fix app/components/operator/LayerDashboard.vue`

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/components/operator/LayerDashboard.vue
git commit -m "refactor: migrate operator LayerDashboard to PrimeVue"
```

---

### Task 15: Migrate operator/ContextPanel.vue

**Files:**
- Modify: `apps/engine-ui/app/components/operator/ContextPanel.vue`

- [ ] **Step 1: Replace template**

```vue
<script setup lang="ts">
import type { Element, ChannelState, ElementVisibility } from 'engine-core'

const props = defineProps<{
  element: Element | null
  channelState: ChannelState | null
  workspaceId: number
}>()

const emit = defineEmits<{
  'update-element': [elementId: number, fields: { name?: string; config?: unknown }]
}>()

const editName = ref('')
const editConfig = ref<Record<string, unknown>>({})
const isDirty = ref(false)

watch(() => props.element, (el) => {
  if (el) {
    editName.value = el.name
    editConfig.value = typeof el.config === 'object' && el.config !== null
      ? { ...(el.config as Record<string, unknown>) }
      : {}
    isDirty.value = false
  } else {
    editName.value = ''
    editConfig.value = {}
    isDirty.value = false
  }
}, { immediate: true })

function markDirty() {
  isDirty.value = true
}

function getElementVisibility(): ElementVisibility {
  if (!props.element || !props.channelState) return 'hidden'
  for (const layer of props.channelState.layers) {
    for (const el of layer.elements) {
      if (el.elementId === props.element.id) return el.visibility
    }
  }
  return 'hidden'
}

const visibility = computed(() => getElementVisibility())

const stateLabel = computed(() => {
  switch (visibility.value) {
    case 'visible': return 'Live (On Air)'
    case 'entering': return 'Entering'
    case 'exiting': return 'Exiting'
    default: return 'Ready'
  }
})

const stateSeverity = computed(() => {
  switch (visibility.value) {
    case 'visible': case 'entering': return 'danger'
    case 'exiting': return 'warn'
    default: return 'success'
  }
})

const editableConfigFields = computed(() => {
  const fields: { key: string; label: string; multiline: boolean }[] = []
  for (const [key, value] of Object.entries(editConfig.value)) {
    if (typeof value === 'string') {
      const multiline = /text|body|description|content/i.test(key)
      const label = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]/g, ' ')
        .replace(/^\s/, '')
        .replace(/\b\w/g, c => c.toUpperCase())
      fields.push({ key, label, multiline })
    }
  }
  return fields
})

function onConfigFieldInput(key: string, value: string) {
  editConfig.value[key] = value
  markDirty()
}

function saveChanges() {
  if (!props.element || !isDirty.value) return

  const updates: { name?: string; config?: unknown } = {}

  if (editName.value !== props.element.name) {
    updates.name = editName.value
  }

  const originalConfig = typeof props.element.config === 'object' && props.element.config !== null
    ? props.element.config as Record<string, unknown>
    : {}
  const mergedConfig = { ...originalConfig }
  for (const field of editableConfigFields.value) {
    mergedConfig[field.key] = editConfig.value[field.key]
  }
  updates.config = mergedConfig

  emit('update-element', props.element.id, updates)
  isDirty.value = false
}

const previewUrl = computed(() => {
  if (!props.element) return ''
  return `/o/${props.workspaceId}/element/${props.element.id}`
})
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="px-3 py-2 border-b border-surface-200 dark:border-surface-700">
      <h2 class="text-sm font-semibold text-surface-500 uppercase tracking-wide">Context</h2>
    </div>

    <div v-if="!element" class="flex-1 flex items-center justify-center p-4">
      <p class="text-sm text-surface-400 text-center">
        Select an element from the rundown or a layer to see details.
      </p>
    </div>

    <div v-else class="flex-1 overflow-y-auto">
      <div class="px-3 py-2 border-b border-surface-100 dark:border-surface-800 flex items-center justify-between">
        <span class="text-sm font-medium">{{ element.name }}</span>
        <Tag :severity="stateSeverity">{{ stateLabel }}</Tag>
      </div>

      <div class="px-3 py-3 border-b border-surface-100 dark:border-surface-800">
        <p class="text-xs text-surface-500 mb-2">Preview</p>
        <div class="relative w-full bg-black rounded overflow-hidden" style="aspect-ratio: 16/9;">
          <iframe
            :src="previewUrl"
            class="absolute inset-0 w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>

      <div class="px-3 py-3 space-y-3">
        <p class="text-xs text-surface-500">Quick Edit</p>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">Name</label>
          <InputText
            v-model="editName"
            placeholder="Element name"
            fluid
            @update:model-value="markDirty"
          />
        </div>

        <div
          v-for="field in editableConfigFields"
          :key="field.key"
          class="flex flex-col gap-1"
        >
          <label class="text-sm font-medium">{{ field.label }}</label>
          <Textarea
            v-if="field.multiline"
            :model-value="String(editConfig[field.key] ?? '')"
            :placeholder="field.label"
            :rows="3"
            fluid
            @update:model-value="(val: string) => onConfigFieldInput(field.key, val)"
          />
          <InputText
            v-else
            :model-value="String(editConfig[field.key] ?? '')"
            :placeholder="field.label"
            fluid
            @update:model-value="(val: string) => onConfigFieldInput(field.key, val)"
          />
        </div>

        <Button
          label="Save Changes"
          :disabled="!isDirty"
          class="w-full"
          @click="saveChanges"
        />
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Run lint fix**

Run: `cd apps/engine-ui && npx eslint --fix app/components/operator/ContextPanel.vue`

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/components/operator/ContextPanel.vue
git commit -m "refactor: migrate operator ContextPanel to PrimeVue"
```

---

### Task 16: Migrate pages/app/index.vue

**Files:**
- Modify: `apps/engine-ui/app/pages/app/index.vue`

- [ ] **Step 1: Replace template — UButton, UIcon, UCard, UModal → PrimeVue equivalents, useToast → PrimeVue useToast**

```vue
<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { Workspace, WorkspaceId } from 'engine-core'

const api = useEngineApi()
const toast = useToast()

const workspaces = ref<Workspace[]>([])
const loading = ref(true)

const showCreateModal = ref(false)
const editingWorkspace = ref<Workspace | null>(null)
const showDeleteConfirm = ref<WorkspaceId | null>(null)

onMounted(async () => {
  try {
    workspaces.value = await api.listWorkspaces()
  } catch {
    toast.add({ summary: 'Failed to load workspaces', severity: 'error', life: 3000 })
  } finally {
    loading.value = false
  }
})

async function handleCreate(data: { name: string; description: string }) {
  try {
    const ws = await $fetch<Workspace>('/api/workspaces', {
      method: 'POST',
      body: data
    })
    workspaces.value.push(ws)
    showCreateModal.value = false
    toast.add({ summary: `Workspace "${ws.name}" created`, severity: 'success', life: 3000 })
  } catch {
    toast.add({ summary: 'Failed to create workspace', severity: 'error', life: 3000 })
  }
}

async function handleUpdate(data: { name: string; description: string }) {
  if (!editingWorkspace.value) return
  const id = editingWorkspace.value.id
  try {
    const updated = await $fetch<Workspace>(`/api/workspaces/${id}`, {
      method: 'PUT',
      body: data
    })
    const idx = workspaces.value.findIndex((w) => w.id === id)
    if (idx !== -1) workspaces.value[idx] = updated
    editingWorkspace.value = null
    toast.add({ summary: 'Workspace updated', severity: 'success', life: 3000 })
  } catch {
    toast.add({ summary: 'Failed to update workspace', severity: 'error', life: 3000 })
  }
}

async function confirmDelete(id: WorkspaceId) {
  try {
    await $fetch(`/api/workspaces/${id}`, { method: 'DELETE' })
    workspaces.value = workspaces.value.filter((w) => w.id !== id)
    showDeleteConfirm.value = null
    toast.add({ summary: 'Workspace deleted', severity: 'success', life: 3000 })
  } catch {
    toast.add({ summary: 'Failed to delete workspace', severity: 'error', life: 3000 })
  }
}
</script>

<template>
  <div>
    <AppHeader title="Workspaces" description="Select a workspace to open its Operator or Producer view.">
      <template #actions>
        <Button label="New Workspace" icon="pi pi-plus" @click="showCreateModal = true" />
      </template>
    </AppHeader>

    <div class="max-w-4xl mx-auto px-4 py-8">
      <div v-if="loading" class="flex items-center justify-center py-16">
        <Icon icon="lucide:loader-2" class="animate-spin text-surface-400 text-2xl" />
      </div>

      <div v-else-if="workspaces.length === 0" class="text-center py-16">
        <Icon icon="lucide:monitor" class="text-4xl text-surface-400 mb-3" />
        <p class="text-surface-500">No workspaces yet. Create one to get started.</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card v-for="ws in workspaces" :key="ws.id">
          <template #title>
            <div class="flex items-center justify-between">
              <h3 class="text-base font-semibold truncate">{{ ws.name }}</h3>
              <div class="flex gap-0.5">
                <Button icon="pi pi-pencil" size="small" text severity="secondary" aria-label="Edit workspace" @click="editingWorkspace = ws" />
                <Button icon="pi pi-trash" size="small" text severity="danger" aria-label="Delete workspace" @click="showDeleteConfirm = ws.id" />
              </div>
            </div>
          </template>

          <template #content>
            <p v-if="ws.description" class="text-sm text-surface-500 mb-3">{{ ws.description }}</p>
            <p v-else class="text-sm text-surface-400 italic mb-3">No description</p>

            <div class="text-xs text-surface-400 mb-4">
              {{ ws.displayConfig.baseWidth }}&times;{{ ws.displayConfig.baseHeight }}
              &middot; {{ ws.displayConfig.aspectRatio }}
            </div>

            <div class="flex gap-2">
              <NuxtLink :to="`/app/${ws.id}/operator`" class="flex-1">
                <Button label="Operator" icon="pi pi-play" class="w-full" size="small" />
              </NuxtLink>
              <NuxtLink :to="`/app/${ws.id}/producer`" class="flex-1">
                <Button label="Producer" icon="pi pi-cog" severity="secondary" outlined class="w-full" size="small" />
              </NuxtLink>
            </div>
          </template>
        </Card>
      </div>
    </div>

    <Dialog v-model:visible="showCreateModal" modal header="Create Workspace" class="w-full max-w-md">
      <WorkspaceForm @submit="handleCreate" @cancel="showCreateModal = false" />
    </Dialog>

    <Dialog :visible="!!editingWorkspace" modal header="Edit Workspace" class="w-full max-w-md" @update:visible="(v: boolean) => { if (!v) editingWorkspace = null }">
      <WorkspaceForm :workspace="editingWorkspace" @submit="handleUpdate" @cancel="editingWorkspace = null" />
    </Dialog>

    <Dialog :visible="showDeleteConfirm !== null" modal header="Delete Workspace" class="w-full max-w-md" @update:visible="(v: boolean) => { if (!v) showDeleteConfirm = null }">
      <p class="text-sm text-surface-500 mb-4">
        Are you sure? This will permanently delete the workspace and all its channels, layers, elements, and assets.
      </p>
      <div class="flex justify-end gap-2">
        <Button label="Cancel" severity="secondary" text @click="showDeleteConfirm = null" />
        <Button label="Delete" severity="danger" @click="confirmDelete(showDeleteConfirm!)" />
      </div>
    </Dialog>
  </div>
</template>
```

- [ ] **Step 2: Run lint fix**

Run: `cd apps/engine-ui && npx eslint --fix app/pages/app/index.vue`

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/pages/app/index.vue
git commit -m "refactor: migrate workspace dashboard page to PrimeVue"
```

---

### Task 17: Migrate pages/app/[workspaceId]/producer/index.vue

**Files:**
- Modify: `apps/engine-ui/app/pages/app/[workspaceId]/producer/index.vue`

- [ ] **Step 1: Replace UButton and useToast**

Only the `<script>` toast calls and the two `UButton` in the `#actions` slot need to change. The child components are already migrated.

Change all `toast.add({ title: ..., color: ... })` to `toast.add({ summary: ..., severity: ..., life: 3000 })`.

Replace `<UButton>` with `<Button>`:

```vue
<!-- In #actions slot, replace: -->
<Button label="Assets" icon="pi pi-image" severity="secondary" outlined />
<!-- and -->
<Button label="Operator" icon="pi pi-play" severity="secondary" outlined />
```

The full script change is a find-and-replace of:
- `{ title:` → `{ summary:`
- `color: 'error'` → `severity: 'error', life: 3000`
- `color: 'success'` → `severity: 'success', life: 3000`

- [ ] **Step 2: Run lint fix**

Run: `cd apps/engine-ui && npx eslint --fix app/pages/app/\\[workspaceId\\]/producer/index.vue`

- [ ] **Step 3: Commit**

```bash
git add "apps/engine-ui/app/pages/app/[workspaceId]/producer/index.vue"
git commit -m "refactor: migrate producer page to PrimeVue"
```

---

### Task 18: Migrate pages/app/[workspaceId]/producer/assets.vue

**Files:**
- Modify: `apps/engine-ui/app/pages/app/[workspaceId]/producer/assets.vue`

- [ ] **Step 1: Replace UButton, UIcon, useToast**

Same pattern as Task 17. Replace:
- `toast.add({ title: ..., color: ... })` → `toast.add({ summary: ..., severity: ..., life: 3000 })`
- `<UButton label="Structure" icon="i-lucide-layers" variant="outline" color="neutral" />` → `<Button label="Structure" icon="pi pi-objects-column" severity="secondary" outlined />`
- `<UIcon name="i-lucide-loader-2" class="animate-spin" />` → `<Icon icon="lucide:loader-2" class="animate-spin" />` (add `import { Icon } from '@iconify/vue'`)

- [ ] **Step 2: Run lint fix**

Run: `cd apps/engine-ui && npx eslint --fix app/pages/app/\\[workspaceId\\]/producer/assets.vue`

- [ ] **Step 3: Commit**

```bash
git add "apps/engine-ui/app/pages/app/[workspaceId]/producer/assets.vue"
git commit -m "refactor: migrate assets page to PrimeVue"
```

---

### Task 19: Migrate AppHeader.vue

**Files:**
- Modify: `apps/engine-ui/app/components/AppHeader.vue`

- [ ] **Step 1: Replace UHeader and USeparator with semantic HTML + Divider**

```vue
<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <header class="flex items-center gap-3 px-4 py-2 border-b border-surface-200 dark:border-surface-700">
    <NuxtLink to="/app" class="flex items-center gap-3">
      <AppLogo class="w-auto h-6 shrink-0" />
      <Divider layout="vertical" class="h-5 mx-0" />
      <span class="text-sm font-semibold">{{ title }}</span>
    </NuxtLink>

    <span v-if="description" class="text-sm text-surface-500 hidden md:inline">{{ description }}</span>

    <div class="flex-1" />

    <div class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
```

- [ ] **Step 2: Run lint fix**

Run: `cd apps/engine-ui && npx eslint --fix app/components/AppHeader.vue`

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/components/AppHeader.vue
git commit -m "refactor: migrate AppHeader to PrimeVue"
```

---

### Task 20: Migrate layouts/marketing.vue

**Files:**
- Modify: `apps/engine-ui/app/layouts/marketing.vue`

- [ ] **Step 1: Replace UHeader, UButton, UMain, USeparator, UFooter with semantic HTML**

```vue
<template>
  <div class="min-h-screen flex flex-col">
    <header class="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-700">
      <NuxtLink to="/">
        <AppLogo class="w-auto h-6 shrink-0" />
      </NuxtLink>

      <div class="flex items-center gap-2">
        <NuxtLink to="/app">
          <Button label="Launch App" icon="pi pi-arrow-right" icon-pos="right" severity="secondary" outlined />
        </NuxtLink>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <Divider />

    <footer class="px-4 py-4">
      <p class="text-sm text-surface-500">CeeGee &copy; {{ new Date().getFullYear() }}</p>
    </footer>
  </div>
</template>
```

- [ ] **Step 2: Run lint fix**

Run: `cd apps/engine-ui && npx eslint --fix app/layouts/marketing.vue`

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/layouts/marketing.vue
git commit -m "refactor: migrate marketing layout to PrimeVue"
```

---

### Task 21: Migrate pages/index.vue (landing page)

**Files:**
- Modify: `apps/engine-ui/app/pages/index.vue`

- [ ] **Step 1: Replace UPageHero with custom HTML**

```vue
<script setup>
definePageMeta({ layout: 'marketing' })
</script>

<template>
  <section class="flex flex-col items-center justify-center text-center py-24 px-4">
    <h1 class="text-5xl font-bold mb-4">CeeGee</h1>
    <p class="text-xl text-surface-500 max-w-2xl mb-8">
      A self-hosted, Node-based HTML graphics engine plus web control UI for broadcast-style overlays.
    </p>
    <div class="flex gap-4">
      <NuxtLink to="/app">
        <Button label="Launch App" icon="pi pi-arrow-right" icon-pos="right" size="large" />
      </NuxtLink>
      <a href="https://github.com/andrewmarconi/ceegee" target="_blank">
        <Button label="View on Github" icon="pi pi-github" severity="secondary" size="large" outlined />
      </a>
    </div>
  </section>
</template>
```

- [ ] **Step 2: Run lint fix**

Run: `cd apps/engine-ui && npx eslint --fix app/pages/index.vue`

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/pages/index.vue
git commit -m "refactor: migrate landing page to PrimeVue"
```

---

### Task 22: Clean up app.config.ts

**Files:**
- Modify: `apps/engine-ui/app/app.config.ts`

- [ ] **Step 1: Remove Nuxt UI color config**

```ts
export default defineAppConfig({})
```

- [ ] **Step 2: Commit**

```bash
git add apps/engine-ui/app/app.config.ts
git commit -m "chore: remove Nuxt UI color config from app.config"
```

---

### Task 23: Remove @nuxt/ui dependency and clean up

**Files:**
- Modify: `apps/engine-ui/package.json`
- Modify: `package.json` (root — remove Vue override if still present)

- [ ] **Step 1: Remove @nuxt/ui**

Run: `pnpm --filter engine-ui remove @nuxt/ui`

- [ ] **Step 2: Remove Vue override from root package.json if present**

Check and remove:
```bash
cat package.json
```

If `pnpm.overrides.vue` is present, remove it.

- [ ] **Step 3: Clean install**

Run: `rm -rf node_modules apps/*/node_modules && pnpm install`

- [ ] **Step 4: Verify the app starts**

Run: `cd apps/engine-ui && npx nuxi dev`

Open in browser and verify:
- Landing page renders
- Workspace dashboard loads
- Dark mode is forced
- No Nuxt UI or Reka UI errors in console

- [ ] **Step 5: Run lint across the project**

Run: `pnpm lint`

Fix any remaining issues.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove @nuxt/ui dependency, complete PrimeVue migration"
```
