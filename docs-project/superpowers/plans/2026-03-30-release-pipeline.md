# Automated Release Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create an interactive release script that handles version bump, changelog generation, PR to main, and post-merge publishing to GitHub Releases and Docker Hub.

**Architecture:** A single bash script (`scripts/release.sh`) split into helper functions for each phase. It reuses the existing `scripts/docker-build.sh` for Docker tagging/push. The script is built incrementally — pre-flight checks first, then each phase layered on.

**Tech Stack:** Bash, gh CLI, git, pnpm, Docker

---

### Task 1: Create release script with pre-flight checks

**Files:**
- Create: `scripts/release.sh`

- [ ] **Step 1: Create the script with pre-flight checks**

Create `scripts/release.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# CeeGee Release Script
# ============================================================

REPO="andrewmarconi/ceegee"
DOCKER_REPO="andrew559labs/ceegee"

# -- Colors --
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()  { echo -e "${CYAN}[info]${NC} $1"; }
ok()    { echo -e "${GREEN}[ok]${NC} $1"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $1"; }
fail()  { echo -e "${RED}[fail]${NC} $1"; exit 1; }

# ============================================================
# Pre-flight checks
# ============================================================

preflight() {
  info "Running pre-flight checks..."

  # Must be on develop branch
  local branch
  branch=$(git branch --show-current)
  [[ "$branch" == "develop" ]] || fail "Must be on 'develop' branch (currently on '$branch')"

  # Working tree must be clean
  if [[ -n $(git status --porcelain) ]]; then
    fail "Working tree is not clean. Commit or stash changes first."
  fi

  # gh CLI must be authenticated
  gh auth status &>/dev/null || fail "gh CLI is not authenticated. Run 'gh auth login' first."

  # docker must be available
  command -v docker &>/dev/null || fail "docker is not installed or not in PATH."

  ok "Pre-flight checks passed"
}

# ============================================================
# Step 1: Verify compliance
# ============================================================

verify_compliance() {
  info "Running lint..."
  pnpm -r lint || fail "Lint failed. Fix errors before releasing."
  ok "Lint passed"

  info "Running typecheck..."
  pnpm --filter engine-ui typecheck || fail "Typecheck failed. Fix errors before releasing."
  ok "Typecheck passed"
}

# ============================================================
# Step 2: Version bump
# ============================================================

bump_version() {
  local current_version
  current_version=$(node -p "require('./package.json').version")
  info "Current version: ${current_version}"

  echo ""
  echo -e "Select release type:"
  echo -e "  ${CYAN}1${NC}) patch  (bug fixes)"
  echo -e "  ${CYAN}2${NC}) minor  (new features)"
  echo -e "  ${CYAN}3${NC}) major  (breaking changes)"
  echo ""

  local choice
  read -rp "Enter choice [1/2/3]: " choice

  local release_type
  case "$choice" in
    1) release_type="patch" ;;
    2) release_type="minor" ;;
    3) release_type="major" ;;
    *) fail "Invalid choice: $choice" ;;
  esac

  # Parse semver and bump
  local major minor patch
  IFS='.' read -r major minor patch <<< "$current_version"

  case "$release_type" in
    patch) patch=$((patch + 1)) ;;
    minor) minor=$((minor + 1)); patch=0 ;;
    major) major=$((major + 1)); minor=0; patch=0 ;;
  esac

  NEW_VERSION="${major}.${minor}.${patch}"
  info "Bumping version: ${current_version} → ${NEW_VERSION} (${release_type})"

  # Update package.json
  local tmp
  tmp=$(mktemp)
  node -e "
    const pkg = require('./package.json');
    pkg.version = '${NEW_VERSION}';
    require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
  "

  git add package.json
  git commit -m "chore(release): bump version to ${NEW_VERSION}"
  ok "Version bumped to ${NEW_VERSION}"
}

# ============================================================
# Step 3: Generate changelog
# ============================================================

generate_changelog() {
  info "Generating changelog for v${NEW_VERSION}..."

  local last_tag
  last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

  local range
  if [[ -n "$last_tag" ]]; then
    range="${last_tag}..HEAD"
  else
    range="HEAD"
  fi

  # Collect commits
  local features="" fixes="" other=""

  while IFS= read -r line; do
    # Skip empty lines and the version bump commit we just made
    [[ -z "$line" ]] && continue
    [[ "$line" == *"chore(release): bump version"* ]] && continue

    if [[ "$line" =~ ^feat ]]; then
      features+="- ${line}\n"
    elif [[ "$line" =~ ^fix ]]; then
      fixes+="- ${line}\n"
    else
      other+="- ${line}\n"
    fi
  done < <(git log "$range" --pretty=format:"%s" --no-merges 2>/dev/null)

  # Build changelog section
  local date_str
  date_str=$(date +%Y-%m-%d)

  local section="## v${NEW_VERSION} (${date_str})\n"

  if [[ -n "$features" ]]; then
    section+="\n### Features\n${features}"
  fi
  if [[ -n "$fixes" ]]; then
    section+="\n### Bug Fixes\n${fixes}"
  fi
  if [[ -n "$other" ]]; then
    section+="\n### Other\n${other}"
  fi

  # Save for later use in PR body and release
  CHANGELOG_SECTION="$section"

  # Prepend to CHANGELOG.md
  if [[ -f CHANGELOG.md ]]; then
    local existing
    existing=$(cat CHANGELOG.md)
    echo -e "${section}\n${existing}" > CHANGELOG.md
  else
    echo -e "# Changelog\n\n${section}" > CHANGELOG.md
  fi

  git add CHANGELOG.md
  git commit -m "chore(release): generate changelog for v${NEW_VERSION}"
  ok "Changelog generated"
}

# ============================================================
# Step 4: Create PR
# ============================================================

create_release_pr() {
  info "Pushing develop to origin..."
  git push origin develop

  info "Creating PR: develop → main..."

  PR_URL=$(gh pr create \
    --base main \
    --head develop \
    --title "Release v${NEW_VERSION}" \
    --body "$(echo -e "${CHANGELOG_SECTION}")")

  ok "PR created: ${PR_URL}"
}

# ============================================================
# Step 5: Wait for PR merge
# ============================================================

wait_for_merge() {
  echo ""
  echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
  echo -e "${YELLOW}  PR created at: ${PR_URL}${NC}"
  echo -e "${YELLOW}  Review and merge it, then press Enter to check.${NC}"
  echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
  echo ""

  while true; do
    read -rp "Press Enter to check PR status..."

    local state
    state=$(gh pr view --json state --jq '.state' 2>/dev/null || echo "UNKNOWN")

    if [[ "$state" == "MERGED" ]]; then
      ok "PR is merged!"
      break
    elif [[ "$state" == "CLOSED" ]]; then
      fail "PR was closed without merging. Aborting release."
    else
      warn "PR state: ${state}. Not yet merged."
    fi
  done
}

# ============================================================
# Step 6: Tag release on main
# ============================================================

tag_release() {
  info "Syncing main branch..."
  git checkout main
  git pull origin main

  info "Creating tag v${NEW_VERSION}..."
  git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}"
  git push origin "v${NEW_VERSION}"
  ok "Tag v${NEW_VERSION} pushed"

  info "Returning to develop..."
  git checkout develop
  git pull origin develop
}

# ============================================================
# Step 7: Build artifacts
# ============================================================

build_artifacts() {
  info "Building application..."
  pnpm run build

  TARBALL="ceegee-v${NEW_VERSION}.tar.gz"
  info "Creating release tarball: ${TARBALL}"
  tar -czf "${TARBALL}" -C apps/engine-ui .output/
  ok "Tarball created: ${TARBALL}"
}

# ============================================================
# Step 8: GitHub Release
# ============================================================

create_github_release() {
  info "Creating GitHub Release v${NEW_VERSION}..."

  local body
  body=$(cat <<RELEASE_EOF
$(echo -e "${CHANGELOG_SECTION}")

## Docker

Docker image available at:
- \`${DOCKER_REPO}:${NEW_VERSION}\`
- \`${DOCKER_REPO}:${NEW_VERSION}-$(git rev-parse --short HEAD)\`
- \`${DOCKER_REPO}:latest\`

Pull: \`docker pull ${DOCKER_REPO}:${NEW_VERSION}\`
RELEASE_EOF
)

  RELEASE_URL=$(gh release create "v${NEW_VERSION}" \
    --title "v${NEW_VERSION}" \
    --notes "$body" \
    "${TARBALL}")

  ok "GitHub Release created: ${RELEASE_URL}"
}

# ============================================================
# Step 9: Docker build and push
# ============================================================

docker_publish() {
  info "Building and pushing Docker image..."
  ./scripts/docker-build.sh --push
  ok "Docker image pushed to ${DOCKER_REPO}"
}

# ============================================================
# Step 10: Cleanup and summary
# ============================================================

cleanup() {
  if [[ -f "${TARBALL:-}" ]]; then
    rm -f "${TARBALL}"
  fi

  echo ""
  echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  Release v${NEW_VERSION} complete!${NC}"
  echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
  echo ""
  echo -e "  GitHub Release: ${RELEASE_URL:-N/A}"
  echo -e "  Docker Hub:     ${DOCKER_REPO}:${NEW_VERSION}"
  echo ""
}

# ============================================================
# Main
# ============================================================

# Global state
NEW_VERSION=""
CHANGELOG_SECTION=""
PR_URL=""
TARBALL=""
RELEASE_URL=""

echo ""
echo -e "${CYAN}CeeGee Release Pipeline${NC}"
echo -e "${CYAN}═══════════════════════${NC}"
echo ""

# Phase 1: Prepare
preflight
verify_compliance
bump_version
generate_changelog
create_release_pr
wait_for_merge

# Phase 2: Publish
tag_release
build_artifacts
create_github_release
docker_publish
cleanup
```

