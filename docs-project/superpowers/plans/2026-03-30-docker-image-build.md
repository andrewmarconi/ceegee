# Docker Image Build Process Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a production-ready Docker image for CeeGee with multi-stage builds, image tagging, and a convenience build script for pushing to Docker Hub (`andrew559labs/ceegee`).

**Architecture:** A multi-stage Dockerfile (deps → build → runtime) using `node:22-slim`. The `.output/` directory from Nuxt's node-server preset contains everything needed at runtime, including the better-sqlite3 native addon. A `.dockerignore` keeps the build context clean. A shell script handles version/SHA tagging and Docker Hub push.

**Tech Stack:** Docker, Node 22, pnpm, Nuxt/Nitro node-server preset

---

### Task 1: Create .dockerignore

**Files:**
- Create: `.dockerignore`

- [ ] **Step 1: Create the .dockerignore file**

Create `.dockerignore` in the project root:

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

- [ ] **Step 2: Commit**

```bash
git add .dockerignore
git commit -m "chore: add .dockerignore (#43)"
```

---

### Task 2: Create the Dockerfile

**Files:**
- Create: `Dockerfile`

- [ ] **Step 1: Create the Dockerfile**

Create `Dockerfile` in the project root:

```dockerfile
# ============================================================
# Stage 1: Install dependencies
# ============================================================
FROM node:22-slim AS deps

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /app

# Copy workspace config and lockfile first (layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all package.json files preserving directory structure
COPY apps/engine-ui/package.json apps/engine-ui/
COPY packages/engine-core/package.json packages/engine-core/
COPY packages/modules/package.json packages/modules/

# Install all dependencies (including devDeps needed for build)
RUN pnpm install --frozen-lockfile

# ============================================================
# Stage 2: Build the application
# ============================================================
FROM node:22-slim AS build

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/engine-ui/node_modules ./apps/engine-ui/node_modules
COPY --from=deps /app/packages/engine-core/node_modules ./packages/engine-core/node_modules
COPY --from=deps /app/packages/modules/node_modules ./packages/modules/node_modules

# Copy full source
COPY . .

# Build the Nuxt app (outputs to apps/engine-ui/.output/)
RUN pnpm run build

# ============================================================
# Stage 3: Production runtime
# ============================================================
FROM node:22-slim AS runtime

WORKDIR /app

# Create non-root user
RUN groupadd --system ceegee && useradd --system --gid ceegee ceegee

# Copy the built Nuxt output (includes bundled node_modules with better-sqlite3 native addon)
COPY --from=build /app/apps/engine-ui/.output ./

# Copy drizzle migrations (needed at startup for auto-migration)
COPY --from=build /app/packages/engine-core/drizzle ./packages/engine-core/drizzle

# Create data directory and set ownership
RUN mkdir -p /app/data && chown -R ceegee:ceegee /app /app/data

ENV NODE_ENV=production
ENV NUXT_HOST=0.0.0.0

EXPOSE 3000

VOLUME /app/data

USER ceegee

CMD ["node", "server/index.mjs"]
```

- [ ] **Step 2: Verify the Dockerfile builds successfully**

Run: `docker build -t ceegee:test .`

Expected: Build completes without errors. All three stages succeed.

Note: This may take a few minutes on the first run due to dependency installation.

- [ ] **Step 3: Verify the container starts**

Run: `docker run --rm -p 3000:3000 -v ceegee-test:/app/data ceegee:test`

Expected: Server starts and logs output. Open `http://localhost:3000` in a browser — the app should load.

Press Ctrl+C to stop.

- [ ] **Step 4: Commit**

```bash
git add Dockerfile
git commit -m "feat: add multi-stage Dockerfile for production builds (#43)"
```

---

### Task 3: Create the build and push convenience script

**Files:**
- Create: `scripts/docker-build.sh`

- [ ] **Step 1: Create the scripts directory and build script**

Create `scripts/docker-build.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

DOCKER_REPO="andrew559labs/ceegee"

# Read version from root package.json
VERSION=$(node -p "require('./package.json').version")
SHA=$(git rev-parse --short HEAD)

echo "Building ${DOCKER_REPO}"
echo "  Version: ${VERSION}"
echo "  SHA:     ${SHA}"
echo ""

# Build with all three tags
docker build \
  -t "${DOCKER_REPO}:${VERSION}" \
  -t "${DOCKER_REPO}:${VERSION}-${SHA}" \
  -t "${DOCKER_REPO}:latest" \
  .

echo ""
echo "Build complete. Tagged:"
echo "  ${DOCKER_REPO}:${VERSION}"
echo "  ${DOCKER_REPO}:${VERSION}-${SHA}"
echo "  ${DOCKER_REPO}:latest"
echo ""

# Push if --push flag is provided
if [[ "${1:-}" == "--push" ]]; then
  echo "Pushing to Docker Hub..."
  docker push "${DOCKER_REPO}:${VERSION}"
  docker push "${DOCKER_REPO}:${VERSION}-${SHA}"
  docker push "${DOCKER_REPO}:latest"
  echo "Push complete."
else
  echo "Run with --push to push to Docker Hub."
fi
```

- [ ] **Step 2: Make the script executable**

Run: `chmod +x scripts/docker-build.sh`

- [ ] **Step 3: Verify the script runs**

Run: `./scripts/docker-build.sh`

Expected: Builds the image with three tags. Output shows the tagged image names. Does NOT push (no `--push` flag).

- [ ] **Step 4: Commit**

```bash
git add scripts/docker-build.sh
git commit -m "feat: add docker-build.sh convenience script with tagging (#43)"
```

---

### Task 4: Add version field to root package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add version field**

The root `package.json` currently has no `version` field. The build script reads it for tagging. Add `"version": "0.1.0"` to the root `package.json`:

In `package.json`, add the version field after the `"name"` field:

```json
{
  "name": "ceegee",
  "version": "0.1.0",
  "private": true,
```

- [ ] **Step 2: Verify the script reads the version**

Run: `node -p "require('./package.json').version"`

Expected: `0.1.0`

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add version field to root package.json (#43)"
```

---

### Task 5: Final verification

- [ ] **Step 1: Full Docker build with tagging script**

Run: `./scripts/docker-build.sh`

Expected: Builds successfully with tags:
- `andrew559labs/ceegee:0.1.0`
- `andrew559labs/ceegee:0.1.0-<sha>`
- `andrew559labs/ceegee:latest`

- [ ] **Step 2: Run the tagged image**

Run: `docker run --rm -p 3000:3000 -v ceegee-verify:/app/data andrew559labs/ceegee:latest`

Expected: App starts, accessible at `http://localhost:3000`. Database is created in the volume. Ctrl+C to stop.

- [ ] **Step 3: Verify volume persistence**

Run the container again with the same volume:

```bash
docker run --rm -p 3000:3000 -v ceegee-verify:/app/data andrew559labs/ceegee:latest
```

Expected: App starts with the previously created database — no data loss.

- [ ] **Step 4: Check image size**

Run: `docker images andrew559labs/ceegee --format "{{.Tag}}\t{{.Size}}"`

Expected: Image should be under ~300MB.

- [ ] **Step 5: Clean up test volumes**

```bash
docker volume rm ceegee-test ceegee-verify 2>/dev/null || true
```

- [ ] **Step 6: Commit any fixes**

If any issues found, fix and commit with descriptive message referencing #43.
