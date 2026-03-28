# Getting Started

## Prerequisites

- **Node.js** LTS (v20+)
- **pnpm** (v9+)

## Clone and install

```bash
git clone <repo-url> ceegee
cd ceegee
pnpm install
```

pnpm will install dependencies for all workspace packages (`apps/engine-ui`, `packages/engine-core`, `packages/modules`).

## Run the dev server

```bash
pnpm dev
```

This starts the Nuxt 4 dev server (with HMR) at `http://localhost:3000`.

On first startup the engine will:

1. Create the SQLite database at `apps/engine-ui/data/ceegee.db` (with WAL mode and foreign keys enabled).
2. Run Drizzle migrations automatically.
3. Register all built-in modules (lower-third, bug, billboard, clock, countdown) into the `modules` table.

## Verify it works

- Open `http://localhost:3000` to see the landing page.
- Click **Launch App** to reach the workspace hub at `/app`.
- Create a workspace, then navigate to its Producer or Operator views.

## Project scripts

All scripts are defined at the monorepo root and forwarded via pnpm filters:

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the Nuxt dev server (`apps/engine-ui`) |
| `pnpm build` | Production build |
| `pnpm test` | Run all tests across packages |
| `pnpm lint` | Lint all packages |

### Package-level scripts

You can also run scripts directly within a package:

```bash
# Run engine-core tests only
cd packages/engine-core
pnpm test

# Typecheck the Nuxt app
cd apps/engine-ui
pnpm typecheck
```

## Database

The SQLite database lives at `apps/engine-ui/data/ceegee.db`. To reset it, stop the server and delete the file -- it will be recreated on next startup.

Migrations are managed by Drizzle and live in `packages/engine-core/drizzle/`. To generate a new migration after changing the schema:

```bash
cd packages/engine-core
pnpm drizzle-kit generate
```

## Next steps

- [Architecture](architecture.md) -- understand the monorepo layout and data flow.
- [Engine Core](engine-core.md) -- database schema, CRUD functions, and engine logic.
- [Modules](modules.md) -- how to create a new graphics module.
