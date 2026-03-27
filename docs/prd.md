# PRD for CeeGee

## 1. Overview

A self‑hosted, Node‑based **HTML graphics engine** plus **web control UI** for broadcast‑style overlays, built with **Nuxt 4 + Vue 3 + GSAP**.

- Outputs HTML overlays for OBS Browser Source via composited **Channels**, containing **Layers** and **Elements**.
- Uses **Modules** (Vue components + manifests) to implement visual types (lower third, brand bug, billboard, clock, countdown, etc.).
- Provides **Operator** and **Producer** UIs scoped by **Workspaces**.

No auth / tenancy in MVP; a single deployment can have multiple workspaces, all visible to all users in that deployment.

All entities are addressed by numeric auto‑increment IDs. Slugs are not used.

> **Type definitions**: see [schema-typescript.md](schema-typescript.md) for all TypeScript types.
> **Database schema**: see [schema-sqlite.md](schema-sqlite.md) for all SQL DDL.

## 2. Core concepts and data model

### 2.1 Workspace

Top‑level container for a project.

Responsibilities:

- Namespace for Channels, Layers, Elements, Assets, and configuration.
- Defines display config (resolution, aspect, theme tokens).

Fields: `id`, `name`, `description`, `displayConfig` (base resolution, aspect ratio, safe areas), `themeTokens` (CSS vars for overlays).

Persistence: SQLite table `workspaces` with flattened display config columns + JSON column for `themeTokens`.

### 2.2 Channel

A logical **output bus** within a workspace (e.g., "Main Program", "Backup Program").

Fields: `id`, `workspaceId`, `name`, `description`.

Runtime: each channel has state tracking its active Layers and Elements, visibility and animation intents (`ChannelState`).

### 2.3 Layer

A grouped collection of Elements with a **z‑index** (visual stack order).

Fields: `id`, `workspaceId`, `channelId`, `name`, `zIndex`, `region` (optional layout hint, e.g. `band-lower`, `corner-tr`, `full`).

### 2.4 Module

A **visual component type** (lower third, brand bug, billboard, clock, countdown, etc.), implemented as a Vue component plus a manifest (`ModuleManifest`).

Modules are **developer‑authored** and live in `packages/modules/`.

Each module manifest declares:

- `id` (stable key, e.g. `lower-third.basic`), `label`, `version`, `category`.
- `configSchema` — JSON Schema for Element configuration.
- `dataSchema` — JSON Schema describing what data the module can display. In MVP, these fields are part of `config`; when Datasources arrive (v1.1+), they can be populated from external sources.
- `actions` — control actions the UI can send (e.g. show, hide, start, stop, reset).
- `animationHooks` — named GSAP animation hooks (enter, exit, emphasize).
- `capabilities` — optional flags (supports layer regions, supports multiple instances per layer).

#### Module auto‑registration

At engine startup, the engine scans `packages/modules/` for exported `ModuleManifest` objects. For each manifest found, it upserts a row in the `modules` DB table (insert if new `module_key`, update version/schemas if changed). This means module registration is automatic — developers add a module to the package and restart the engine.

Runtime: each module has a Vue component that receives `config` and `runtimeState` as props, and uses GSAP internally for enter/exit/emphasis animations.

### 2.5 Element

An **instance** of a Module on a Layer, with configuration.

