# Producer UI + Asset Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Producer UI with full CRUD management for Channels, Layers, and Elements (including JSON Schema-driven config forms), plus an Asset library with upload, folder browsing, and usage indicators.

**Architecture:** Two page routes under `/app/:workspaceId/producer/` backed by existing Nitro API endpoints. The Structure view uses a master-detail drill-down pattern (Channels > Layers > Elements) with modal dialogs for create/edit. The ConfigForm component dynamically renders form fields from a module's `configSchema` JSON Schema. The Assets view provides a grid/list display with virtual folder filtering, drag-and-drop upload, and cross-referencing to Elements. A new `/api/modules` endpoint exposes registered modules for the UI to populate module selectors and retrieve config schemas.

**Tech Stack:** Nuxt 4 (app/ source root), Vue 3 `<script setup>`, @nuxt/ui v4 (UTable, UModal, UForm, UFormField, UInput, USelect, UButton, UCard, UBadge, UTabs), Tailwind CSS v4, engine-core types via workspace dependency

---

> **This is Plan 5 of 5.** Depends on Plans 1-2 (engine-core + API routes), Plan 3 (Overlay system + modules), Plan 4 (Operator UI / `useEngineApi` composable).
>
> **Reference docs:**
> - `docs/prd.md` sections 6, 6.1, 6.2 (Producer UI)
> - `docs/schema-typescript.md` -- all domain types
> - `docs/decisions.md` -- architecture decisions
> - `packages/engine-core/src/types.ts` -- implemented types
> - `packages/engine-core/src/index.ts` -- repository + engine exports

---

## File structure

All files created or modified by this plan:

```
apps/engine-ui/
├── server/api/
│   └── modules/
│       └── index.get.ts                              # CREATE: list registered modules
├── app/
│   ├── composables/
│   │   └── useProducerApi.ts                         # CREATE: Producer API composable
│   ├── pages/app/
│   │   └── [workspaceId]/
│   │       └── producer/
│   │           ├── index.vue                         # CREATE: Structure view
│   │           └── assets.vue                        # CREATE: Assets view
│   └── components/
│       └── producer/
│           ├── ChannelList.vue                       # CREATE: Channel CRUD list
│           ├── ChannelForm.vue                       # CREATE: Channel create/edit modal
│           ├── LayerList.vue                         # CREATE: Layer CRUD list
│           ├── LayerForm.vue                         # CREATE: Layer create/edit modal
│           ├── ElementList.vue                       # CREATE: Element CRUD list
│           ├── ElementForm.vue                       # CREATE: Element create/edit modal
│           ├── ConfigForm.vue                        # CREATE: JSON Schema-driven config form
│           ├── AssetGrid.vue                         # CREATE: Asset grid/list display
│           ├── AssetUpload.vue                       # CREATE: Asset upload component
│           └── AssetUsageIndicator.vue               # CREATE: Asset usage cross-reference
```

---

## Task 1: Modules API endpoint

The Producer UI needs to list available modules so users can assign them to Elements and retrieve their `configSchema` for form rendering. No modules endpoint exists yet.

**Files:**
- Create: `apps/engine-ui/server/api/modules/index.get.ts`

### Steps

- [ ] **Step 1: Create the modules list endpoint**

Create `apps/engine-ui/server/api/modules/index.get.ts`:

```ts
import { listModules } from 'engine-core';

export default defineEventHandler(() => {
  return listModules(useDb());
});
```

- [ ] **Step 2: Verify the endpoint**

