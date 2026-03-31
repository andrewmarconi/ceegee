# Docker node:25-slim Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Docker base image from `node:22-slim` to `node:25-slim` and remediate any fixable vulnerabilities.

**Architecture:** Three `FROM` lines in the existing multi-stage Dockerfile change from `node:22-slim` to `node:25-slim`. After building, scan with `docker scout cves` and fix any fixable findings. Verify the app builds and runs.

**Tech Stack:** Docker, Node.js 25, pnpm, better-sqlite3 (native addon)

---

### Task 1: Update Dockerfile Base Images

**Files:**
- Modify: `Dockerfile:4,24,45`

- [ ] **Step 1: Update all three FROM lines**

Change each `node:22-slim` reference to `node:25-slim`:

```dockerfile
# Line 4 (deps stage)
FROM node:25-slim AS deps

# Line 24 (build stage)
FROM node:25-slim AS build

# Line 45 (runtime stage)
FROM node:25-slim AS runtime
```

- [ ] **Step 2: Commit**

```bash
git add Dockerfile
git commit -m "feat: upgrade Docker base image from node:22-slim to node:25-slim (#47)"
```

### Task 2: Build the Image

- [ ] **Step 1: Build with docker buildx**

```bash
docker buildx build -t ceegee:node25-test .
```

Expected: Build completes successfully. Watch for:
- `corepack enable` and `corepack prepare pnpm@10.32.1` succeed
- `pnpm install --frozen-lockfile` succeeds (better-sqlite3 native addon compiles)
- `pnpm run build` succeeds (Nuxt build completes)

If the build fails on better-sqlite3 compilation, check if `node:25-slim` is missing build tools (`python3`, `make`, `g++`). The deps stage may need:
```dockerfile
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
```
Add this before `pnpm install` in the deps stage only if needed.

### Task 3: Scan for Vulnerabilities

- [ ] **Step 1: Run docker scout**

```bash
docker scout cves ceegee:node25-test
```

Review the output. Categorize findings:
- **Fixable:** Vulnerabilities with available patches (apt package upgrades, etc.)
- **Unfixable:** Upstream CVEs with no available fix

- [ ] **Step 2: If fixable vulnerabilities exist, add apt upgrade to runtime stage**

If the scan shows fixable OS-level vulnerabilities, add an `apt-get upgrade` to the runtime stage in `Dockerfile`, after the `FROM` line and before the `RUN groupadd` line:

```dockerfile
FROM node:25-slim AS runtime

# Patch known vulnerabilities in base image packages
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*

WORKDIR /app
```

- [ ] **Step 3: If fixes were applied, rebuild and re-scan**

```bash
docker buildx build -t ceegee:node25-test .
docker scout cves ceegee:node25-test
```

Repeat until no fixable vulnerabilities remain.

- [ ] **Step 4: Commit any vulnerability fixes**

```bash
git add Dockerfile
git commit -m "fix: patch fixable vulnerabilities in Docker runtime image (#47)"
```

### Task 4: Verify Application Runs

- [ ] **Step 1: Start the container**

```bash
docker run --rm -p 3000:3000 -v ceegee-test-data:/app/data ceegee:node25-test
```

Expected: Server starts and logs indicate it's listening on `0.0.0.0:3000`.

- [ ] **Step 2: Test basic connectivity**

In a separate terminal:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

Expected: `200` (or `302` if there's a redirect — either confirms the server is responding).

- [ ] **Step 3: Stop the container and clean up test volume**

Press Ctrl+C to stop the container, then:

```bash
docker volume rm ceegee-test-data
```

### Task 5: Update Existing Design Spec

**Files:**
- Modify: `docs-project/superpowers/specs/2026-03-30-docker-image-build-design.md`

- [ ] **Step 1: Update all references to node:22-slim**

Replace every occurrence of `node:22-slim` with `node:25-slim` in the existing Docker image build design spec (lines referencing the base image in stages 1, 2, and 3).

- [ ] **Step 2: Commit**

```bash
git add docs-project/superpowers/specs/2026-03-30-docker-image-build-design.md
git commit -m "docs: update Docker build spec to reflect node:25-slim base image (#47)"
```
