# Automated Release Pipeline Design

**Issue:** #44
**Date:** 2026-03-30

## Goal

Create a single interactive CLI script (`scripts/release.sh`) that handles the full release lifecycle: code verification, version bump, changelog generation, PR to main, and post-merge publishing to GitHub Releases and Docker Hub.

## Design Decisions

- **Single interactive script** — not CI-driven; the developer runs it locally and stays in the loop
- **Pause-and-resume for PR gate** — script pauses after creating PR, loops until merged
- **Conventional commits for changelog** — parses `feat:`, `fix:`, etc. prefixes to categorize entries
- **Integrates existing `docker-build.sh`** — reuses the tagging/push logic from #43
- **Release artifact** — `.tar.gz` of `.output/` attached to GitHub Release for non-Docker users

## Prerequisites

The script requires:
- `gh` CLI (authenticated)
- `docker` with buildx (for multi-platform push)
- Clean working tree on `develop` branch
- Docker Hub credentials configured (`docker login`)

## Script Flow

### Phase 1: Prepare (pre-PR)

**Step 1: Pre-flight checks**
- Verify on `develop` branch
- Verify working tree is clean (no uncommitted changes)
- Verify `gh` is authenticated

**Step 2: Verify compliance**
- Run `pnpm -r lint` (eslint via @nuxt/eslint module)
- Run `pnpm --filter engine-ui typecheck` (vue-tsc via nuxt typecheck)
- Abort on any failure with clear error output

**Step 3: Version bump**
- Prompt user: `Select release type [patch/minor/major]:`
- Read current version from `package.json`
- Compute new version using semver arithmetic (no npm dependency — pure bash)
- Update `package.json` with new version
- Commit: `chore(release): bump version to <version>`

**Step 4: Generate changelog**
- Find the last git tag (`git describe --tags --abbrev=0`), or use initial commit if no tags
- Collect all commits since that tag
- Parse conventional commit prefixes:
  - `feat` → **Features**
  - `fix` → **Bug Fixes**
  - Everything else → **Other**
- Prepend a new version section to `CHANGELOG.md` (create the file if it doesn't exist)
- Commit: `chore(release): generate changelog for <version>`

**Step 5: Create PR**
- Push `develop` to origin
- Create PR from `develop` → `main` using `gh pr create`
- PR title: `Release v<version>`
- PR body: the changelog section for this version
- Print PR URL

**Step 6: Pause**
- Print: `PR created at <url>. Review and merge it, then press Enter to check...`
- On Enter, check if PR is merged via `gh pr view --json state`
- If not merged: print `PR not yet merged. Press Enter to check again...` and loop
- If merged: continue to Phase 2

### Phase 2: Publish (post-merge)

**Step 7: Sync main and tag**
- `git checkout main && git pull`
- Create annotated tag: `git tag -a v<version> -m "Release v<version>"`
- Push tag: `git push origin v<version>`
- Return to develop: `git checkout develop && git pull`

**Step 8: Build artifacts**
- Run `pnpm run build`
- Create tarball: `tar -czf ceegee-v<version>.tar.gz -C apps/engine-ui .output/`

**Step 9: GitHub Release**
- Use `gh release create v<version>` with:
  - Title: `v<version>`
  - Body: changelog section + Docker Hub reference note
  - Attach: `ceegee-v<version>.tar.gz`

**Step 10: Docker build and push**
- Call `./scripts/docker-build.sh --push`
- This builds multi-platform (amd64 + arm64) and pushes to `andrew559labs/ceegee` with version/SHA/latest tags

**Step 11: Cleanup**
- Remove the local tarball
- Print summary: version released, GitHub Release URL, Docker Hub tags

## Changelog Format

```markdown
## v0.2.0 (2026-03-30)

### Features
- feat(operator): add lock toggle to LayerFilter (#40)
- feat(ws): add server-side heartbeat ping every 15s (#11)

### Bug Fixes
- fix(core): handle null runtime state on clear

### Other
- chore: add .dockerignore (#43)
```

## GitHub Release Body

```markdown
## What's Changed

<changelog section>

## Docker

Docker image available at:
- `andrew559labs/ceegee:<version>`
- `andrew559labs/ceegee:<version>-<sha>`
- `andrew559labs/ceegee:latest`

Pull: `docker pull andrew559labs/ceegee:<version>`
```

## Error Handling

- **Pre-flight failures** (wrong branch, dirty tree, no gh auth) → abort with clear message before any changes
- **Lint/typecheck failures** → abort before version bump, nothing committed
- **PR creation failure** → version and changelog are committed on develop but not yet pushed; user can retry or `git reset HEAD~2` to undo
- **Docker push failure** → print error but don't roll back (GitHub Release is already published); user can retry manually via `./scripts/docker-build.sh --push`