Start the dev server and confirm `GET /api/modules` returns the list of registered modules (requires at least one module to be registered via Plan 3's auto-registration).

```bash
curl http://localhost:3000/api/modules | jq .
```

- [ ] **Step 3: Commit**

```
feat: add GET /api/modules endpoint for producer UI
```

---

## Task 2: Producer API composable

A composable that wraps all API calls needed by the Producer UI. If Plan 4's `useEngineApi` already exists and covers CRUD operations, this composable extends it with Producer-specific helpers (modules list, asset operations, element reordering). If `useEngineApi` is operator-focused (take/clear/state), this composable stands alone for CRUD.

**Files:**
- Create: `apps/engine-ui/app/composables/useProducerApi.ts`

### Steps

- [ ] **Step 1: Create the composable**

Create `apps/engine-ui/app/composables/useProducerApi.ts`:

```ts
import type {
  Channel,
  CreateChannelInput,
  UpdateChannelInput,
  Layer,
  CreateLayerInput,
  UpdateLayerInput,
  Element,
  CreateElementInput,
  UpdateElementInput,
  ModuleRecord,
  Asset,
  WorkspaceId,
  ChannelId,
  LayerId,
  ElementId,
  AssetId
} from 'engine-core';

export function useProducerApi(workspaceId: Ref<WorkspaceId>) {
  const basePath = computed(() => `/api/workspaces/${workspaceId.value}`);

  // -- Channels --

  function listChannels(): Promise<Channel[]> {
    return $fetch<Channel[]>(`${basePath.value}/channels`);
  }

  function createChannel(input: Omit<CreateChannelInput, 'workspaceId'>): Promise<Channel> {
    return $fetch<Channel>(`${basePath.value}/channels`, {
      method: 'POST',
      body: input
    });
  }

  function updateChannel(channelId: ChannelId, input: UpdateChannelInput): Promise<Channel> {
    return $fetch<Channel>(`${basePath.value}/channels/${channelId}`, {
      method: 'PUT',
      body: input
    });
  }

  function deleteChannel(channelId: ChannelId): Promise<void> {
    return $fetch(`${basePath.value}/channels/${channelId}`, {
      method: 'DELETE'
    });
  }

  // -- Layers --

  function listLayers(channelId: ChannelId): Promise<Layer[]> {
    return $fetch<Layer[]>(`${basePath.value}/channels/${channelId}/layers`);
  }

  function createLayer(channelId: ChannelId, input: Omit<CreateLayerInput, 'workspaceId' | 'channelId'>): Promise<Layer> {
    return $fetch<Layer>(`${basePath.value}/channels/${channelId}/layers`, {
      method: 'POST',
      body: input
    });
  }

  function updateLayer(channelId: ChannelId, layerId: LayerId, input: UpdateLayerInput): Promise<Layer> {
    return $fetch<Layer>(`${basePath.value}/channels/${channelId}/layers/${layerId}`, {
      method: 'PUT',
      body: input
    });
  }

  function deleteLayer(channelId: ChannelId, layerId: LayerId): Promise<void> {
    return $fetch(`${basePath.value}/channels/${channelId}/layers/${layerId}`, {
      method: 'DELETE'
    });
  }

  // -- Elements --

  function listElements(channelId: ChannelId, layerId: LayerId): Promise<Element[]> {
    // Elements are listed by channel; filter by layerId client-side
    // since the API lists by channel. Alternatively use layer-scoped listing.
    return $fetch<Element[]>(`${basePath.value}/channels/${channelId}/elements`).then(
      (elements) => elements.filter((e) => e.layerId === layerId)
    );
  }

  function listElementsByChannel(channelId: ChannelId): Promise<Element[]> {
    return $fetch<Element[]>(`${basePath.value}/channels/${channelId}/elements`);
  }

  function createElement(channelId: ChannelId, input: Omit<CreateElementInput, 'workspaceId' | 'channelId'>): Promise<Element> {
    return $fetch<Element>(`${basePath.value}/channels/${channelId}/elements`, {
      method: 'POST',
      body: input
    });
  }

  function updateElement(channelId: ChannelId, elementId: ElementId, input: UpdateElementInput): Promise<Element> {
    return $fetch<Element>(`${basePath.value}/channels/${channelId}/elements/${elementId}`, {
      method: 'PUT',
      body: input
    });
  }

  function deleteElement(channelId: ChannelId, elementId: ElementId): Promise<void> {
    return $fetch(`${basePath.value}/channels/${channelId}/elements/${elementId}`, {
      method: 'DELETE'
    });
  }

  async function reorderElements(channelId: ChannelId, elementIds: ElementId[]): Promise<void> {
    // Update sortOrder for each element sequentially
    for (let i = 0; i < elementIds.length; i++) {
      await updateElement(channelId, elementIds[i], { sortOrder: i });
    }
  }

  // -- Modules --

  function listModules(): Promise<ModuleRecord[]> {
    return $fetch<ModuleRecord[]>('/api/modules');
  }

  // -- Assets --

  function listAssets(): Promise<Asset[]> {
    return $fetch<Asset[]>(`${basePath.value}/assets`);
  }

  function uploadAsset(file: File): Promise<Asset> {
    const formData = new FormData();
    formData.append('file', file);
    return $fetch<Asset>(`${basePath.value}/assets`, {
      method: 'POST',
      body: formData
    });
  }

  function deleteAsset(assetId: AssetId): Promise<void> {
    return $fetch(`${basePath.value}/assets/${assetId}`, {
      method: 'DELETE'
    });
  }

  function getAssetFileUrl(assetId: AssetId): string {
    return `${basePath.value}/assets/${assetId}/file`;
  }

  return {
    listChannels,
    createChannel,
    updateChannel,
    deleteChannel,
    listLayers,
    createLayer,
    updateLayer,
    deleteLayer,
    listElements,
    listElementsByChannel,
    createElement,
    updateElement,
    deleteElement,
    reorderElements,
    listModules,
    listAssets,
    uploadAsset,
    deleteAsset,
    getAssetFileUrl
  };
}
```

- [ ] **Step 2: Verify** that the composable auto-imports correctly by checking that a component using `useProducerApi(ref(1))` compiles without errors.

- [ ] **Step 3: Commit**

```
feat: add useProducerApi composable for producer UI data access
```

---

## Task 3: ChannelList and ChannelForm components

The left-most column of the Structure view. Displays all channels in the workspace with create/edit/delete controls.

**Files:**
- Create: `apps/engine-ui/app/components/producer/ChannelForm.vue`
- Create: `apps/engine-ui/app/components/producer/ChannelList.vue`

### Steps

- [ ] **Step 1: Create ChannelForm (modal form for create/edit)**

Create `apps/engine-ui/app/components/producer/ChannelForm.vue`:

```vue
<script setup lang="ts">
import type { Channel } from 'engine-core';

const props = defineProps<{
  channel?: Channel | null;
}>();

const emit = defineEmits<{
  submit: [data: { name: string; description: string }];
  cancel: [];
}>();

const state = reactive({
  name: props.channel?.name ?? '',
  description: props.channel?.description ?? ''
});

const isEdit = computed(() => !!props.channel);

function handleSubmit() {
  if (!state.name.trim()) return;
  emit('submit', { name: state.name.trim(), description: state.description.trim() });
}
</script>

<template>
  <UForm :state="state" @submit="handleSubmit" class="flex flex-col gap-4">
    <UFormField label="Name" name="name" required>
      <UInput v-model="state.name" placeholder="e.g. Main Program" class="w-full" autofocus />
    </UFormField>

    <UFormField label="Description" name="description">
      <UTextarea v-model="state.description" placeholder="Optional description" class="w-full" />
    </UFormField>

    <div class="flex justify-end gap-2 pt-2">
      <UButton label="Cancel" color="neutral" variant="ghost" @click="emit('cancel')" />
      <UButton :label="isEdit ? 'Save' : 'Create'" type="submit" />
    </div>
  </UForm>
</template>
```

- [ ] **Step 2: Create ChannelList**

Create `apps/engine-ui/app/components/producer/ChannelList.vue`:

```vue
<script setup lang="ts">
import type { Channel, ChannelId } from 'engine-core';

const props = defineProps<{
  channels: Channel[];
  selectedId: ChannelId | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  select: [id: ChannelId];
  create: [data: { name: string; description: string }];
  update: [id: ChannelId, data: { name: string; description: string }];
  delete: [id: ChannelId];
}>();

const showCreateModal = ref(false);
const editingChannel = ref<Channel | null>(null);
const showDeleteConfirm = ref<ChannelId | null>(null);

function handleCreate(data: { name: string; description: string }) {
  emit('create', data);
  showCreateModal.value = false;
}

function handleEdit(data: { name: string; description: string }) {
  if (editingChannel.value) {
    emit('update', editingChannel.value.id, data);
    editingChannel.value = null;
  }
}

function confirmDelete(id: ChannelId) {
  emit('delete', id);
  showDeleteConfirm.value = null;
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-3 py-2 border-b border-accented">
      <h3 class="text-sm font-semibold text-highlighted">Channels</h3>
      <UButton
        icon="i-lucide-plus"
        size="xs"
        variant="ghost"
        color="neutral"
        aria-label="Add channel"
        @click="showCreateModal = true"
      />
    </div>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-muted" />
    </div>

    <div v-else-if="channels.length === 0" class="px-3 py-6 text-center text-sm text-muted">
      No channels yet. Create one to get started.
    </div>

    <div v-else class="flex-1 overflow-y-auto">
      <button
        v-for="channel in channels"
        :key="channel.id"
        class="w-full text-left px-3 py-2.5 border-b border-accented hover:bg-elevated transition-colors group"
        :class="{ 'bg-elevated': selectedId === channel.id }"
        @click="emit('select', channel.id)"
      >
        <div class="flex items-center justify-between">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-highlighted truncate">{{ channel.name }}</p>
            <p v-if="channel.description" class="text-xs text-muted truncate mt-0.5">
              {{ channel.description }}
            </p>
          </div>
          <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <UButton
              icon="i-lucide-pencil"
              size="xs"
              variant="ghost"
              color="neutral"
              aria-label="Edit channel"
              @click.stop="editingChannel = channel"
            />
            <UButton
              icon="i-lucide-trash-2"
              size="xs"
              variant="ghost"
              color="error"
              aria-label="Delete channel"
              @click.stop="showDeleteConfirm = channel.id"
            />
          </div>
        </div>
      </button>
    </div>

    <!-- Create Modal -->
    <UModal v-model:open="showCreateModal">
      <template #content>
        <div class="p-4">
          <h3 class="text-lg font-semibold text-highlighted mb-4">Create Channel</h3>
          <ProducerChannelForm @submit="handleCreate" @cancel="showCreateModal = false" />
        </div>
      </template>
    </UModal>

    <!-- Edit Modal -->
    <UModal v-model:open="editingChannel" :open="!!editingChannel" @update:open="(v: boolean) => { if (!v) editingChannel = null }">
      <template #content>
        <div class="p-4">
          <h3 class="text-lg font-semibold text-highlighted mb-4">Edit Channel</h3>
          <ProducerChannelForm
            :channel="editingChannel"
            @submit="handleEdit"
            @cancel="editingChannel = null"
          />
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal :open="showDeleteConfirm !== null" @update:open="(v: boolean) => { if (!v) showDeleteConfirm = null }">
      <template #content>
        <div class="p-4">
          <h3 class="text-lg font-semibold text-highlighted mb-2">Delete Channel</h3>
          <p class="text-sm text-muted mb-4">
            Are you sure? This will also delete all layers and elements in this channel.
          </p>
          <div class="flex justify-end gap-2">
            <UButton label="Cancel" color="neutral" variant="ghost" @click="showDeleteConfirm = null" />
            <UButton label="Delete" color="error" @click="confirmDelete(showDeleteConfirm!)" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
```

- [ ] **Step 3: Verify** that both components render correctly by temporarily mounting `ChannelList` in a test page with mock data.

- [ ] **Step 4: Commit**

```
feat: add ChannelList and ChannelForm producer components
```

---

## Task 4: LayerList and LayerForm components

The middle column of the Structure view. Displays layers for the selected channel, sorted by z-index, with create/edit/delete controls.

**Files:**
- Create: `apps/engine-ui/app/components/producer/LayerForm.vue`
- Create: `apps/engine-ui/app/components/producer/LayerList.vue`

### Steps

- [ ] **Step 1: Create LayerForm**

Create `apps/engine-ui/app/components/producer/LayerForm.vue`:

```vue
<script setup lang="ts">
import type { Layer, LayerRegion } from 'engine-core';

const props = defineProps<{
  layer?: Layer | null;
}>();

const emit = defineEmits<{
  submit: [data: { name: string; zIndex: number; region: LayerRegion | null }];
  cancel: [];
}>();

const regionOptions = [
  { label: 'None', value: '' },
  { label: 'Full', value: 'full' },
  { label: 'Lower Band', value: 'band-lower' },
  { label: 'Upper Band', value: 'band-upper' },
  { label: 'Top Left', value: 'corner-tl' },
  { label: 'Top Right', value: 'corner-tr' },
  { label: 'Bottom Left', value: 'corner-bl' },
  { label: 'Bottom Right', value: 'corner-br' }
];

const state = reactive({
  name: props.layer?.name ?? '',
  zIndex: props.layer?.zIndex ?? 0,
  region: props.layer?.region ?? ''
});

const isEdit = computed(() => !!props.layer);

function handleSubmit() {
  if (!state.name.trim()) return;
  emit('submit', {
    name: state.name.trim(),
    zIndex: Number(state.zIndex),
    region: state.region || null
  });
}
</script>

<template>
  <UForm :state="state" @submit="handleSubmit" class="flex flex-col gap-4">
    <UFormField label="Name" name="name" required>
      <UInput v-model="state.name" placeholder="e.g. Lower Thirds" class="w-full" autofocus />
    </UFormField>

    <UFormField label="Z-Index" name="zIndex" help="Higher values render on top">
      <UInput v-model.number="state.zIndex" type="number" class="w-full" />
    </UFormField>

    <UFormField label="Region" name="region">
      <USelect
        v-model="state.region"
        :items="regionOptions"
        value-key="value"
        class="w-full"
      />
    </UFormField>

    <div class="flex justify-end gap-2 pt-2">
      <UButton label="Cancel" color="neutral" variant="ghost" @click="emit('cancel')" />
      <UButton :label="isEdit ? 'Save' : 'Create'" type="submit" />
    </div>
  </UForm>
</template>
```

- [ ] **Step 2: Create LayerList**

Create `apps/engine-ui/app/components/producer/LayerList.vue`:

```vue
<script setup lang="ts">
import type { Layer, LayerId, ChannelId } from 'engine-core';

const props = defineProps<{
  layers: Layer[];
  channelId: ChannelId;
  selectedId: LayerId | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  select: [id: LayerId];
  create: [data: { name: string; zIndex: number; region: string | null }];
  update: [id: LayerId, data: { name: string; zIndex: number; region: string | null }];
  delete: [id: LayerId];
}>();

const showCreateModal = ref(false);
const editingLayer = ref<Layer | null>(null);
const showDeleteConfirm = ref<LayerId | null>(null);

function handleCreate(data: { name: string; zIndex: number; region: string | null }) {
  emit('create', data);
  showCreateModal.value = false;
}

function handleEdit(data: { name: string; zIndex: number; region: string | null }) {
  if (editingLayer.value) {
    emit('update', editingLayer.value.id, data);
    editingLayer.value = null;
  }
}

function confirmDelete(id: LayerId) {
  emit('delete', id);
  showDeleteConfirm.value = null;
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-3 py-2 border-b border-accented">
      <h3 class="text-sm font-semibold text-highlighted">Layers</h3>
      <UButton
        icon="i-lucide-plus"
        size="xs"
        variant="ghost"
        color="neutral"
        aria-label="Add layer"
        @click="showCreateModal = true"
      />
    </div>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-muted" />
    </div>

    <div v-else-if="layers.length === 0" class="px-3 py-6 text-center text-sm text-muted">
      No layers yet. Create one to add elements.
    </div>

    <div v-else class="flex-1 overflow-y-auto">
      <button
        v-for="layer in layers"
        :key="layer.id"
        class="w-full text-left px-3 py-2.5 border-b border-accented hover:bg-elevated transition-colors group"
        :class="{ 'bg-elevated': selectedId === layer.id }"
        @click="emit('select', layer.id)"
      >
        <div class="flex items-center justify-between">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium text-highlighted truncate">{{ layer.name }}</p>
              <UBadge variant="subtle" color="neutral" size="xs">z{{ layer.zIndex }}</UBadge>
            </div>
            <p v-if="layer.region" class="text-xs text-muted mt-0.5">{{ layer.region }}</p>
          </div>
          <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <UButton
              icon="i-lucide-pencil"
              size="xs"
              variant="ghost"
              color="neutral"
              aria-label="Edit layer"
              @click.stop="editingLayer = layer"
            />
            <UButton
              icon="i-lucide-trash-2"
              size="xs"
              variant="ghost"
              color="error"
              aria-label="Delete layer"
              @click.stop="showDeleteConfirm = layer.id"
            />
          </div>
        </div>
      </button>
    </div>

    <!-- Create Modal -->
    <UModal v-model:open="showCreateModal">
      <template #content>
        <div class="p-4">
          <h3 class="text-lg font-semibold text-highlighted mb-4">Create Layer</h3>
          <ProducerLayerForm @submit="handleCreate" @cancel="showCreateModal = false" />
        </div>
      </template>
    </UModal>

    <!-- Edit Modal -->
    <UModal :open="!!editingLayer" @update:open="(v: boolean) => { if (!v) editingLayer = null }">
      <template #content>
        <div class="p-4">
          <h3 class="text-lg font-semibold text-highlighted mb-4">Edit Layer</h3>
          <ProducerLayerForm
            :layer="editingLayer"
            @submit="handleEdit"
            @cancel="editingLayer = null"
          />
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal :open="showDeleteConfirm !== null" @update:open="(v: boolean) => { if (!v) showDeleteConfirm = null }">
      <template #content>
        <div class="p-4">
          <h3 class="text-lg font-semibold text-highlighted mb-2">Delete Layer</h3>
          <p class="text-sm text-muted mb-4">
            Are you sure? This will also delete all elements on this layer.
          </p>
          <div class="flex justify-end gap-2">
            <UButton label="Cancel" color="neutral" variant="ghost" @click="showDeleteConfirm = null" />
            <UButton label="Delete" color="error" @click="confirmDelete(showDeleteConfirm!)" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
```

- [ ] **Step 3: Verify** that LayerList renders with mock layer data and that the form opens/closes correctly.

- [ ] **Step 4: Commit**

```
feat: add LayerList and LayerForm producer components
```

---

## Task 5: ConfigForm component (JSON Schema-driven)

The key dynamic form component. Given a JSON Schema (from `ModuleManifest.configSchema`), renders appropriate form fields. MVP handles: `string` (text input), `number`/`integer` (number input), `boolean` (checkbox), `string` with `enum` (select), and `object` (nested fields). Ignores `array` and complex types for now.

**Files:**
- Create: `apps/engine-ui/app/components/producer/ConfigForm.vue`

### Steps

- [ ] **Step 1: Create ConfigForm**

Create `apps/engine-ui/app/components/producer/ConfigForm.vue`:

```vue
<script setup lang="ts">
import type { JsonSchemaLike } from 'engine-core';

const props = defineProps<{
  schema: JsonSchemaLike;
  modelValue: Record<string, unknown>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>];
}>();

// Compute the list of renderable properties from the JSON Schema
type SchemaProperty = {
  key: string;
  type: string;
  title: string;
  description?: string;
  enumValues?: string[];
  default?: unknown;
  properties?: Record<string, unknown>;
  required?: boolean;
};

const fields = computed<SchemaProperty[]>(() => {
  const properties = (props.schema.properties ?? {}) as Record<string, Record<string, unknown>>;
  const required = ((props.schema.required ?? []) as string[]);

  return Object.entries(properties).map(([key, prop]) => ({
    key,
    type: (prop.type as string) ?? 'string',
    title: (prop.title as string) ?? key,
    description: prop.description as string | undefined,
    enumValues: prop.enum as string[] | undefined,
    default: prop.default,
    properties: prop.properties as Record<string, unknown> | undefined,
    required: required.includes(key)
  }));
});

function getValue(key: string): unknown {
  return props.modelValue[key];
}

function setValue(key: string, value: unknown) {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
}

function getStringValue(key: string): string {
  return (getValue(key) as string) ?? '';
}

function getNumberValue(key: string): number {
  return (getValue(key) as number) ?? 0;
}

function getBooleanValue(key: string): boolean {
  return (getValue(key) as boolean) ?? false;
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-if="fields.length === 0" class="text-sm text-muted py-2">
      This module has no configuration options.
    </div>

    <template v-for="field in fields" :key="field.key">
      <!-- String with enum -> Select -->
      <UFormField
        v-if="field.type === 'string' && field.enumValues"
        :label="field.title"
        :name="field.key"
        :help="field.description"
        :required="field.required"
      >
        <USelect
          :model-value="getStringValue(field.key)"
          :items="field.enumValues"
          class="w-full"
          @update:model-value="setValue(field.key, $event)"
        />
      </UFormField>

      <!-- String -> Text Input -->
      <UFormField
        v-else-if="field.type === 'string'"
        :label="field.title"
        :name="field.key"
        :help="field.description"
        :required="field.required"
      >
        <UInput
          :model-value="getStringValue(field.key)"
          class="w-full"
          @update:model-value="setValue(field.key, $event)"
        />
      </UFormField>

      <!-- Number / Integer -> Number Input -->
      <UFormField
        v-else-if="field.type === 'number' || field.type === 'integer'"
        :label="field.title"
        :name="field.key"
        :help="field.description"
        :required="field.required"
      >
        <UInput
          type="number"
          :model-value="getNumberValue(field.key)"
          class="w-full"
          @update:model-value="setValue(field.key, Number($event))"
        />
      </UFormField>

      <!-- Boolean -> Checkbox -->
      <UFormField
        v-else-if="field.type === 'boolean'"
        :name="field.key"
        :help="field.description"
      >
        <UCheckbox
          :model-value="getBooleanValue(field.key)"
          :label="field.title"
          @update:model-value="setValue(field.key, $event)"
        />
      </UFormField>

      <!-- Object -> Nested ConfigForm (recursive) -->
      <fieldset
        v-else-if="field.type === 'object' && field.properties"
        class="border border-accented rounded-md p-3"
      >
        <legend class="text-sm font-medium text-highlighted px-1">{{ field.title }}</legend>
        <p v-if="field.description" class="text-xs text-muted mb-2">{{ field.description }}</p>
        <ProducerConfigForm
          :schema="{ type: 'object', properties: field.properties } as JsonSchemaLike"
          :model-value="(getValue(field.key) as Record<string, unknown>) ?? {}"
          @update:model-value="setValue(field.key, $event)"
        />
      </fieldset>

      <!-- Unsupported type fallback -->
      <UFormField
        v-else
        :label="field.title"
        :name="field.key"
        :help="`Type '${field.type}' is not yet supported in the config editor.`"
      >
        <UInput
          :model-value="JSON.stringify(getValue(field.key) ?? '')"
          class="w-full"
          disabled
        />
      </UFormField>
    </template>
  </div>
</template>
```

- [ ] **Step 2: Verify** with a test schema:

```ts
const testSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', title: 'Title' },
    subtitle: { type: 'string', title: 'Subtitle' },
    showLogo: { type: 'boolean', title: 'Show Logo' },
    duration: { type: 'number', title: 'Duration (seconds)' },
    position: { type: 'string', title: 'Position', enum: ['left', 'center', 'right'] }
  },
  required: ['title']
};
```

Confirm that the form renders text inputs, a checkbox, a number input, and a select.

- [ ] **Step 3: Commit**

```
feat: add ConfigForm component for JSON Schema-driven module config
```

---

## Task 6: ElementList and ElementForm components

The right-most column of the Structure view. Displays elements for the selected layer with module assignment, config editing, and reordering.

**Files:**
- Create: `apps/engine-ui/app/components/producer/ElementForm.vue`
- Create: `apps/engine-ui/app/components/producer/ElementList.vue`

### Steps

- [ ] **Step 1: Create ElementForm**

Create `apps/engine-ui/app/components/producer/ElementForm.vue`:

```vue
<script setup lang="ts">
import type { Element, ModuleRecord, ModulePk, LayerId, JsonSchemaLike } from 'engine-core';

const props = defineProps<{
  element?: Element | null;
  modules: ModuleRecord[];
  layerId: LayerId;
}>();

const emit = defineEmits<{
  submit: [data: { name: string; moduleId: ModulePk; layerId: LayerId; sortOrder: number; config: unknown }];
  cancel: [];
}>();

const isEdit = computed(() => !!props.element);

const state = reactive({
  name: props.element?.name ?? '',
  moduleId: props.element?.moduleId ?? (props.modules[0]?.id ?? 0),
  sortOrder: props.element?.sortOrder ?? 0,
  config: (props.element?.config ?? {}) as Record<string, unknown>
});

const selectedModule = computed(() =>
  props.modules.find((m) => m.id === state.moduleId)
);

const configSchema = computed<JsonSchemaLike>(() =>
  selectedModule.value?.configSchema ?? { type: 'object', properties: {} }
);

// When module changes in create mode, reset config to defaults from schema
watch(() => state.moduleId, (newId, oldId) => {
  if (!isEdit.value && newId !== oldId) {
    const mod = props.modules.find((m) => m.id === newId);
    if (mod?.configSchema) {
      const defaults: Record<string, unknown> = {};
      const properties = (mod.configSchema.properties ?? {}) as Record<string, Record<string, unknown>>;
      for (const [key, prop] of Object.entries(properties)) {
        if (prop.default !== undefined) {
          defaults[key] = prop.default;
        }
      }
      state.config = defaults;
    } else {
      state.config = {};
    }
  }
});

const moduleItems = computed(() =>
  props.modules.map((m) => ({
    label: m.label,
    value: m.id
  }))
);

function handleSubmit() {
  if (!state.name.trim()) return;
  emit('submit', {
    name: state.name.trim(),
    moduleId: state.moduleId,
    layerId: props.layerId,
    sortOrder: state.sortOrder,
    config: state.config
  });
}
</script>

<template>
  <UForm :state="state" @submit="handleSubmit" class="flex flex-col gap-4">
    <UFormField label="Name" name="name" required>
      <UInput v-model="state.name" placeholder="e.g. Guest Lower Third" class="w-full" autofocus />
    </UFormField>

    <UFormField label="Module" name="moduleId" required>
      <USelect
        v-model="state.moduleId"
        :items="moduleItems"
        value-key="value"
        class="w-full"
        :disabled="isEdit"
      />
    </UFormField>

    <UFormField label="Sort Order" name="sortOrder" help="Position in the rundown">
      <UInput v-model.number="state.sortOrder" type="number" class="w-full" />
    </UFormField>

    <!-- Dynamic config form driven by module's configSchema -->
    <fieldset v-if="selectedModule" class="border border-accented rounded-md p-3">
      <legend class="text-sm font-medium text-highlighted px-1">
        {{ selectedModule.label }} Configuration
      </legend>
      <ProducerConfigForm
        v-model="state.config"
        :schema="configSchema"
      />
    </fieldset>

    <div class="flex justify-end gap-2 pt-2">
      <UButton label="Cancel" color="neutral" variant="ghost" @click="emit('cancel')" />
      <UButton :label="isEdit ? 'Save' : 'Create'" type="submit" />
    </div>
  </UForm>
</template>
```

- [ ] **Step 2: Create ElementList**

Create `apps/engine-ui/app/components/producer/ElementList.vue`:

```vue
<script setup lang="ts">
import type { Element, ElementId, ModuleRecord, LayerId } from 'engine-core';

const props = defineProps<{
  elements: Element[];
  modules: ModuleRecord[];
  layerId: LayerId;
  loading?: boolean;
}>();

const emit = defineEmits<{
  create: [data: { name: string; moduleId: number; layerId: number; sortOrder: number; config: unknown }];
  update: [id: ElementId, data: { name?: string; sortOrder?: number; config?: unknown }];
  delete: [id: ElementId];
  reorder: [elementIds: ElementId[]];
}>();

const showCreateModal = ref(false);
const editingElement = ref<Element | null>(null);
const showDeleteConfirm = ref<ElementId | null>(null);

function getModuleLabel(moduleId: number): string {
  return props.modules.find((m) => m.id === moduleId)?.label ?? 'Unknown';
}

function getModuleCategory(moduleId: number): string {
  return props.modules.find((m) => m.id === moduleId)?.category ?? '';
}

function handleCreate(data: { name: string; moduleId: number; layerId: number; sortOrder: number; config: unknown }) {
  emit('create', data);
  showCreateModal.value = false;
}

function handleEdit(data: { name: string; moduleId: number; layerId: number; sortOrder: number; config: unknown }) {
  if (editingElement.value) {
    emit('update', editingElement.value.id, {
      name: data.name,
      sortOrder: data.sortOrder,
      config: data.config
    });
    editingElement.value = null;
  }
}

function confirmDelete(id: ElementId) {
  emit('delete', id);
  showDeleteConfirm.value = null;
}

// Simple reorder: move element up or down in the list
function moveElement(index: number, direction: 'up' | 'down') {
  const ids = props.elements.map((e) => e.id);
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= ids.length) return;
  [ids[index], ids[targetIndex]] = [ids[targetIndex], ids[index]];
  emit('reorder', ids);
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-3 py-2 border-b border-accented">
      <h3 class="text-sm font-semibold text-highlighted">Elements</h3>
      <UButton
        icon="i-lucide-plus"
        size="xs"
        variant="ghost"
        color="neutral"
        aria-label="Add element"
        @click="showCreateModal = true"
      />
    </div>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-muted" />
    </div>

    <div v-else-if="elements.length === 0" class="px-3 py-6 text-center text-sm text-muted">
      No elements yet. Create one to get started.
    </div>

    <div v-else class="flex-1 overflow-y-auto">
      <div
        v-for="(element, index) in elements"
        :key="element.id"
        class="px-3 py-2.5 border-b border-accented hover:bg-elevated transition-colors group"
      >
        <div class="flex items-center justify-between">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium text-highlighted truncate">{{ element.name }}</p>
              <UBadge variant="subtle" color="neutral" size="xs">
                {{ getModuleLabel(element.moduleId) }}
              </UBadge>
            </div>
            <p class="text-xs text-muted mt-0.5">
              {{ getModuleCategory(element.moduleId) }} &middot; #{{ element.sortOrder }}
            </p>
          </div>
          <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <UButton
              icon="i-lucide-chevron-up"
              size="xs"
              variant="ghost"
              color="neutral"
              aria-label="Move up"
              :disabled="index === 0"
              @click="moveElement(index, 'up')"
            />
            <UButton
              icon="i-lucide-chevron-down"
              size="xs"
              variant="ghost"
              color="neutral"
              aria-label="Move down"
              :disabled="index === elements.length - 1"
              @click="moveElement(index, 'down')"
            />
            <UButton
              icon="i-lucide-pencil"
              size="xs"
              variant="ghost"
              color="neutral"
              aria-label="Edit element"
              @click="editingElement = element"
            />
            <UButton
              icon="i-lucide-trash-2"
              size="xs"
              variant="ghost"
              color="error"
              aria-label="Delete element"
              @click="showDeleteConfirm = element.id"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <UModal v-model:open="showCreateModal">
      <template #content>
        <div class="p-4 max-h-[80vh] overflow-y-auto">
          <h3 class="text-lg font-semibold text-highlighted mb-4">Create Element</h3>
          <ProducerElementForm
            :modules="modules"
            :layer-id="layerId"
            @submit="handleCreate"
            @cancel="showCreateModal = false"
          />
        </div>
      </template>
    </UModal>

    <!-- Edit Modal -->
    <UModal :open="!!editingElement" @update:open="(v: boolean) => { if (!v) editingElement = null }">
      <template #content>
        <div class="p-4 max-h-[80vh] overflow-y-auto">
          <h3 class="text-lg font-semibold text-highlighted mb-4">Edit Element</h3>
          <ProducerElementForm
            :element="editingElement"
            :modules="modules"
            :layer-id="layerId"
            @submit="handleEdit"
            @cancel="editingElement = null"
          />
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal :open="showDeleteConfirm !== null" @update:open="(v: boolean) => { if (!v) showDeleteConfirm = null }">
      <template #content>
        <div class="p-4">
          <h3 class="text-lg font-semibold text-highlighted mb-2">Delete Element</h3>
          <p class="text-sm text-muted mb-4">Are you sure you want to delete this element?</p>
          <div class="flex justify-end gap-2">
            <UButton label="Cancel" color="neutral" variant="ghost" @click="showDeleteConfirm = null" />
            <UButton label="Delete" color="error" @click="confirmDelete(showDeleteConfirm!)" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
```

- [ ] **Step 3: Verify** that ElementList renders with mock data and that the ElementForm correctly displays the ConfigForm when a module is selected.

- [ ] **Step 4: Commit**

```
feat: add ElementList and ElementForm producer components with config editing
```

---

## Task 7: Producer Structure page

The main page at `/app/:workspaceId/producer` that composes ChannelList, LayerList, and ElementList into a three-column master-detail layout. Manages selection state and wires CRUD operations through `useProducerApi`.

**Files:**
- Create: `apps/engine-ui/app/pages/app/[workspaceId]/producer/index.vue`

### Steps

- [ ] **Step 1: Create the Structure page**

Create `apps/engine-ui/app/pages/app/[workspaceId]/producer/index.vue`:

```vue
<script setup lang="ts">
import type { Channel, Layer, Element, ModuleRecord, ChannelId, LayerId, ElementId } from 'engine-core';

const route = useRoute();
const workspaceId = computed(() => Number(route.params.workspaceId));
const api = useProducerApi(workspaceId);
const toast = useToast();

// -- Data --
const channels = ref<Channel[]>([]);
const layers = ref<Layer[]>([]);
const elements = ref<Element[]>([]);
const modules = ref<ModuleRecord[]>([]);

// -- Selection --
const selectedChannelId = ref<ChannelId | null>(null);
const selectedLayerId = ref<LayerId | null>(null);

// -- Loading states --
const loadingChannels = ref(true);
const loadingLayers = ref(false);
const loadingElements = ref(false);

// -- Initial load --
onMounted(async () => {
  try {
    const [channelList, moduleList] = await Promise.all([
      api.listChannels(),
      api.listModules()
    ]);
    channels.value = channelList;
    modules.value = moduleList;
  } catch (e) {
    toast.add({ title: 'Failed to load data', color: 'error' });
  } finally {
    loadingChannels.value = false;
  }
});

// -- Channel selection -> load layers --
async function selectChannel(id: ChannelId) {
  selectedChannelId.value = id;
  selectedLayerId.value = null;
  layers.value = [];
  elements.value = [];
  loadingLayers.value = true;
  try {
    layers.value = await api.listLayers(id);
  } catch (e) {
    toast.add({ title: 'Failed to load layers', color: 'error' });
  } finally {
    loadingLayers.value = false;
  }
}

// -- Layer selection -> load elements --
async function selectLayer(id: LayerId) {
  selectedLayerId.value = id;
  elements.value = [];
  loadingElements.value = true;
  try {
    elements.value = await api.listElements(selectedChannelId.value!, id);
  } catch (e) {
    toast.add({ title: 'Failed to load elements', color: 'error' });
  } finally {
    loadingElements.value = false;
  }
}

// -- Channel CRUD --
async function handleCreateChannel(data: { name: string; description: string }) {
  try {
    const channel = await api.createChannel(data);
    channels.value.push(channel);
    toast.add({ title: `Channel "${channel.name}" created`, color: 'success' });
  } catch (e) {
    toast.add({ title: 'Failed to create channel', color: 'error' });
  }
}

async function handleUpdateChannel(id: ChannelId, data: { name: string; description: string }) {
  try {
    const updated = await api.updateChannel(id, data);
    const idx = channels.value.findIndex((c) => c.id === id);
    if (idx !== -1) channels.value[idx] = updated;
    toast.add({ title: `Channel "${updated.name}" updated`, color: 'success' });
  } catch (e) {
    toast.add({ title: 'Failed to update channel', color: 'error' });
  }
}

async function handleDeleteChannel(id: ChannelId) {
  try {
    await api.deleteChannel(id);
    channels.value = channels.value.filter((c) => c.id !== id);
    if (selectedChannelId.value === id) {
      selectedChannelId.value = null;
      layers.value = [];
      elements.value = [];
    }
    toast.add({ title: 'Channel deleted', color: 'success' });
  } catch (e) {
    toast.add({ title: 'Failed to delete channel', color: 'error' });
  }
}

// -- Layer CRUD --
async function handleCreateLayer(data: { name: string; zIndex: number; region: string | null }) {
  if (!selectedChannelId.value) return;
  try {
    const layer = await api.createLayer(selectedChannelId.value, data);
    layers.value.push(layer);
    // Re-sort by zIndex
    layers.value.sort((a, b) => a.zIndex - b.zIndex);
    toast.add({ title: `Layer "${layer.name}" created`, color: 'success' });
  } catch (e) {
    toast.add({ title: 'Failed to create layer', color: 'error' });
  }
}

async function handleUpdateLayer(id: LayerId, data: { name: string; zIndex: number; region: string | null }) {
  if (!selectedChannelId.value) return;
  try {
    const updated = await api.updateLayer(selectedChannelId.value, id, data);
    const idx = layers.value.findIndex((l) => l.id === id);
    if (idx !== -1) layers.value[idx] = updated;
    layers.value.sort((a, b) => a.zIndex - b.zIndex);
    toast.add({ title: `Layer "${updated.name}" updated`, color: 'success' });
  } catch (e) {
    toast.add({ title: 'Failed to update layer', color: 'error' });
  }
}

async function handleDeleteLayer(id: LayerId) {
  if (!selectedChannelId.value) return;
  try {
    await api.deleteLayer(selectedChannelId.value, id);
    layers.value = layers.value.filter((l) => l.id !== id);
    if (selectedLayerId.value === id) {
      selectedLayerId.value = null;
      elements.value = [];
    }
    toast.add({ title: 'Layer deleted', color: 'success' });
  } catch (e) {
    toast.add({ title: 'Failed to delete layer', color: 'error' });
  }
}

// -- Element CRUD --
async function handleCreateElement(data: { name: string; moduleId: number; layerId: number; sortOrder: number; config: unknown }) {
  if (!selectedChannelId.value) return;
  try {
    const element = await api.createElement(selectedChannelId.value, data);
    elements.value.push(element);
    elements.value.sort((a, b) => a.sortOrder - b.sortOrder);
    toast.add({ title: `Element "${element.name}" created`, color: 'success' });
  } catch (e) {
    toast.add({ title: 'Failed to create element', color: 'error' });
  }
}

async function handleUpdateElement(id: ElementId, data: { name?: string; sortOrder?: number; config?: unknown }) {
  if (!selectedChannelId.value) return;
  try {
    const updated = await api.updateElement(selectedChannelId.value, id, data);
    const idx = elements.value.findIndex((e) => e.id === id);
    if (idx !== -1) elements.value[idx] = updated;
    elements.value.sort((a, b) => a.sortOrder - b.sortOrder);
    toast.add({ title: `Element "${updated.name}" updated`, color: 'success' });
  } catch (e) {
    toast.add({ title: 'Failed to update element', color: 'error' });
  }
}

async function handleDeleteElement(id: ElementId) {
  if (!selectedChannelId.value) return;
  try {
    await api.deleteElement(selectedChannelId.value, id);
    elements.value = elements.value.filter((e) => e.id !== id);
    toast.add({ title: 'Element deleted', color: 'success' });
  } catch (e) {
    toast.add({ title: 'Failed to delete element', color: 'error' });
  }
}

async function handleReorderElements(elementIds: ElementId[]) {
  if (!selectedChannelId.value) return;
  try {
    await api.reorderElements(selectedChannelId.value, elementIds);
    // Refresh elements to get updated sortOrder values
    elements.value = await api.listElements(selectedChannelId.value, selectedLayerId.value!);
  } catch (e) {
    toast.add({ title: 'Failed to reorder elements', color: 'error' });
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Page header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-accented">
      <div>
        <h1 class="text-lg font-semibold text-highlighted">Producer</h1>
        <p class="text-sm text-muted">Manage channels, layers, and elements</p>
      </div>
      <div class="flex gap-2">
        <NuxtLink :to="`/app/${workspaceId}/producer/assets`">
          <UButton label="Assets" icon="i-lucide-image" variant="outline" color="neutral" />
        </NuxtLink>
        <NuxtLink :to="`/app/${workspaceId}/operator`">
          <UButton label="Operator" icon="i-lucide-play" variant="outline" color="neutral" />
        </NuxtLink>
      </div>
    </div>

    <!-- Three-column layout -->
    <div class="flex flex-1 min-h-0">
      <!-- Channels column -->
      <div class="w-64 border-r border-accented flex-shrink-0 overflow-hidden">
        <ProducerChannelList
          :channels="channels"
          :selected-id="selectedChannelId"
          :loading="loadingChannels"
          @select="selectChannel"
          @create="handleCreateChannel"
          @update="handleUpdateChannel"
          @delete="handleDeleteChannel"
        />
      </div>

      <!-- Layers column -->
      <div class="w-72 border-r border-accented flex-shrink-0 overflow-hidden">
        <template v-if="selectedChannelId">
          <ProducerLayerList
            :layers="layers"
            :channel-id="selectedChannelId"
            :selected-id="selectedLayerId"
            :loading="loadingLayers"
            @select="selectLayer"
            @create="handleCreateLayer"
            @update="handleUpdateLayer"
            @delete="handleDeleteLayer"
          />
        </template>
        <div v-else class="flex items-center justify-center h-full text-sm text-muted">
          Select a channel to view layers
        </div>
      </div>

      <!-- Elements column -->
      <div class="flex-1 overflow-hidden">
        <template v-if="selectedLayerId">
          <ProducerElementList
            :elements="elements"
            :modules="modules"
            :layer-id="selectedLayerId"
            :loading="loadingElements"
            @create="handleCreateElement"
            @update="handleUpdateElement"
            @delete="handleDeleteElement"
            @reorder="handleReorderElements"
          />
        </template>
        <div v-else class="flex items-center justify-center h-full text-sm text-muted">
          <span v-if="selectedChannelId">Select a layer to view elements</span>
          <span v-else>Select a channel, then a layer to manage elements</span>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Verify** by navigating to `/app/1/producer` (assuming workspace 1 exists). Confirm:
  - Channels load and display
  - Selecting a channel loads its layers
  - Selecting a layer loads its elements
  - Create/edit/delete modals work for all three entity types
  - Element config forms render correctly based on the selected module's schema
  - Element reorder (up/down) works

- [ ] **Step 3: Commit**

```
feat: add Producer structure page with channel/layer/element management
```

---

## Task 8: AssetGrid component

Displays assets in a grid or list view with thumbnails, metadata, and folder filtering.

**Files:**
- Create: `apps/engine-ui/app/components/producer/AssetGrid.vue`

### Steps

- [ ] **Step 1: Create AssetGrid**

Create `apps/engine-ui/app/components/producer/AssetGrid.vue`:

```vue
<script setup lang="ts">
import type { Asset, AssetId, WorkspaceId } from 'engine-core';

const props = defineProps<{
  assets: Asset[];
  workspaceId: WorkspaceId;
  selectedFolder: string | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  delete: [id: AssetId];
  viewUsage: [id: AssetId];
}>();

const viewMode = ref<'grid' | 'list'>('grid');
const showDeleteConfirm = ref<AssetId | null>(null);

const filteredAssets = computed(() => {
  if (!props.selectedFolder) return props.assets;
  return props.assets.filter((a) => a.folderPath === props.selectedFolder);
});

function getAssetUrl(asset: Asset): string {
  return `/api/workspaces/${props.workspaceId}/assets/${asset.id}/file`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(asset: Asset): boolean {
  return asset.mimeType.startsWith('image/');
}

function confirmDelete(id: AssetId) {
  emit('delete', id);
  showDeleteConfirm.value = null;
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Toolbar -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-accented">
      <span class="text-sm text-muted">{{ filteredAssets.length }} asset{{ filteredAssets.length !== 1 ? 's' : '' }}</span>
      <div class="flex gap-1">
        <UButton
          icon="i-lucide-grid-2x2"
          size="xs"
          :variant="viewMode === 'grid' ? 'soft' : 'ghost'"
          color="neutral"
          aria-label="Grid view"
          @click="viewMode = 'grid'"
        />
        <UButton
          icon="i-lucide-list"
          size="xs"
          :variant="viewMode === 'list' ? 'soft' : 'ghost'"
          color="neutral"
          aria-label="List view"
          @click="viewMode = 'list'"
        />
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-muted" />
    </div>

    <div v-else-if="filteredAssets.length === 0" class="flex items-center justify-center py-8 text-sm text-muted">
      No assets{{ selectedFolder ? ' in this folder' : '' }}. Upload one to get started.
    </div>

    <!-- Grid View -->
    <div v-else-if="viewMode === 'grid'" class="flex-1 overflow-y-auto p-3">
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <div
          v-for="asset in filteredAssets"
          :key="asset.id"
          class="border border-accented rounded-lg overflow-hidden hover:border-primary transition-colors group"
        >
          <!-- Thumbnail -->
          <div class="aspect-square bg-elevated flex items-center justify-center overflow-hidden">
            <img
              v-if="isImage(asset)"
              :src="getAssetUrl(asset)"
              :alt="asset.name"
              class="object-contain w-full h-full"
              loading="lazy"
            />
            <UIcon v-else name="i-lucide-file" class="text-3xl text-muted" />
          </div>

          <!-- Info -->
          <div class="p-2">
            <p class="text-xs font-medium text-highlighted truncate" :title="asset.name">
              {{ asset.name }}
            </p>
            <div class="flex items-center justify-between mt-1">
              <span class="text-xs text-muted">{{ formatSize(asset.sizeBytes) }}</span>
              <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <UButton
                  icon="i-lucide-link"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  aria-label="View usage"
                  @click="emit('viewUsage', asset.id)"
                />
                <UButton
                  icon="i-lucide-trash-2"
                  size="xs"
                  variant="ghost"
                  color="error"
                  aria-label="Delete asset"
                  @click="showDeleteConfirm = asset.id"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- List View -->
    <div v-else class="flex-1 overflow-y-auto">
      <div
        v-for="asset in filteredAssets"
        :key="asset.id"
        class="flex items-center gap-3 px-3 py-2 border-b border-accented hover:bg-elevated transition-colors group"
      >
        <!-- Thumbnail -->
        <div class="w-10 h-10 rounded bg-elevated flex items-center justify-center overflow-hidden flex-shrink-0">
          <img
            v-if="isImage(asset)"
            :src="getAssetUrl(asset)"
            :alt="asset.name"
            class="object-contain w-full h-full"
            loading="lazy"
          />
          <UIcon v-else name="i-lucide-file" class="text-muted" />
        </div>

        <!-- Details -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-highlighted truncate">{{ asset.name }}</p>
          <p class="text-xs text-muted">
            {{ asset.mimeType }} &middot; {{ formatSize(asset.sizeBytes) }}
            <template v-if="asset.width && asset.height">
              &middot; {{ asset.width }}&times;{{ asset.height }}
            </template>
            <template v-if="asset.folderPath">
              &middot; {{ asset.folderPath }}
            </template>
          </p>
        </div>

        <!-- Actions -->
        <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <UButton
            icon="i-lucide-link"
            size="xs"
            variant="ghost"
            color="neutral"
            aria-label="View usage"
            @click="emit('viewUsage', asset.id)"
          />
          <UButton
            icon="i-lucide-trash-2"
            size="xs"
            variant="ghost"
            color="error"
            aria-label="Delete asset"
            @click="showDeleteConfirm = asset.id"
          />
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <UModal :open="showDeleteConfirm !== null" @update:open="(v: boolean) => { if (!v) showDeleteConfirm = null }">
      <template #content>
        <div class="p-4">
          <h3 class="text-lg font-semibold text-highlighted mb-2">Delete Asset</h3>
          <p class="text-sm text-muted mb-4">
            Are you sure? This will permanently delete the asset file.
          </p>
          <div class="flex justify-end gap-2">
            <UButton label="Cancel" color="neutral" variant="ghost" @click="showDeleteConfirm = null" />
            <UButton label="Delete" color="error" @click="confirmDelete(showDeleteConfirm!)" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
```

- [ ] **Step 2: Verify** that the grid renders correctly with mock asset data in both grid and list view modes.

- [ ] **Step 3: Commit**

```
feat: add AssetGrid component with grid/list views and folder filtering
```

---

## Task 9: AssetUpload component

Provides the upload UI with file type validation (images/SVG only for MVP), size display, and upload progress feedback.

**Files:**
- Create: `apps/engine-ui/app/components/producer/AssetUpload.vue`

### Steps

- [ ] **Step 1: Create AssetUpload**

Create `apps/engine-ui/app/components/producer/AssetUpload.vue`:

```vue
<script setup lang="ts">
const emit = defineEmits<{
  upload: [file: File];
}>();

const dragOver = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const error = ref<string | null>(null);

const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml'
];

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `Invalid file type "${file.type}". Allowed: PNG, JPEG, GIF, WebP, SVG.`;
  }
  if (file.size > MAX_SIZE) {
    return `File too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum: 10 MB.`;
  }
  return null;
}

