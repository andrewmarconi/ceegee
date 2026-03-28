# Engine UI (Nuxt App)

`apps/engine-ui` is the Nuxt 4 application that serves all UIs, the REST API, and the WebSocket endpoint.

## Directory structure

```
apps/engine-ui/
├── app/
│   ├── app.vue                    # Root component
│   ├── app.config.ts              # App configuration
│   ├── pages/
│   │   ├── index.vue              # Landing page
│   │   ├── app/
│   │   │   ├── index.vue          # Workspace hub
│   │   │   └── [workspaceId]/
│   │   │       ├── operator.vue   # Operator UI
│   │   │       └── producer/
│   │   │           ├── index.vue  # Producer UI
│   │   │           └── assets.vue # Asset library
│   │   └── o/
│   │       └── [workspaceId]/
│   │           ├── channel/[channelId].vue
│   │           ├── layer/[layerId].vue
│   │           └── element/[elementId].vue
│   ├── components/
│   │   ├── AppHeader.vue
│   │   ├── AppLogo.vue
│   │   ├── WorkspaceForm.vue
│   │   ├── overlay/
│   │   │   └── OverlayHost.vue    # Core overlay renderer
│   │   ├── operator/
│   │   │   ├── TopBar.vue
│   │   │   ├── ContextPanel.vue
│   │   │   ├── ElementGrid.vue
│   │   │   └── LayerFilter.vue
│   │   └── producer/
│   │       ├── ConfigForm.vue
│   │       ├── ChannelForm.vue
│   │       ├── ChannelList.vue
│   │       ├── LayerForm.vue
│   │       ├── LayerList.vue
│   │       ├── ElementForm.vue
│   │       ├── ElementList.vue
│   │       ├── AssetGrid.vue
│   │       ├── AssetUpload.vue
│   │       └── AssetUsageIndicator.vue
│   ├── composables/
│   │   ├── useEngineApi.ts        # Read/operator API client
│   │   ├── useProducerApi.ts      # CRUD API client
│   │   ├── useEngineWs.ts         # WebSocket client
│   │   └── useAssetUrl.ts         # Asset URL helper
│   └── layouts/
│       ├── default.vue            # Standard app layout
│       ├── marketing.vue          # Landing page layout
│       └── overlay.vue            # Transparent overlay layout
├── server/
│   ├── api/                       # Nitro API routes
│   ├── routes/
│   │   └── ws.ts                  # WebSocket handler
│   ├── utils/
│   │   ├── db.ts                  # Database singleton (useDb)
│   │   └── ws-connections.ts      # WebSocket connection tracking
│   └── plugins/
│       └── register-modules.ts    # Module auto-registration
├── nuxt.config.ts
└── package.json
```

## Routing

Nuxt 4 uses `app/` as the source root. Routes are file-based under `app/pages/`.

### App routes (`/app`)

| Route | Page | Purpose |
|-------|------|---------|
| `/` | `index.vue` | Marketing landing page |
| `/app` | `app/index.vue` | Workspace hub (list, create, select) |
| `/app/:workspaceId/operator` | `operator.vue` | Live show control |
| `/app/:workspaceId/producer` | `producer/index.vue` | Build channels/layers/elements |
| `/app/:workspaceId/producer/assets` | `producer/assets.vue` | Asset library |

### Overlay routes (`/o`)

| Route | Purpose |
|-------|---------|
| `/o/:workspaceId/channel/:channelId` | Full channel output (all layers) |
| `/o/:workspaceId/layer/:layerId` | Single layer output |
| `/o/:workspaceId/element/:elementId` | Single element output |

Overlay routes use the `overlay` layout (transparent background, no UI chrome).

## Composables

### useEngineApi

Read-focused API client for the Operator UI.

```ts
const api = useEngineApi();

const workspaces = await api.listWorkspaces();
const workspace = await api.getWorkspace(id);
const channels = await api.listChannels(workspaceId);
const layers = await api.listLayers(channelId);
const elements = await api.listElements(channelId);
const modules = await api.listModules();

await api.updateElement(elementId, { config: newConfig });
await api.takeElement(workspaceId, channelId, elementId);
await api.clearElement(workspaceId, channelId, elementId);
await api.elementAction(workspaceId, channelId, elementId, actionId);
```

### useProducerApi

CRUD-focused API client scoped to a workspace. Used in the Producer UI.

```ts
const api = useProducerApi(workspaceId);

// Channels
await api.createChannel({ name: 'Main Program' });
await api.updateChannel(channelId, { name: 'Updated' });
await api.deleteChannel(channelId);

// Layers
await api.createLayer(channelId, { name: 'Lower Thirds', zIndex: 10 });

// Elements
await api.createElement(channelId, { name: 'Speaker', moduleId: 1, layerId: 2, config: {} });
await api.reorderElements(channelId, [{ id: 1, sortOrder: 0 }, { id: 2, sortOrder: 1 }]);

// Assets
await api.uploadAsset(formData);
await api.deleteAsset(assetId);
```

### useEngineWs

WebSocket client for real-time state updates.

```ts
const ws = useEngineWs();

ws.subscribe(workspaceId, channelId);

// Reactive state
watch(ws.channelState, (state) => {
  // full ChannelState, updated on every state:init and state:update
});

watch(ws.status, (s) => {
  // 'connecting' | 'connected' | 'disconnected'
});
```

The client auto-reconnects with a 2-second timeout on disconnect.

### useAssetUrl

Computes the URL for serving an asset file.

```ts
const url = useAssetUrl(workspaceId, assetId);
// → '/api/workspaces/1/assets/42/file'
```

## Layouts

| Layout | Usage |
|--------|-------|
| `default` | Standard app pages with header |
| `marketing` | Landing page |
| `overlay` | Overlay output -- transparent background, no UI chrome, full viewport |

## OverlayHost component

The core component used by all overlay routes (`/o/...`).

Responsibilities:
1. Fetches workspace, channel, layer, element, and module metadata via the API.
2. Subscribes to the WebSocket for live `ChannelState` updates.
3. Dynamically loads module Vue components using the registry (`moduleComponents` map with `defineAsyncComponent`). Each module is code-split.
4. Passes `ModuleComponentProps` to each rendered module.
5. Injects workspace theme tokens as CSS variables on the root element.

Accepts optional filter props (`filterLayerId`, `filterElementId`) for layer-only and element-only overlay views.

## Server

### API routes

All API routes are thin wrappers that delegate to `engine-core` functions. They follow Nitro's file-based routing convention with method suffixes (`.get.ts`, `.post.ts`, `.put.ts`, `.delete.ts`).

Engine control routes (`take.post.ts`, `clear.post.ts`, `action.post.ts`) also call `broadcastToChannel()` to push state updates over WebSocket after mutating state.

### Utilities

- **`useDb()`** -- Singleton database connection. Creates the SQLite database and runs migrations on first call.
- **`ws-connections.ts`** -- Tracks WebSocket peer connections mapped to `{ workspaceId, channelId }`. Provides `addWsConnection()`, `removeWsConnection()`, and `broadcastToChannel()`.

### Plugins

- **`register-modules.ts`** -- Runs on server startup, imports all manifests from `packages/modules`, and upserts them into the database.

## UI stack

- **PrimeVue** for UI components (buttons, dialogs, forms, data tables).
- **Tailwind CSS v4** for layout utilities. Used only in `/app` control surfaces.
- **Iconify** with Lucide and Simple Icons icon sets.
- **Dark mode** supported via PrimeVue's `p-dark` class.
