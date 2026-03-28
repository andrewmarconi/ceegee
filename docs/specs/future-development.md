# Future Development

Features and capabilities deferred from MVP, organized by priority tier.

## v1.1 — Datasources and Transforms

The Datasource pipeline enables Elements to receive dynamic data from external sources instead of relying solely on static `config`.

### Datasource concept

A **Datasource** describes how raw content is fetched and transformed into a schema that Modules can consume.

Fields: `id`, `workspaceId`, `name`, `sourceType`, `sourceConfig`, `transformKey`, `transformConfig`, `outputSchemaJson`.

Source types:

- `http-poll` — polls an HTTP endpoint at a configurable interval (`url`, `intervalMs`, `headers`).
- `file` — watches a local file at a configurable interval (`path`, `intervalMs`).
- `manual` — operator-editable value, stored in memory with optional `initialValue`.
- `stream` — append-only log/chat style, referenced by `streamId`.

### Transform modules

Pluggable, code-authored modules that convert raw source data into a standardized shape matching a Module's `dataSchema`.

Each transform exports:

- `id` (stable key, stored as `transform_key` in DB).
- `label`, `description`.
- `configSchema` — JSON Schema for transform-specific configuration.
- `run(input, config)` — takes raw data + config, returns standardized output.

Transforms are code-based (in `packages/transforms/`). Datasources reference them by `transformKey`.

### Datasource → Element bindings

An `element_datasource_bindings` join table maps Datasource output fields to Module data fields via `fieldMap` (`Record<string, string>`). One Element can bind multiple Datasources.

### Data pipeline (runtime)

When Datasources are active, the engine runs this pipeline:

1. **Fetch** — engine-core polls/reads the source per `sourceConfig`.
2. **Transform** — raw data is passed through the `TransformModule.run()` function with the datasource's `transformConfig`.
3. **Map** — transformed output fields are mapped to Module data fields via each binding's `fieldMap`.
4. **Inject** — mapped data is delivered to the Module Vue component as a `data` prop (separate from `config`).
5. **Broadcast** — if data changes, the engine pushes a `state:update` to connected overlay clients.

Caching: transformed data is cached in memory per datasource. The cache is invalidated on the next poll/fetch cycle.

### Streams (chat/log style)

Append-only in-memory message streams with auto-trim (oldest messages dropped when buffer exceeds limit).

Fields: `streams` table (`id`, `workspaceId`, `name`) and `stream_messages` table (`id`, `streamId`, `ts`, `author`, `text`, `metadata`).

Future: webhook ingestion + moderation tools.

### Producer Data view

New route: `/app/:workspaceId/producer/data`

- Datasource list + CRUD.
- Editor: source type config, transform module selection + config (driven by `TransformModule.configSchema`).
- "Test" button: displays raw input and transformed output (matching `outputSchema`).
- Bindings overview: for each Datasource, show which Elements use it.

### Updated component props

When Datasources are active, `ModuleComponentProps` gains a `data` prop:

```ts
export type ModuleComponentProps = {
  workspace: Workspace;
  channel: Channel;
  layer: Layer;
  element: Element;
  config: unknown;
  data: unknown;              // from Datasource(s) via fieldMap — NEW in v1.1
  runtimeState: ElementRuntimeState;
};
```

### Database tables

See the "Deferred tables" sections in [schema-sqlite.md](schema-sqlite.md) and [schema-typescript.md](schema-typescript.md) for full DDL and type definitions.

### API endpoints

- `GET /api/workspaces/:workspaceId/datasources`
- `GET /api/workspaces/:workspaceId/datasources/:datasourceId`
- `POST /api/workspaces/:workspaceId/datasources`
- `PUT /api/workspaces/:workspaceId/datasources/:datasourceId`
- `DELETE /api/workspaces/:workspaceId/datasources/:datasourceId`
- `POST /api/workspaces/:workspaceId/datasources/:datasourceId/test` (run transform, return sample output)

***

## v1.2+ — Additional features

### Preview bus

Separate preview output channel allowing operators to see upcoming graphics before taking them live. Requires a parallel state bus and dedicated overlay routes.

### WebSocket reconnection and state re-sync

Overlay and app clients should automatically reconnect on WS disconnect and re-request `state:init` to recover. Critical for production broadcast reliability.

### Global hotkeys and hardware integration

- Keyboard shortcuts in Operator UI.
- Stream Deck integration via companion plugin or WebSocket.
- OSC (Open Sound Control) for integration with production switchers.

### Real-time data (webhooks, streaming APIs)

Push-based datasource types beyond polling:

- Webhook endpoints that receive data pushes.
- Streaming API connections (SSE, WebSocket to external services).

### Datasource moderation

Moderation and editing tools for chat/log style overlays — approve/reject/edit messages before they appear on screen.

### Workspace export/import

Clone workspace including Channels/Layers/Elements/Assets metadata (not raw asset files). Export as JSON, import into another deployment.

### Swappable database

Abstract data access layer to swap SQLite for Postgres or another DB if scaling/concurrency require it.

### Auth, roles, and multi-tenant security

User authentication, role-based access control (operator vs producer vs admin), and workspace-level permissions for multi-tenant deployments.

### CSS-for-TV package

Standalone NPM package (`@acme/tv-css`) providing:

- TV-oriented type scales and line-length recommendations.
- Utilities for safe areas and typical broadcast regions.
- Base classes for common overlay patterns (lower thirds, bugs, tickers, clocks).
- Animation presets coordinating with GSAP (shared naming for `enter`/`exit` hooks).