function handleFiles(files: FileList | null) {
  error.value = null;
  if (!files || files.length === 0) return;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const validationError = validateFile(file);
    if (validationError) {
      error.value = validationError;
      return;
    }
    emit('upload', file);
  }
}

function handleDrop(event: DragEvent) {
  dragOver.value = false;
  handleFiles(event.dataTransfer?.files ?? null);
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  dragOver.value = true;
}

function handleDragLeave() {
  dragOver.value = false;
}

function openFilePicker() {
  fileInputRef.value?.click();
}

function handleInputChange(event: Event) {
  const target = event.target as HTMLInputElement;
  handleFiles(target.files);
  // Reset input so the same file can be selected again
  target.value = '';
}
</script>

<template>
  <div>
    <div
      class="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors"
      :class="dragOver ? 'border-primary bg-primary/5' : 'border-accented hover:border-primary/50'"
      @drop.prevent="handleDrop"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @click="openFilePicker"
    >
      <UIcon name="i-lucide-upload-cloud" class="text-3xl text-muted mb-2" />
      <p class="text-sm text-highlighted font-medium">
        Drop files here or click to browse
      </p>
      <p class="text-xs text-muted mt-1">
        PNG, JPEG, GIF, WebP, SVG up to 10 MB
      </p>
    </div>

    <p v-if="error" class="text-sm text-error mt-2">{{ error }}</p>

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