Fields: `id`, `workspaceId`, `channelId`, `layerId`, `name`, `moduleId` (FK to modules table), `sortOrder` (ordering within layer / rundown), `config` (JSON matching the module's `configSchema`; in MVP also includes data fields from `dataSchema`).

Runtime state: `elementId`, `moduleId`, `visibility` (`hidden` | `entering` | `visible` | `exiting`), optional `runtimeData`.

### 2.6 Assets

Workspace‑scoped assets (logos, backgrounds, etc.) managed in the Producer UI.

Fields: `id`, `workspaceId`, `name`, `path` (filesystem path relative to workspace asset dir), `mimeType`, `sizeBytes`, `width`, `height`, `tags`, `folderPath` (virtual organizational folder).

Upload flow includes validation of file type/size/dimensions.

#### Asset resolution

Modules that reference assets (e.g., `logoAssetId` in a lower third config) need to resolve asset IDs to renderable URLs. The engine provides an asset serving endpoint:

- `GET /api/workspaces/:workspaceId/assets/:assetId/file` — serves the asset file with correct `Content-Type`.

Module components can use a `useAssetUrl(workspaceId, assetId)` composable to construct the URL.

## 3. Rendering and routing

### 3.1 Display configuration

Per workspace:

- `baseWidth`, `baseHeight`: default 1920×1080, 16:9.
- Overlays are rendered full‑frame at base resolution with a transparent background.
- Layout in modules uses:
  - CSS variables for tokens (colors, fonts, spacing).
  - Relative units (%, `vw`, `vh`, `rem`) with occasional px where required.

### 3.2 Overlay routes

Playout URIs (all read‑only):

- **Channel (program) view**
  - `/o/:workspaceId/channel/:channelId`
  - Renders all active Layers and Elements for that workspace + channel, in z‑index order.

- **Layer view**
  - `/o/:workspaceId/layer/:layerId`
  - Renders only Elements on that Layer.

- **Element view**
  - `/o/:workspaceId/element/:elementId`
  - Renders only a single Element instance.

Implementation pattern:

- Each route mounts a generic `OverlayHost` Vue component.
- `OverlayHost`:
  - Resolves workspace/channel/layer/element from the DB.
  - Subscribes to a WebSocket bus for `{workspace}:{channel}` state.
  - Dynamically loads Module Vue components using `defineAsyncComponent` with a module key → component path resolver. Module components are code‑split so only the needed module is loaded per overlay instance.
  - Renders Modules based on the current `ChannelState` and route type.
  - Applies workspace theme tokens as CSS vars on root.

OBS integration:

- Typical: one Browser Source per channel using `/o/:workspaceId/channel/:channelId`.
- Advanced: optional Layer or Element sources for custom composition.

## 4. Runtime engine

Node service maintaining live state and broadcasting updates.

### 4.1 State store

In‑memory state + persistence to SQLite.

Responsibility:

- Accept control commands (Take, Clear, Start/Stop countdown, etc.).
- Update in‑memory state accordingly.
- Persist relevant parts (e.g., last known Element configs and visibility) to SQLite for resilience.
- Publish state updates to overlay clients via WebSocket.

### 4.2 Transport

Use **WebSockets** for low‑latency state propagation.

- Single WebSocket endpoint: `/ws`.
- Clients subscribe with `{workspaceId, channelId, scope}` indicating if they care about channel, layer, or element.

Events (see `EngineEvent` in [schema-typescript.md](schema-typescript.md)):

- `state:init` — full `ChannelState` sent on connection.
- `state:update` — **full replacement** of `ChannelState`. Clients replace their local state entirely with the payload (no merge logic needed).
- `element:action` — broadcasts that an action was performed on an element, so overlay clients can react.
- `telemetry` — optional diagnostic data.

Overlay clients:

- On connect: receive `state:init` event with full channel state.
- Then apply `state:update` as full replacements.

### 4.3 HTTP API (control surface backend)

#### Workspaces

- `GET /api/workspaces`
- `GET /api/workspaces/:workspaceId`
- `POST /api/workspaces`
- `PUT /api/workspaces/:workspaceId`
- `DELETE /api/workspaces/:workspaceId`

#### Channels

- `GET /api/workspaces/:workspaceId/channels`
- `GET /api/workspaces/:workspaceId/channels/:channelId`
- `POST /api/workspaces/:workspaceId/channels`
- `PUT /api/workspaces/:workspaceId/channels/:channelId`
- `DELETE /api/workspaces/:workspaceId/channels/:channelId`

#### Layers

- `GET /api/workspaces/:workspaceId/channels/:channelId/layers`
- `GET /api/workspaces/:workspaceId/channels/:channelId/layers/:layerId`
- `POST /api/workspaces/:workspaceId/channels/:channelId/layers`
- `PUT /api/workspaces/:workspaceId/channels/:channelId/layers/:layerId`
- `DELETE /api/workspaces/:workspaceId/channels/:channelId/layers/:layerId`

#### Elements

- `GET /api/workspaces/:workspaceId/channels/:channelId/elements`
- `GET /api/workspaces/:workspaceId/channels/:channelId/elements/:elementId`
- `POST /api/workspaces/:workspaceId/channels/:channelId/elements`
- `PUT /api/workspaces/:workspaceId/channels/:channelId/elements/:elementId`
- `DELETE /api/workspaces/:workspaceId/channels/:channelId/elements/:elementId`

#### Engine control

- `POST /api/workspaces/:workspaceId/channels/:channelId/elements/:elementId/take`
- `POST /api/workspaces/:workspaceId/channels/:channelId/elements/:elementId/clear`
- `POST /api/workspaces/:workspaceId/channels/:channelId/elements/:elementId/action` (generic for module actions like `start`, `stop`, `reset`).

#### Assets

- `GET /api/workspaces/:workspaceId/assets`
- `GET /api/workspaces/:workspaceId/assets/:assetId`
- `POST /api/workspaces/:workspaceId/assets` (multipart upload)
- `DELETE /api/workspaces/:workspaceId/assets/:assetId`
- `GET /api/workspaces/:workspaceId/assets/:assetId/file` (serves the asset binary)

#### Health

- `GET /api/health` — returns engine status, uptime, and WebSocket connection count.

## 5. Operator UI (Nuxt 4)

Route: `/app/:workspaceId/operator`

### 5.1 Layout

- Top bar:
  - Workspace selector (dropdown).
  - Channel selector (dropdown).
  - Connection status (WS).
  - "On Air" indicator if any Elements are visible.

- Left pane: **Rundown**
  - List of Elements (or groups) in `sortOrder` per channel.
  - Each row: Element name, module type icon, Layer name, status: `Ready`, `On Air`, `Done`.

- Center pane: **Layer dashboard**
  - One row per Layer:
    - Layer name + z‑index.
    - Current "live" Element (if any).
    - TAKE and CLEAR buttons for that Layer.
    - Dropdown/list of assignable Elements for that Layer.

- Right pane: **Context panel**
  - For selected Element:
    - Mini preview (Element view in iframe).
    - Quick field editing (name/title/text).
    - Visual state indicator:
      - Not selected.
      - Selected (pending TAKE).
      - Live (On Air).

### 5.2 Interaction model

- **Selection vs live state**:
  - Operator selects an Element → it becomes "selected" (pending).
  - TAKE on a Layer:
    - Hides current visible Element on that Layer (triggers exit animation).
    - Shows selected Element (triggers enter animation).
  - Buttons reflect:
    - `default` (no selection).
    - `pending` (selected, not live yet).
    - `live` (currently visible).

- **Direct hide**:
  - CLEAR on a Layer sets its visible Element to hidden (exit animation).

- **No separate preview bus in MVP**:
  - Edits to fields update the Element's config and are taken live on next TAKE.
  - Future dev: add a separate `preview` channel/bus.

Keyboard shortcuts (future dev).

## 6. Producer UI (Nuxt 4)

Routes:

- `/app/:workspaceId/producer` – structure (Channels/Layers/Elements/Modules).
- `/app/:workspaceId/producer/assets` – Asset library.

### 6.1 Structure view

- Channel list:
  - Channels in this workspace with basic metadata.
- For selected Channel:
  - Layers list (sortable by z‑index).
  - For selected Layer:
    - Elements list (sortable by `sortOrder`) with:
      - Name, Module type, status.

Producers can:

- Create/edit/delete Channels, Layers, Elements.
- Assign Modules to Elements and configure them (configSchema‑driven forms).
- Reorder Elements within a Layer (updates `sortOrder`).

### 6.2 Assets view

- Grid/list of assets with:
  - Thumbnail, name, type, size, folder, usage count.
- Folder sidebar (virtual folders).
- Upload flow:
  - Validate type (image/SVG only for MVP), size, dimensions.
  - Reject or warn if too large.
- Usage indicator:
  - Click to see which Elements reference that asset.

Workspace duplication (future dev but specced as desirable): clone workspace (including Channels/Layers/Elements/Assets metadata, not raw asset files).

## 7. Styling and "CSS for TV"

### 7.1 Overlay styling

- Overlay runtime uses **scoped CSS** and **CSS variables** for theming and layout.
- A shared design token set (colors, spacing, type scales) injected per workspace via CSS vars on root.

### 7.2 TV‑CSS package (future dev, separate NPM package)

Define a separate package (e.g., `@acme/tv-css`) that provides:

- TV‑oriented type scales and line‑length recommendations.
- Utilities for safe areas and typical broadcast regions.
- Base classes for common overlay patterns (lower thirds, bugs, tickers, clocks).
- Animation presets coordinating with GSAP (shared naming for `enter`/`exit` hooks).

Overlay modules import and use this package.

## 8. Storage and deployment

### 8.1 Data storage

- **SQLite**:
  - Primary DB for Workspaces, Channels, Layers, Elements, Assets metadata, and persisted state.
  - Good fit for low‑concurrency, config‑heavy apps like this.

- **Filesystem**:
  - Asset files under a workspace‑scoped directory tree (or mounted volume).

Future dev:

- Abstract data access layer to swap out SQLite for Postgres or another DB if scaling/concurrency require it.

### 8.2 Deployment assumptions

- Single Node/Nuxt deployment per environment.
- Trusted LAN / VPN; no auth or multi‑tenant security in MVP.
- Multiple workspaces allowed; any user can see/edit any workspace.

## 9. MVP scope summary

**Included in MVP:**

- Workspaces, Channels, Layers, Elements (instances).
- Modules for:
  - Lower third.
  - Brand bug.
  - Billboard text.
  - Clock.
  - Countdown timer.
- Module auto‑registration at engine startup.
- Overlay routes:
  - `/o/:workspaceId/channel/:channelId`
  - `/o/:workspaceId/layer/:layerId`
  - `/o/:workspaceId/element/:elementId`
- Engine:
  - In‑memory state + SQLite persistence.
  - WebSocket state propagation (full replacement semantics).
  - Module loading via `defineAsyncComponent`.
- Operator UI:
  - Workspace + Channel selection.
  - Rundown (ordered by `sortOrder`) + Layer dashboard.
  - TAKE/CLEAR flow with "selected vs live" indication.
- Producer UI:
  - Channel/Layer/Element management.
  - Asset library with upload + usage indicators.
- Assets:
  - Upload, storage, serving via `/api/.../assets/:id/file`.
  - `useAssetUrl()` composable for module components.
- API:
  - Full CRUD for Workspaces, Channels, Layers, Elements, Assets.
  - Engine control (take/clear/action).
  - Health endpoint.
- Styling:
  - Scoped CSS + CSS vars for overlays.
  - Tailwind (or similar) allowed only in control UI.

**Deferred:** See [future-development.md](future-development.md) for all features deferred from MVP, including Datasources/Transforms (v1.1), preview bus, hotkeys, auth, and more.

## 10. Technologies & Architecture

### 10.1 Core technologies

- **Language / runtime**
  - Node.js (LTS) with **TypeScript** for all server and shared code.
- **Web framework**
  - **Nuxt 4 + Vue 3** for:
    - `/app` routes: Operator and Producer UIs (SSR + SPA).
    - `/o` routes: overlay hosts for Channel/Layer/Element views.
- **Database**
  - **SQLite** as primary data store (single deployment, low concurrency, config/state heavy).
  - **Drizzle ORM** for schema management, migrations, and queries.
  - Thin data‑access layer to allow a future swap to Postgres if ever needed.
- **Realtime transport**
  - **WebSocket** server via Nuxt/Nitro built‑in support for engine state distribution.
- **Animation**
  - **GSAP** in overlay modules for enter/exit/emphasis animations and simple sequences.
- **Styling**
  - Control UI (`/app`):
    - Tailwind CSS or similar utility framework for rapid layout and theming.
  - Overlays (`/o`):
    - Scoped CSS in Vue SFCs + CSS variables driven by workspace theme tokens.
    - Future: external CSS‑for‑TV package.
- **Build / tooling**
  - pnpm (or npm/yarn) workspaces for monorepo management.
  - Vite (via Nuxt) for frontend build.

### 10.2 Project structure (monorepo)

Proposed layout:

- `apps/engine-ui/`
  - Nuxt 4 app:
    - `/app` – Operator/Producer/Assets UI.
    - `/o` – Channel/Layer/Element overlay hosts.
  - Uses `engine-core` package for API client types and shared business logic.
- `packages/engine-core/`
  - Core engine (pure Node/TS, framework‑agnostic):
    - Channel/Layer/Element state in memory.
    - WebSocket event bus.
    - HTTP handlers for control API.
    - DB layer and migrations for SQLite (Drizzle).
- `packages/modules/`
  - Built‑in overlay modules:
    - `lower-third.basic`, `bug.basic`, `billboard.basic`, `clock.basic`, `countdown.basic`.
  - Each exports:
    - Vue component (for overlay rendering).
    - `ModuleManifest` (id, config schema, actions, animation hooks).
- `packages/tv-css/` (future)
  - Separate NPM package: TV‑oriented design tokens, safe‑area helpers, and layout/animation primitives for broadcast HTML graphics.

***

## 11. Nuxt + engine-core integration

### 11.1 HTTP/API

Two options; MVP assumes the simpler, integrated approach.

- **Integrated (preferred for MVP)**:
  - `engine-core` exposes pure TS functions like `registerRoutes(app)` that attach handlers to a given HTTP server/router.
  - Nuxt server (Nitro) provides the HTTP layer; `engine-core` routes mounted under `/api/...`.
- **Alternative (future)**:
  - Run `engine-core` as a standalone Node service; Nuxt app calls its HTTP/WS endpoints.
  - Better for horizontal scaling, but not needed for MVP.

For MVP, we'll:

- Use Nuxt server routes (`server/api/...`) as thin wrappers that delegate to `engine-core`.
- Share types between `engine-core` and `engine-ui` via a shared package (or TS project refs).

### 11.2 WebSocket

- `engine-core` owns a WebSocket server via Nuxt/Nitro built‑in WebSocket support.
- Clients connect to `/ws?workspaceId=...&channelId=...&scope=channel|layer|element`.

Responsibilities:

- Engine:
  - Maintains in‑memory state.
  - On API actions (Take/Clear/Action), mutates state and pushes `state:update` events (full channel state replacement).
- Overlay clients (`/o/...`):
  - On mount, receive `state:init` with full channel state.
  - Apply `state:update` as full replacements and drive GSAP animations based on Element visibility changes.
- App clients (`/app/...`):
  - Show live status (e.g., what's On Air) by listening to the same WS channel.

### 11.3 Overlay rendering in Nuxt

- Routes:
  - `/o/[workspaceId]/channel/[channelId]`
  - `/o/[workspaceId]/layer/[layerId]`
  - `/o/[workspaceId]/element/[elementId]`
- Each uses a shared `OverlayHost` component that:
  - Reads route params.
  - Calls engine API to resolve workspace/channel/layer/element metadata.
  - Connects to WS for state.
  - Dynamically loads Module Vue components via `defineAsyncComponent` with a module key → component path resolver. Each module is code‑split so the overlay only loads the JS for modules it actually renders.
  - Applies workspace theme tokens as CSS vars on root.

### 11.4 App UI in Nuxt

- `pages/app/index.vue`:
  - Workspace dashboard (list, select workspace).
- `pages/app/[workspaceId]/operator.vue`:
  - Operator layout (Rundown, Layer dashboard, Context).
- `pages/app/[workspaceId]/producer/index.vue`:
  - Channels/Layers/Elements management.
- `pages/app/[workspaceId]/producer/assets.vue`:
  - Asset library.

All of these:

- Use composables (e.g., `useEngineApi()`, `useEngineWs()`) for data access.
- Render forms based on `ModuleManifest.configSchema`.
