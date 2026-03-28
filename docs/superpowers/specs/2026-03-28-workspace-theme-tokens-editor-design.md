# Workspace Theme Tokens Editor

## Overview

Add a tabbed workspace create/edit form with a theme token editor. Module manifests declare their CSS custom properties with metadata so the UI can auto-generate appropriate form controls. Global overlay tokens (fonts) are hardcoded in a separate tab.

## Types

Add to `engine-core/src/types.ts`:

```ts
type ThemeTokenDef = {
  key: string           // CSS custom property name, e.g. "--bb-headline-color"
  label: string         // Human-readable label, e.g. "Headline Color"
  type: 'text' | 'number' | 'dropdown'
  default: string       // Default value, e.g. "#ffffff", "2rem"
  options?: string[]    // Required when type is 'dropdown'
}
```

Add `themeTokens?: ThemeTokenDef[]` to:
- `ModuleManifest`
- `ModuleRecord`
- `UpsertModuleInput`

## Module Manifest Changes

Each module declares the CSS custom properties it consumes via a `themeTokens` array. Only modules with module-specific tokens need this field.

### Billboard (`billboard.basic`)

```ts
themeTokens: [
  { key: '--bb-headline-size', label: 'Headline Size', type: 'text', default: '2rem' },
  { key: '--bb-headline-color', label: 'Headline Color', type: 'text', default: '#ffffff' },
  { key: '--bb-subline-size', label: 'Subline Size', type: 'text', default: '1.2rem' },
  { key: '--bb-subline-color', label: 'Subline Color', type: 'text', default: '#d0d0d0' },
  { key: '--bb-radius', label: 'Border Radius', type: 'text', default: '0.8rem' },
  { key: '--bb-padding', label: 'Padding', type: 'text', default: '2rem 3rem' },
]
```

### Bug (`bug.basic`)

```ts
themeTokens: [
  { key: '--bug-bg', label: 'Background', type: 'text', default: 'rgba(0,0,0,0.6)' },
  { key: '--bug-radius', label: 'Border Radius', type: 'text', default: '0.4rem' },
  { key: '--bug-margin', label: 'Margin from Edge', type: 'text', default: '3vh' },
  { key: '--bug-text-size', label: 'Text Size', type: 'text', default: '0.85rem' },
  { key: '--bug-text-color', label: 'Text Color', type: 'text', default: '#ffffff' },
]
```

### Lower Third, Clock, Countdown

These modules use only the global `--overlay-font-family-*` tokens. No `themeTokens` array needed.

## Engine-Core Persistence

### Schema (`db/schema.ts`)

Add a `themeTokensJson` text column to the modules table, defaulting to `'[]'`.

### CRUD (`index.ts`)

- On module upsert: serialize `themeTokens` to `themeTokensJson`
- On module read: parse `themeTokensJson` back to `ThemeTokenDef[]`

## WorkspaceForm UI

Refactor `WorkspaceForm.vue` from a flat form to a **PrimeVue TabView** with three tabs.

### Tab 1 — General

Unchanged. Name (required) and Description fields.

### Tab 2 — Global Styles

Hardcoded fields for the two global overlay tokens:

| Token | Label | Control | Default |
|-------|-------|---------|---------|
| `--overlay-font-family-primary` | Primary Font Family | text | `sans-serif` |
| `--overlay-font-family-secondary` | Secondary Font Family | text | `sans-serif` |

### Tab 3 — Module Styles

- Receives `modules: ModuleRecord[]` as a prop
- Filters to modules that have a non-empty `themeTokens` array
- Renders a collapsible fieldset per module, titled with the module's `label`
- Inside each fieldset, renders one control per `ThemeTokenDef`:
  - `text` -> PrimeVue `InputText`
  - `number` -> PrimeVue `InputNumber`
  - `dropdown` -> PrimeVue `Select` with `options`
- Each field shows `ThemeTokenDef.label` as the label and `ThemeTokenDef.default` as placeholder
- Only non-empty values are written to the workspace's `themeTokens` record

### Data Flow

All tabs write into a single `Record<string, string>` that maps CSS variable names to values. This is emitted as `themeTokens` alongside `name` and `description`.

When editing an existing workspace, the form reads the workspace's `themeTokens` and populates matching fields.

## Parent Page Changes (`app/index.vue`)

- Fetch modules on mount (via `/api/modules`)
- Pass `modules` prop to `WorkspaceForm`
- Include `themeTokens` in the body of create (`POST`) and update (`PUT`) requests

The modal width increases from `max-w-md` to `max-w-xl` to accommodate the tabbed layout.

## Files Changed

1. `packages/engine-core/src/types.ts` — `ThemeTokenDef` type, update `ModuleManifest`/`ModuleRecord`/`UpsertModuleInput`
2. `packages/engine-core/src/db/schema.ts` — add `themeTokensJson` column to modules table
3. `packages/engine-core/src/index.ts` — serialize/deserialize `themeTokens` in module CRUD
4. `packages/modules/src/billboard/basic/manifest.ts` — add `themeTokens` array
5. `packages/modules/src/bug/basic/manifest.ts` — add `themeTokens` array
6. `apps/engine-ui/app/components/WorkspaceForm.vue` — tabbed form with Global Styles and Module Styles editors
7. `apps/engine-ui/app/pages/app/index.vue` — fetch modules, pass to form, include `themeTokens` in API calls
