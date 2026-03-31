# Module Development Guide Expansion Design

**Issue:** #51 (parent: #48)
**Date:** 2026-03-30

## Goal

Replace the single `33.modules.md` with three focused pages covering module architecture, a step-by-step creation walkthrough, and a complete API reference.

## File Changes

### Delete

- `docs/developer/33.modules.md` — replaced by the three new pages below

### Create

- `docs/developer/33.module-architecture.md` — architecture and lifecycle
- `docs/developer/34.creating-a-module.md` — step-by-step walkthrough with minimal example
- `docs/developer/35.module-api-reference.md` — complete API surface documentation

### Rename

- `docs/developer/34.testing.md` → `docs/developer/36.testing.md` — renumber to make room

## Page Content

### 33.module-architecture.md

**What a module is:** A manifest (TypeScript object describing config, actions, animations) paired with a Vue component (renders the overlay graphic).

**File structure:** Overview of `packages/modules/src/` directory layout — category/variant pattern, `index.ts` (server-safe manifest exports), `registry.ts` (client-side component mapping).

**Lifecycle:**
1. **Registration** — On server startup, the Nitro plugin imports all manifests from `index.ts` and upserts them into the `modules` database table.
2. **Element creation** — Producer creates an element, selecting a module type. Config is stored as JSON based on the module's `configSchema`.
3. **Overlay rendering** — `OverlayHost.vue` resolves the module key to a Vue component via `registry.ts`, instantiates it with `ModuleComponentProps`.
4. **Runtime control** — Operator triggers take/clear/actions. Engine updates `elementRuntimeState` in the database and broadcasts via WebSocket. The component watches `runtimeState.visibility` and `runtimeState.runtimeData` to drive animations.

**Interaction diagram:** Shows data flow between Producer UI → engine-core → database → WebSocket → OverlayHost → module component.

### 34.creating-a-module.md

**Step-by-step walkthrough** — Same structure as current doc (create manifest, create component, register, restart) but enhanced with:

- A complete minimal example module: a simple "text-card" that displays a message with configurable background color, fade-in/fade-out animations, and one theme token.
- Full manifest with all fields populated and annotated.
- Full Vue component with GSAP enter/exit animations, theme token usage, and action handling.
- Registration in both `index.ts` and `registry.ts` with exact code.
- Verification steps: restart server, create element in Producer, take it live in Operator.

**Styling guidelines:** Scoped CSS, CSS variables for theming, relative units, no Tailwind in modules.

### 35.module-api-reference.md

**ModuleManifest type** — All fields with types, descriptions, and examples.

**ModuleComponentProps type** — All props with types and descriptions.

**ElementRuntimeState** — Fields and visibility state machine (`hidden` → `entering` → `visible` → `exiting` → `hidden`).

**configSchema conventions:**
- Supported JSON Schema types (string, number, integer, boolean)
- Enum fields for dropdowns
- Asset reference fields (`type: ['integer', 'null']` convention)
- Default values
- Required fields

**Actions:**
- How to define in manifest
- How they're dispatched (Operator UI → API → engine → WebSocket)
- How to respond in the component (watching `runtimeData.lastAction`)

**Animation hooks:**
- GSAP patterns: `gsap.fromTo()`, `gsap.to()`, timelines
- Killing conflicting timelines before starting new ones
- Enter/exit/emphasize hook conventions

**Theme tokens:**
- `ThemeTokenDef` type: `key`, `label`, `type` ('text' | 'number' | 'dropdown'), `default`, `options`
- How tokens are injected as CSS custom properties on the overlay root
- How to reference in component CSS: `var(--token-key, fallback)`
- Naming convention: `--module-prefix-property`

**Capabilities:**
- `supportsLayerRegions` — what layer regions are, when to enable
- `supportsMultipleInstancesPerLayer` — behavior when enabled/disabled

**Built-in modules table** — Key, category, description for all 5 modules.

## Out of Scope

- Changes to module source code
- New example module in the codebase (the example is documentation-only)
- Changes to user-facing docs