- [ ] **Step 2: Verify** that the upload component renders, accepts drag-and-drop, and validates file types correctly.

- [ ] **Step 3: Commit**

```
feat: add AssetUpload component with drag-and-drop and validation
```

---

## Task 10: AssetUsageIndicator component

Shows which Elements reference a given asset. Scans element configs for the asset ID. Displayed in a modal when the user clicks the usage icon on an asset.

**Files:**
- Create: `apps/engine-ui/app/components/producer/AssetUsageIndicator.vue`

### Steps

- [ ] **Step 1: Create AssetUsageIndicator**

Create `apps/engine-ui/app/components/producer/AssetUsageIndicator.vue`:

```vue
<script setup lang="ts">
import type { Asset, Element, AssetId, WorkspaceId } from 'engine-core';

const props = defineProps<{
  asset: Asset | null;
  elements: Element[];
  open: boolean;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

// Find elements whose config JSON contains a reference to this asset's ID.
// This is a simple heuristic: stringify the config and search for the asset ID.
const referencingElements = computed(() => {
  if (!props.asset) return [];
  const assetId = props.asset.id;
  return props.elements.filter((el) => {
    const configStr = JSON.stringify(el.config);
    // Search for the asset ID as a number value in the config
    return configStr.includes(`${assetId}`) || configStr.includes(`"${assetId}"`);
  });
});
</script>

<template>
  <UModal :open="open" @update:open="emit('update:open', $event)">
    <template #content>
      <div class="p-4">
        <h3 class="text-lg font-semibold text-highlighted mb-1">Asset Usage</h3>
        <p v-if="asset" class="text-sm text-muted mb-4">
          References to <strong>{{ asset.name }}</strong> (ID: {{ asset.id }})
        </p>

        <div v-if="referencingElements.length === 0" class="text-sm text-muted py-4 text-center">
          This asset is not referenced by any elements.
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="el in referencingElements"
            :key="el.id"
            class="flex items-center gap-2 p-2 border border-accented rounded"
          >
            <UIcon name="i-lucide-box" class="text-muted flex-shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-highlighted truncate">{{ el.name }}</p>
              <p class="text-xs text-muted">
                Element #{{ el.id }} &middot; Layer #{{ el.layerId }} &middot; Channel #{{ el.channelId }}
              </p>
            </div>
          </div>
        </div>

        <div class="flex justify-end mt-4">
          <UButton label="Close" color="neutral" variant="ghost" @click="emit('update:open', false)" />
        </div>
      </div>
    </template>
  </UModal>
</template>
```

