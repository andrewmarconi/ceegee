# Docker Base Image Upgrade to node:25-slim

**Issue:** #47
**Date:** 2026-03-30

## Goal

Upgrade the Docker base image from `node:22-slim` to `node:25-slim` across all three Dockerfile stages to reduce image size and attack surface. Scan the resulting image for vulnerabilities and remediate any fixable findings.

## Changes

### Dockerfile Updates

Replace `node:22-slim` with `node:25-slim` in all three stages:

- **Stage 1 (deps):** `FROM node:25-slim AS deps`
- **Stage 2 (build):** `FROM node:25-slim AS build`
- **Stage 3 (runtime):** `FROM node:25-slim AS runtime`

Everything else in the Dockerfile stays unchanged:
- pnpm version (`10.32.1`) and corepack setup
- 3-stage build structure (deps -> build -> runtime)
- Non-root user (`ceegee`) creation
- Volume mount (`/app/data`)
- Environment variables (`NODE_ENV`, `NUXT_HOST`)
- Exposed port (3000)
- Entrypoint (`node server/index.mjs`)

### Vulnerability Scanning and Remediation

After building, scan with `docker scout cves` to identify vulnerabilities:

1. **Build the image:** `docker buildx build -t ceegee:node25-test .`
2. **Scan:** `docker scout cves ceegee:node25-test`
3. **Fix fixable vulnerabilities** — typically via:
   - Adding `apt-get upgrade` for system packages in the runtime stage
   - Pinning specific package versions if needed
4. **Document unfixable CVEs** — upstream/unfixed issues noted in the PR description with justification

### Verification

- Confirm the image builds successfully (better-sqlite3 native addon compiles against Node 25's N-API)
- Confirm the application starts and serves requests (`docker run -p 3000:3000 ceegee:node25-test`)

## Risk Notes

- Node 25 is the current release line, not LTS. The issue explicitly requests this version.
- `better-sqlite3` compiles a native addon during install. It supports Node 25's N-API version, but build success must be verified.

## Out of Scope

- Changing the multi-stage build structure
- Switching to a different base distribution (e.g., Alpine)
- Updating pnpm or other tooling versions
- Changes to `.dockerignore`
