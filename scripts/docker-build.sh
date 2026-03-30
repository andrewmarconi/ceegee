#!/usr/bin/env bash
set -euo pipefail

DOCKER_REPO="andrew559labs/ceegee"
PLATFORMS="linux/amd64,linux/arm64"

# Read version from root package.json
VERSION=$(node -p "require('./package.json').version")
SHA=$(git rev-parse --short HEAD)

echo "Building ${DOCKER_REPO}"
echo "  Version:   ${VERSION}"
echo "  SHA:       ${SHA}"
echo "  Platforms: ${PLATFORMS}"
echo ""

if [[ "${1:-}" == "--push" ]]; then
  # Multi-platform build + push (requires buildx)
  echo "Building multi-platform and pushing to Docker Hub..."
  docker buildx build \
    --platform "${PLATFORMS}" \
    -t "${DOCKER_REPO}:${VERSION}" \
    -t "${DOCKER_REPO}:${VERSION}-${SHA}" \
    -t "${DOCKER_REPO}:latest" \
    --push \
    .
  echo ""
  echo "Pushed:"
  echo "  ${DOCKER_REPO}:${VERSION}"
  echo "  ${DOCKER_REPO}:${VERSION}-${SHA}"
  echo "  ${DOCKER_REPO}:latest"
else
  # Local build (current platform only)
  docker build \
    -t "${DOCKER_REPO}:${VERSION}" \
    -t "${DOCKER_REPO}:${VERSION}-${SHA}" \
    -t "${DOCKER_REPO}:latest" \
    .
  echo ""
  echo "Built locally. Tagged:"
  echo "  ${DOCKER_REPO}:${VERSION}"
  echo "  ${DOCKER_REPO}:${VERSION}-${SHA}"
  echo "  ${DOCKER_REPO}:latest"
  echo ""
  echo "Run with --push for multi-platform build and push to Docker Hub."
fi