- [ ] **Step 2: Verify** that the modal displays correctly with elements that reference the given asset ID in their config.

- [ ] **Step 3: Commit**

```
feat: add AssetUsageIndicator component showing element references
```

---

## Task 11: Producer Assets page

The page at `/app/:workspaceId/producer/assets` that composes AssetGrid, AssetUpload, and AssetUsageIndicator with a folder sidebar.

**Files:**
- Create: `apps/engine-ui/app/pages/app/[workspaceId]/producer/assets.vue`

### Steps

- [ ] **Step 1: Create the Assets page**

Create `apps/engine-ui/app/pages/app/[workspaceId]/producer/assets.vue`:

```vue
<script setup lang="ts">
import type { Asset, Element, AssetId } from 'engine-core';

const route = useRoute();
const workspaceId = computed(() => Number(route.params.workspaceId));
const api = useProducerApi(workspaceId);
const toast = useToast();

// -- Data --
const assets = ref<Asset[]>([]);
const allElements = ref<Element[]>([]);
const loading = ref(true);
const uploading = ref(false);

// -- Folder navigation --
const selectedFolder = ref<string | null>(null);

const folders = computed(() => {
  const folderSet = new Set<string>();
  for (const asset of assets.value) {
    if (asset.folderPath) {
      folderSet.add(asset.folderPath);
    }
  }
  return Array.from(folderSet).sort();
});

// -- Usage indicator --
const usageAsset = ref<Asset | null>(null);
const showUsageModal = ref(false);

// -- Initial load --
onMounted(async () => {
  try {
    const [assetList, channelList] = await Promise.all([
      api.listAssets(),
      api.listChannels()
    ]);
    assets.value = assetList;

    // Load all elements across all channels for usage scanning
    const elementPromises = channelList.map((ch) => api.listElementsByChannel(ch.id));
    const elementLists = await Promise.all(elementPromises);
    allElements.value = elementLists.flat();
  } catch (e) {
    toast.add({ title: 'Failed to load assets', color: 'error' });
  } finally {
    loading.value = false;
  }
});

// -- Upload --
async function handleUpload(file: File) {
  uploading.value = true;
  try {
    const asset = await api.uploadAsset(file);
    assets.value.push(asset);
    toast.add({ title: `"${asset.name}" uploaded`, color: 'success' });
  } catch (e) {
    toast.add({ title: 'Upload failed', color: 'error' });
  } finally {
    uploading.value = false;
  }
}

// -- Delete --
async function handleDelete(id: AssetId) {
  try {
    await api.deleteAsset(id);
    assets.value = assets.value.filter((a) => a.id !== id);
    toast.add({ title: 'Asset deleted', color: 'success' });
  } catch (e) {
    toast.add({ title: 'Failed to delete asset', color: 'error' });
  }
}

// -- Usage --
function handleViewUsage(id: AssetId) {
  usageAsset.value = assets.value.find((a) => a.id === id) ?? null;
  showUsageModal.value = true;
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Page header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-accented">
      <div>
        <h1 class="text-lg font-semibold text-highlighted">Assets</h1>
        <p class="text-sm text-muted">Manage workspace images, logos, and graphics</p>
      </div>
      <div class="flex gap-2">
        <NuxtLink :to="`/app/${workspaceId}/producer`">
          <UButton label="Structure" icon="i-lucide-layers" variant="outline" color="neutral" />
        </NuxtLink>
      </div>
    </div>

    <div class="flex flex-1 min-h-0">
      <!-- Folder sidebar -->
      <div class="w-48 border-r border-accented flex-shrink-0 overflow-y-auto">
        <div class="px-3 py-2 border-b border-accented">
          <h3 class="text-xs font-semibold text-muted uppercase tracking-wide">Folders</h3>
        </div>

        <button
          class="w-full text-left px-3 py-2 text-sm hover:bg-elevated transition-colors"
          :class="{ 'bg-elevated font-medium text-highlighted': selectedFolder === null }"
          @click="selectedFolder = null"
        >
          All Assets
        </button>

        <button
          v-for="folder in folders"
          :key="folder"
          class="w-full text-left px-3 py-2 text-sm hover:bg-elevated transition-colors truncate"
          :class="{ 'bg-elevated font-medium text-highlighted': selectedFolder === folder }"
          :title="folder"
          @click="selectedFolder = folder"
        >
          <UIcon name="i-lucide-folder" class="mr-1.5 text-muted" />
          {{ folder }}
        </button>

        <div v-if="folders.length === 0" class="px-3 py-4 text-xs text-muted text-center">
          No folders yet
        </div>
      </div>

      <!-- Main content -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <!-- Upload area -->
        <div class="px-4 py-3 border-b border-accented">
          <ProducerAssetUpload @upload="handleUpload" />
          <div v-if="uploading" class="flex items-center gap-2 mt-2 text-sm text-muted">
            <UIcon name="i-lucide-loader-2" class="animate-spin" />
            Uploading...
          </div>
        </div>

        <!-- Asset grid -->
        <div class="flex-1 overflow-hidden">
          <ProducerAssetGrid
            :assets="assets"
            :workspace-id="workspaceId"
            :selected-folder="selectedFolder"
            :loading="loading"
            @delete="handleDelete"
            @view-usage="handleViewUsage"
          />
        </div>
      </div>
    </div>

    <!-- Usage indicator modal -->
    <ProducerAssetUsageIndicator
      v-model:open="showUsageModal"
      :asset="usageAsset"
      :elements="allElements"
    />
  </div>
</template>
```

