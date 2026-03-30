# Docker Image Build Process Design

**Issue:** #43
**Date:** 2026-03-30

## Goal

Create a production-ready Docker image for the CeeGee application using a multi-stage build, optimized for small image size and fast rebuilds.

## Design Decisions

- **Base image:** `node:22-slim` (Debian) — reliable native module compilation for better-sqlite3
- **Multi-stage build:** deps → build → runtime — keeps final image small, no source code or devDeps shipped
- **Volume for data:** `/app/data` declared as a VOLUME for SQLite DB, uploaded assets, and cached fonts
- **SQLite for now:** Database abstraction to PostgreSQL tracked separately (#45)

## Dockerfile Stages

### Stage 1: deps

Base: `node:22-slim`

- Install pnpm globally via corepack
- Copy workspace configuration: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- Copy all `package.json` files from `apps/` and `packages/` (preserving directory structure)
- Run `pnpm install --frozen-lockfile`
- This layer caches well — only busts when dependencies change

### Stage 2: build

Base: `node:22-slim`

- Copy `node_modules` from deps stage
- Copy full source code
- Run `pnpm run build` (builds the Nuxt app, outputs to `apps/engine-ui/.output/`)

### Stage 3: runtime

Base: `node:22-slim`

- Create a non-root user for security
- Copy `apps/engine-ui/.output/` from build stage (Nitro bundles all JS dependencies)
- Copy `packages/engine-core/drizzle/` from build stage (migration SQL files needed at startup)
- Copy the compiled `better-sqlite3` native addon from the build stage (avoids needing build tools in runtime)
- Set `NODE_ENV=production`
- Expose port 3000
- Declare `VOLUME /app/data`
- Entry: `node server/index.mjs`

## Volume: /app/data

All persistent data lives under `/app/data`:

| Path | Contents |
|------|----------|
| `/app/data/ceegee.db` | SQLite database (auto-created on first run) |
| `/app/data/ceegee.db-shm` | WAL shared memory (auto-managed) |
| `/app/data/ceegee.db-wal` | WAL write-ahead log (auto-managed) |
| `/app/data/assets/` | Uploaded media assets |
| `/app/data/fonts/` | Cached Google Fonts files |

Running the container:
```bash
docker run -p 3000:3000 -v ceegee-data:/app/data ceegee:latest
```

## .dockerignore

Excludes from the build context:

```
node_modules
.output
.nuxt
.nitro
.cache
dist
data/
.git
.worktrees
*.db
*.db-journal
*.db-wal
*.db-shm
.DS_Store
.env
.env.*
docs-project/
```

Keeps the build context small and prevents leaking secrets or local data into the image.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Set in Dockerfile |
| `PORT` | `3000` | Nitro server listen port |
| `NUXT_HOST` | `0.0.0.0` | Bind to all interfaces (required for Docker) |
