# Workspace Theme Tokens Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tabbed workspace form with a theme token editor that auto-generates controls from module manifest declarations.

**Architecture:** Module manifests declare their CSS custom properties with metadata (key, label, type, default, options). The engine-core schema stores these on the modules table. The WorkspaceForm becomes a tabbed UI (General / Global Styles / Module Styles) that reads module token defs and renders appropriate form controls, writing values into the workspace's `themeTokens` record.

**Tech Stack:** TypeScript, Drizzle ORM (SQLite), Vue 3, PrimeVue (TabView, InputText, InputNumber, Select, Fieldset), Nuxt 4, Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `packages/engine-core/src/types.ts` | Modify | Add `ThemeTokenDef` type, add `themeTokens` to `ModuleManifest`, `ModuleRecord`, `UpsertModuleInput` |
| `packages/engine-core/src/db/schema.ts` | Modify | Add `themeTokensJson` column to modules table |
| `packages/engine-core/src/index.ts` | Modify | Serialize/deserialize `themeTokens` in module CRUD functions |
| `packages/engine-core/tests/modules.test.ts` | Modify | Test `themeTokens` round-trip through upsert/read |
| `packages/modules/src/billboard/basic/manifest.ts` | Modify | Add `themeTokens` array |
| `packages/modules/src/bug/basic/manifest.ts` | Modify | Add `themeTokens` array |
| `apps/engine-ui/server/plugins/register-modules.ts` | Modify | Pass `themeTokens` in upsert call |
| `apps/engine-ui/app/components/WorkspaceForm.vue` | Modify | Tabbed form with Global Styles and Module Styles editors |
| `apps/engine-ui/app/pages/app/index.vue` | Modify | Fetch modules, pass to form, include `themeTokens` in API calls |

---

### Task 1: Add `ThemeTokenDef` type and update module types

**Files:**
- Modify: `packages/engine-core/src/types.ts:100-168`

- [ ] **Step 1: Add `ThemeTokenDef` type**

In `packages/engine-core/src/types.ts`, after the `ModuleAnimationHooks` type (line 114), add:

```ts
export type ThemeTokenDef = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'dropdown';
  default: string;
  options?: string[];
};
```

- [ ] **Step 2: Add `themeTokens` to `ModuleRecord`**

In the `ModuleRecord` type, after `capabilities: ModuleCapabilities;` (line 139), add:

```ts
  themeTokens: ThemeTokenDef[];
```

- [ ] **Step 3: Add `themeTokens` to `UpsertModuleInput`**

In the `UpsertModuleInput` type, after `capabilities?: ModuleCapabilities;` (line 153), add:

```ts
  themeTokens?: ThemeTokenDef[];
```

- [ ] **Step 4: Add `themeTokens` to `ModuleManifest`**

In the `ModuleManifest` type, after `capabilities?: ModuleCapabilities;` (line 167), add:

```ts
  themeTokens?: ThemeTokenDef[];
```

- [ ] **Step 5: Verify types compile**

Run: `cd packages/engine-core && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add packages/engine-core/src/types.ts
git commit -m "feat: add ThemeTokenDef type to engine-core module types"
```

---

### Task 2: Add `themeTokensJson` column to modules DB schema

**Files:**
- Modify: `packages/engine-core/src/db/schema.ts:63-78`

- [ ] **Step 1: Add column to modules table**

In `packages/engine-core/src/db/schema.ts`, in the `modules` table definition, after `capabilitiesJson` (line 74), add:

```ts
  themeTokensJson: text('theme_tokens_json').notNull().default('[]'),
```

- [ ] **Step 2: Commit**

```bash
git add packages/engine-core/src/db/schema.ts
git commit -m "feat: add themeTokensJson column to modules table"
```

---

### Task 3: Wire `themeTokens` through module CRUD

**Files:**
- Modify: `packages/engine-core/src/index.ts:262-311`

- [ ] **Step 1: Update `moduleRowToDomain` to parse `themeTokens`**