- [ ] **Step 2: Verify** by navigating to `/app/1/producer/assets`. Confirm:
  - Assets load and display in both grid and list views
  - Folder sidebar filters assets correctly
  - Upload works with drag-and-drop and file picker
  - Invalid file types are rejected with clear error messages
  - Delete works with confirmation
  - Usage indicator shows referencing elements

- [ ] **Step 3: Commit**

```
feat: add Producer assets page with upload, folders, and usage indicators
```

---

## Task 12: Integration testing and polish

Final pass to ensure all Producer UI pieces work together end-to-end.

**Files:**
- No new files (verification and fixes only)

### Steps

- [ ] **Step 1: End-to-end walkthrough**

Run the dev server and perform the following manual test flow:

1. Navigate to `/app/1/producer` (create workspace 1 via API if needed)
2. Create a channel via the UI
3. Select the channel, create a layer
4. Select the layer, create an element (pick a module, fill in the config form)
5. Edit the element's config
6. Reorder elements (up/down)
7. Navigate to `/app/1/producer/assets`
8. Upload an image via drag-and-drop
9. Upload an image via file picker
10. Try uploading an invalid file type (e.g. `.txt`) -- should be rejected
11. Switch between grid and list views
12. Click the usage icon on an asset
13. Delete an asset

- [ ] **Step 2: Fix any issues** found during the walkthrough. Common issues to watch for:
  - Modal state not resetting after close
  - Stale data after CRUD operations (need to re-fetch or update local state)
  - Type errors from engine-core import paths
  - Missing auto-imports (Nuxt auto-import should pick up composables and components under `app/`)