- [ ] **Step 2: Make the script executable**

Run: `chmod +x scripts/release.sh`

- [ ] **Step 3: Verify syntax**

Run: `bash -n scripts/release.sh`

Expected: No output (syntax is valid).

- [ ] **Step 4: Commit**

```bash
git add scripts/release.sh
git commit -m "feat: add interactive release pipeline script (#44)"
```

---

### Task 2: Verify the script runs through pre-flight checks

- [ ] **Step 1: Test pre-flight on develop with clean tree**

Run: `bash -x scripts/release.sh 2>&1 | head -20`

Expected: Pre-flight checks pass (on develop, clean tree, gh authenticated). The script will proceed to lint — you can Ctrl+C after seeing `[ok] Pre-flight checks passed`.

- [ ] **Step 2: Test pre-flight failure on wrong branch**

Run: `git checkout -b test-preflight && bash scripts/release.sh 2>&1; git checkout develop && git branch -D test-preflight`

Expected: Script fails with `[fail] Must be on 'develop' branch (currently on 'test-preflight')`.

- [ ] **Step 3: Commit any fixes**

If any issues found, fix and commit with descriptive message referencing #44.

---

### Task 3: Final integration verification

- [ ] **Step 1: Full build check**

Run: `pnpm -w run build`
Expected: Build succeeds.

- [ ] **Step 2: Verify script is executable and valid**

Run: `ls -la scripts/release.sh && bash -n scripts/release.sh`

Expected: Script shows `rwxr-xr-x` permissions and no syntax errors.

- [ ] **Step 3: Review the complete script**

Read through `scripts/release.sh` and verify:
- All 10 steps from the spec are present
- Pre-flight checks cover: branch, clean tree, gh auth, docker
- Version bump: prompts for patch/minor/major, does semver math
- Changelog: parses conventional commits, categorizes feat/fix/other
- PR: creates develop → main with changelog body
- Merge wait: loops until merged
- Tag: creates annotated tag on main, pushes
- Artifacts: builds tarball of .output/
- GitHub Release: creates release with changelog + tarball
- Docker: calls existing docker-build.sh --push
- Cleanup: removes tarball, prints summary

- [ ] **Step 4: Commit any fixes**

If any issues found, fix and commit with descriptive message referencing #44.
