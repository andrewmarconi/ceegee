# Architecture

CeeGee is a monorepo managed by pnpm workspaces. It has one application and two shared packages.

## Monorepo layout

```
ceegee/
├── apps/
│   └── engine-ui/          # Nuxt 4 application (UI + API + WebSocket)
├── packages/
│   ├── engine-core/        # Database, types, CRUD, engine logic (pure TS)
│   └── modules/            # Graphics module components + manifests
├── docs/                   # Documentation
├── pnpm-workspace.yaml
└── package.json            # Root scripts
```

## Package responsibilities

### apps/engine-ui

The single Nuxt 4 application that serves everything:

- **`/app`** routes -- Workspace hub, Producer UI, Operator UI.
- **`/o`** routes -- Overlay output pages for OBS Browser Source.
- **`/api`** routes -- REST API implemented as Nitro server routes.
- **`/ws`** -- WebSocket endpoint for real-time state sync.

Uses `engine-core` for all database operations and `modules` for component rendering and manifest data.

### packages/engine-core

Framework-agnostic TypeScript library. No Vue, no Nuxt -- pure Node/TS.

- **Database layer**: Drizzle ORM schema + migrations for SQLite (better-sqlite3).
- **CRUD functions**: Create/read/update/delete for all entities (workspaces, channels, layers, elements, assets, modules, runtime state).
- **Engine logic**: `take()`, `clear()`, `elementAction()`, `buildChannelState()`.
- **Types**: All shared TypeScript types (`Workspace`, `Channel`, `Layer`, `Element`, `ModuleManifest`, `ChannelState`, `EngineEvent`, etc.).

### packages/modules

Built-in overlay graphics modules. Each module consists of:

- A **manifest** (`ModuleManifest`) describing its config schema, actions, and animation hooks.
- A **Vue component** that renders the overlay graphic with GSAP animations.

Modules are auto-registered into the database at engine startup.

## Data flow

```
Producer UI                Operator UI               OBS Browser Source
     │                          │                           │
     │  CRUD (REST API)         │  take/clear (REST API)    │
     ▼                          ▼                           │
┌─────────────────────────────────────────┐                 │
│           Nitro API Routes              │                 │
│  (thin wrappers around engine-core)     │                 │
└───────────────┬─────────────────────────┘                 │
                │                                           │
                ▼                                           │
┌─────────────────────────────────────────┐                 │
│           engine-core                   │                 │
│  SQLite (Drizzle) + in-memory state     │                 │
└───────────────┬─────────────────────────┘                 │
                │                                           │
                │  broadcastToChannel()                     │
                ▼                                           │
┌─────────────────────────────────────────┐                 │
│        WebSocket (/ws)                  │◄────────────────┘
│  state:init, state:update events        │   subscribe on connect
└─────────────────────────────────────────┘
```

1. **Producers** build the show structure via REST API (channels, layers, elements, assets).
2. **Operators** control the live show by calling `take`/`clear`/`action` endpoints.
3. The engine updates state in SQLite and broadcasts a full `ChannelState` replacement over WebSocket.
4. **Overlay clients** (OBS Browser Source pages) receive the state update and render module components accordingly, driving GSAP animations based on visibility changes.

## Key design decisions

- **No slugs**: All entities use numeric auto-increment IDs. URLs are internal, not public-facing.
- **Full state replacement**: WebSocket `state:update` events send the complete `ChannelState`. Clients replace their local state entirely -- no merge logic.
- **Module auto-registration**: On startup, a Nitro plugin scans all manifests from `packages/modules` and upserts them into the `modules` table.
- **Single deployment**: MVP runs as a single Nuxt/Node process. No auth, no multi-tenancy. Designed for trusted LAN/VPN environments.
- **Tailwind for UI only**: Tailwind CSS is used in the `/app` control surfaces. Overlay pages (`/o`) use scoped CSS with CSS variables driven by workspace theme tokens.

## Technology stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js (LTS) + TypeScript |
| Web framework | Nuxt 4 + Vue 3 |
| Database | SQLite (better-sqlite3) + Drizzle ORM |
| Real-time | WebSocket (Nitro built-in) |
| Animation | GSAP |
| UI framework | PrimeVue + Tailwind CSS v4 |
| Icons | Iconify (Lucide + Simple Icons) |
| Build | Vite (via Nuxt) |
| Monorepo | pnpm workspaces |
| Testing | Vitest |