- [ ] **Step 3: Verify** that the Nuxt typecheck passes:

```bash
cd apps/engine-ui && pnpm typecheck
```

- [ ] **Step 4: Commit**

```
fix: polish producer UI integration and fix issues from e2e testing
```

---

## Summary

| Task | Description | Files | Est. Size |
|------|-------------|-------|-----------|
| 1 | Modules API endpoint | 1 new | Tiny |
| 2 | useProducerApi composable | 1 new | Medium |
| 3 | ChannelList + ChannelForm | 2 new | Medium |
| 4 | LayerList + LayerForm | 2 new | Medium |
| 5 | ConfigForm (JSON Schema) | 1 new | Medium |
| 6 | ElementList + ElementForm | 2 new | Large |
| 7 | Producer Structure page | 1 new | Large |
| 8 | AssetGrid | 1 new | Medium |
| 9 | AssetUpload | 1 new | Small |
| 10 | AssetUsageIndicator | 1 new | Small |
| 11 | Producer Assets page | 1 new | Large |
| 12 | Integration testing | 0 new | Medium |

**Total: 14 new files, 0 modified files, 12 tasks, ~12 commits.**

Tasks 1-2 must be done first (API + composable). Tasks 3-6 can be done in parallel (components). Task 7 depends on 3-6. Tasks 8-10 can be done in parallel (asset components). Task 11 depends on 8-10. Task 12 is final.

```
Task 1 ─────┐
Task 2 ─────┤
             ├── Task 3 ──┐
             ├── Task 4 ──┤
             ├── Task 5 ──┼── Task 7 ──┐
             ├── Task 6 ──┘            │
             ├── Task 8 ──┐            │
             ├── Task 9 ──┼── Task 11 ─┼── Task 12
             └── Task 10 ─┘            │
                                       │
```