In `packages/engine-core/src/index.ts`, in the `moduleRowToDomain` function (line 262), add after the `capabilities` line:

```ts
    themeTokens: JSON.parse(row.themeTokensJson),
```

- [ ] **Step 2: Update upsert — existing module update**

In the `upsertModule` function, in the `db.update(modules).set({...})` block (line 284), add after `capabilitiesJson`:

```ts
      themeTokensJson: JSON.stringify(input.themeTokens ?? []),
```

- [ ] **Step 3: Update upsert — new module insert**

In the `db.insert(modules).values({...})` block (line 298), add after `capabilitiesJson`:

```ts
    themeTokensJson: JSON.stringify(input.themeTokens ?? []),
```

- [ ] **Step 4: Commit**

```bash
git add packages/engine-core/src/index.ts
git commit -m "feat: serialize/deserialize themeTokens in module CRUD"
```

---

### Task 4: Test `themeTokens` round-trip

**Files:**
- Modify: `packages/engine-core/tests/modules.test.ts`

- [ ] **Step 1: Add `themeTokens` to the sample module**

In `packages/engine-core/tests/modules.test.ts`, update the `sampleModule` constant to include `themeTokens`:

```ts
const sampleModule: UpsertModuleInput = {
  moduleKey: 'lower-third.basic',
  label: 'Basic Lower Third',
  version: '1.0.0',
  category: 'lower-third',
  configSchema: { type: 'object', properties: { alignment: { type: 'string' } } },
  dataSchema: { type: 'object', properties: { primaryText: { type: 'string' } } },
  actions: [{ id: 'show', label: 'Show' }, { id: 'hide', label: 'Hide' }],
  animationHooks: { enter: 'slideUp', exit: 'slideDown' },
  capabilities: { supportsLayerRegions: true },
  themeTokens: [
    { key: '--lt-primary-color', label: 'Primary Color', type: 'text', default: '#ffffff' },
    { key: '--lt-size', label: 'Size', type: 'dropdown', default: 'medium', options: ['small', 'medium', 'large'] },
  ],
};
```

Also add the import for `ThemeTokenDef`:

```ts
import {
  upsertModule,
  getModuleByKey,
  listModules,
  type UpsertModuleInput,
  type ThemeTokenDef,
} from '../src/index';
```

- [ ] **Step 2: Add test for themeTokens round-trip**

Add after the existing tests, inside the `describe` block:

```ts
  it('persists and retrieves themeTokens', () => {
    const mod = upsertModule(db, sampleModule);
    expect(mod.themeTokens).toHaveLength(2);
    expect(mod.themeTokens[0]).toEqual({
      key: '--lt-primary-color',
      label: 'Primary Color',
      type: 'text',
      default: '#ffffff',
    });
    expect(mod.themeTokens[1]).toEqual({
      key: '--lt-size',
      label: 'Size',
      type: 'dropdown',
      default: 'medium',
      options: ['small', 'medium', 'large'],
    });
  });

  it('defaults themeTokens to empty array when not provided', () => {
    const { themeTokens: _, ...inputWithout } = sampleModule;
    const mod = upsertModule(db, inputWithout as UpsertModuleInput);
    expect(mod.themeTokens).toEqual([]);
  });
```

- [ ] **Step 3: Run tests to verify**

Run: `cd packages/engine-core && pnpm test`
Expected: All tests pass, including the two new ones.

- [ ] **Step 4: Commit**

```bash
git add packages/engine-core/tests/modules.test.ts
git commit -m "test: add themeTokens round-trip tests for module CRUD"
```

---

### Task 5: Add `themeTokens` to billboard and bug manifests

**Files:**
- Modify: `packages/modules/src/billboard/basic/manifest.ts`
- Modify: `packages/modules/src/bug/basic/manifest.ts`

- [ ] **Step 1: Add themeTokens to billboard manifest**

In `packages/modules/src/billboard/basic/manifest.ts`, add after the `capabilities` property:

```ts
  themeTokens: [
    { key: '--bb-headline-size', label: 'Headline Size', type: 'text', default: '2rem' },
    { key: '--bb-headline-color', label: 'Headline Color', type: 'text', default: '#ffffff' },
    { key: '--bb-subline-size', label: 'Subline Size', type: 'text', default: '1.2rem' },
    { key: '--bb-subline-color', label: 'Subline Color', type: 'text', default: '#d0d0d0' },
    { key: '--bb-radius', label: 'Border Radius', type: 'text', default: '0.8rem' },
    { key: '--bb-padding', label: 'Padding', type: 'text', default: '2rem 3rem' },
  ],
```

- [ ] **Step 2: Add themeTokens to bug manifest**

In `packages/modules/src/bug/basic/manifest.ts`, add after the `capabilities` property:

```ts
  themeTokens: [
    { key: '--bug-bg', label: 'Background', type: 'text', default: 'rgba(0,0,0,0.6)' },
    { key: '--bug-radius', label: 'Border Radius', type: 'text', default: '0.4rem' },
    { key: '--bug-margin', label: 'Margin from Edge', type: 'text', default: '3vh' },
    { key: '--bug-text-size', label: 'Text Size', type: 'text', default: '0.85rem' },
    { key: '--bug-text-color', label: 'Text Color', type: 'text', default: '#ffffff' },
  ],
```

- [ ] **Step 3: Verify types compile**

Run: `cd packages/modules && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/modules/src/billboard/basic/manifest.ts packages/modules/src/bug/basic/manifest.ts
git commit -m "feat: add themeTokens to billboard and bug manifests"
```

---

### Task 6: Pass `themeTokens` through module registration plugin

**Files:**
- Modify: `apps/engine-ui/server/plugins/register-modules.ts`

- [ ] **Step 1: Add themeTokens to the upsert call**

In `apps/engine-ui/server/plugins/register-modules.ts`, add `themeTokens` to the object passed to `upsertModule` (after `capabilities`):

```ts
      themeTokens: manifest.themeTokens,
```

The full upsert call becomes:

```ts
    upsertModule(db, {
      moduleKey: manifest.id,
      label: manifest.label,
      version: manifest.version,
      category: manifest.category,
      configSchema: manifest.configSchema,
      dataSchema: manifest.dataSchema,
      actions: manifest.actions,
      animationHooks: manifest.animationHooks,
      capabilities: manifest.capabilities,
      themeTokens: manifest.themeTokens,
    });
```

- [ ] **Step 2: Commit**

```bash
git add apps/engine-ui/server/plugins/register-modules.ts
git commit -m "feat: pass themeTokens through module registration plugin"
```

---

### Task 7: Refactor WorkspaceForm to tabbed layout with theme token editors

**Files:**
- Modify: `apps/engine-ui/app/components/WorkspaceForm.vue`

- [ ] **Step 1: Rewrite WorkspaceForm.vue**

Replace the entire contents of `apps/engine-ui/app/components/WorkspaceForm.vue` with:

```vue
<script setup lang="ts">
import type { Workspace, ModuleRecord, ThemeTokenDef } from 'engine-core'

const props = defineProps<{
  workspace?: Workspace | null
  modules?: ModuleRecord[]
}>()

const emit = defineEmits<{
  submit: [data: { name: string, description: string, themeTokens: Record<string, string> }]
  cancel: []
}>()

const state = reactive({
  name: props.workspace?.name ?? '',
  description: props.workspace?.description ?? '',
})

const tokenValues = reactive<Record<string, string>>(
  props.workspace?.themeTokens
    ? { ...props.workspace.themeTokens }
    : {}
)

const isEdit = computed(() => !!props.workspace)

const GLOBAL_TOKENS: ThemeTokenDef[] = [
  { key: '--overlay-font-family-primary', label: 'Primary Font Family', type: 'text', default: 'sans-serif' },
  { key: '--overlay-font-family-secondary', label: 'Secondary Font Family', type: 'text', default: 'sans-serif' },
]

const modulesWithTokens = computed(() =>
  (props.modules ?? []).filter(m => m.themeTokens && m.themeTokens.length > 0)
)

function getTokenValue(key: string): string {
  return tokenValues[key] ?? ''
}

function setTokenValue(key: string, value: string) {
  if (value === '') {
    delete tokenValues[key]
  } else {
    tokenValues[key] = value
  }
}

function getTokenNumberValue(key: string): number | null {
  const v = tokenValues[key]
  return v !== undefined && v !== '' ? Number(v) : null
}

function setTokenNumberValue(key: string, value: number | null) {
  if (value === null) {
    delete tokenValues[key]
  } else {
    tokenValues[key] = String(value)
  }
}

function handleSubmit() {
  if (!state.name.trim()) return
  emit('submit', {
    name: state.name.trim(),
    description: state.description.trim(),
    themeTokens: { ...tokenValues },
  })
}
</script>

<template>
  <form
    class="flex flex-col gap-4"
    @submit.prevent="handleSubmit"
  >
    <TabView>
      <TabPanel header="General">
        <div class="flex flex-col gap-4 pt-2">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">Name <span class="text-red-500">*</span></label>
            <InputText
              v-model="state.name"
              placeholder="e.g. Live Show 2026"
              autofocus
              fluid
            />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">Description</label>
            <Textarea
              v-model="state.description"
              placeholder="Optional description"
              fluid
            />
          </div>
        </div>
      </TabPanel>

      <TabPanel header="Global Styles">
        <div class="flex flex-col gap-4 pt-2">
          <div
            v-for="token in GLOBAL_TOKENS"
            :key="token.key"
            class="flex flex-col gap-1"
          >
            <label class="text-sm font-medium">{{ token.label }}</label>
            <InputText
              :model-value="getTokenValue(token.key)"
              :placeholder="token.default"
              fluid
              @update:model-value="setTokenValue(token.key, $event)"
            />
          </div>
        </div>
      </TabPanel>

      <TabPanel header="Module Styles">
        <div class="flex flex-col gap-4 pt-2">
          <div
            v-if="modulesWithTokens.length === 0"
            class="text-sm text-surface-400 py-2"
          >
            No modules define style tokens.
          </div>

          <Fieldset
            v-for="mod in modulesWithTokens"
            :key="mod.id"
            :legend="mod.label"
            toggleable
            :collapsed="true"
          >
            <div class="flex flex-col gap-3">
              <div
                v-for="token in mod.themeTokens"
                :key="token.key"
                class="flex flex-col gap-1"
              >
                <label class="text-sm font-medium">{{ token.label }}</label>

                <InputText
                  v-if="token.type === 'text'"
                  :model-value="getTokenValue(token.key)"
                  :placeholder="token.default"
                  fluid
                  @update:model-value="setTokenValue(token.key, $event)"
                />

                <InputNumber
                  v-else-if="token.type === 'number'"
                  :model-value="getTokenNumberValue(token.key)"
                  :placeholder="token.default"
                  fluid
                  @update:model-value="setTokenNumberValue(token.key, $event)"
                />

                <Select
                  v-else-if="token.type === 'dropdown'"
                  :model-value="getTokenValue(token.key) || undefined"
                  :options="token.options"
                  :placeholder="token.default"
                  show-clear
                  fluid
                  @update:model-value="setTokenValue(token.key, $event ?? '')"
                />
              </div>
            </div>
          </Fieldset>
        </div>
      </TabPanel>
    </TabView>

    <div class="flex justify-end gap-2 pt-2">
      <Button
        label="Cancel"
        severity="secondary"
        text
        @click="emit('cancel')"
      />
      <Button
        :label="isEdit ? 'Save' : 'Create'"
        type="submit"
      />
    </div>
  </form>
</template>
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/app/components/WorkspaceForm.vue
git commit -m "feat: refactor WorkspaceForm to tabbed layout with theme token editors"
```

