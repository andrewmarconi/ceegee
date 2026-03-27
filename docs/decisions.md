# Additional Decisions

## Tooling

- ORM: Drizzle
- WS Library: Nuxt/Nitro built-in support

## Data model

- **No slugs**: All entities are addressed by numeric auto-increment IDs. Slugs add generation/validation complexity for no benefit since URLs are internal (not public-facing). Names provide human readability.
- **Element ordering**: Elements have a `sort_order` field for ordering within a layer / rundown view.
- **Module registration**: Modules are auto-scanned from `packages/modules/` at engine startup and upserted into the `modules` DB table.

## MVP scope

- **Datasources deferred to v1.1+**: The full Datasource/Transform pipeline (HTTP polling, file watching, manual sources, streams, transform modules, element bindings) is deferred from MVP. In MVP, all display data lives in the Element's `config` JSON. This keeps the initial delivery focused on the core overlay engine, rendering, and operator workflow. See [future-development.md](future-development.md).

## Runtime

- **state:update semantics**: WebSocket `state:update` events send a full `ChannelState` replacement. Clients replace their local state entirely (no merge logic).
- **Asset resolution**: Modules resolve asset IDs to URLs via `GET /api/workspaces/:workspaceId/assets/:assetId/file`.