---

### Task 8: Wire up parent page to pass modules and themeTokens

**Files:**
- Modify: `apps/engine-ui/app/pages/app/index.vue`

- [ ] **Step 1: Fetch modules and pass to WorkspaceForm**

In `apps/engine-ui/app/pages/app/index.vue`:

1. Add `ModuleRecord` to the type import:

```ts
import type { Workspace, WorkspaceId, ModuleRecord } from 'engine-core'
```

2. Add modules ref and fetch (after the workspaces fetch in `onMounted`):

```ts
const modules = ref<ModuleRecord[]>([])
```

Inside `onMounted`, after `workspaces.value = await api.listWorkspaces()`:

```ts
    modules.value = await $fetch<ModuleRecord[]>('/api/modules')
```

3. Pass `modules` to both `WorkspaceForm` instances in the template:

```html
<WorkspaceForm
  :modules="modules"
  @submit="handleCreate"
  @cancel="showCreateModal = false"
/>
```

```html
<WorkspaceForm
  :workspace="editingWorkspace"
  :modules="modules"
  @submit="handleUpdate"
  @cancel="editingWorkspace = null"
/>
```

4. Widen both workspace dialog modals from `max-w-md` to `max-w-xl`:

```html
class="w-full max-w-xl"
```

- [ ] **Step 2: Include themeTokens in create handler**

Update `handleCreate` signature and body to pass `themeTokens`:

```ts
async function handleCreate(data: { name: string, description: string, themeTokens: Record<string, string> }) {
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
```

- [ ] **Step 3: Include themeTokens in update handler**

Update `handleUpdate` similarly:

```ts
async function handleUpdate(data: { name: string, description: string, themeTokens: Record<string, string> }) {
  if (!editingWorkspace.value) return
  const id = editingWorkspace.value.id
  try {
    const updated = await $fetch<Workspace>(`/api/workspaces/${id}`, {
      method: 'PUT',
      body: data
    })
    const idx = workspaces.value.findIndex(w => w.id === id)
    if (idx !== -1) workspaces.value[idx] = updated
    editingWorkspace.value = null
    toast.add({ summary: 'Workspace updated', severity: 'success', life: 3000 })
  } catch {
    toast.add({ summary: 'Failed to update workspace', severity: 'error', life: 3000 })
  }
}
```

- [ ] **Step 4: Build and verify**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add apps/engine-ui/app/pages/app/index.vue
git commit -m "feat: wire workspace page to pass modules and themeTokens to form"
```

---

### Task 9: End-to-end verification

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`

- [ ] **Step 2: Verify module registration logs theme tokens**

Check server console for: `[CeeGee] Registered 5 modules`

- [ ] **Step 3: Verify modules API returns themeTokens**

Open: `http://localhost:3000/api/modules`
Verify billboard module has `themeTokens` array with 6 entries and bug has 5 entries.

- [ ] **Step 4: Test workspace creation with tokens**

1. Navigate to `/app`
2. Click "New Workspace"
3. Verify three tabs appear: General, Global Styles, Module Styles
4. In General tab, enter a name
5. In Global Styles, set Primary Font Family to `'Bebas Neue', sans-serif`
6. In Module Styles, expand "Basic Billboard", set Headline Color to `#ffcc00`
7. Click Create
8. Verify workspace is created

- [ ] **Step 5: Test workspace editing preserves tokens**

1. Click edit on the workspace you just created
2. Verify Global Styles tab shows the font you entered
3. Verify Module Styles > Basic Billboard shows `#ffcc00` for Headline Color
4. Change a value, save, and re-open to confirm persistence

- [ ] **Step 6: Verify overlay renders with custom tokens**

1. Create a channel and layer in the workspace
2. Add a Billboard element with some headline text
3. Open the overlay URL in a separate tab
4. Take the element on air
5. Verify the headline renders with the custom color from the theme token

- [ ] **Step 7: Run full test suite**

Run: `pnpm test`
Expected: All tests pass
