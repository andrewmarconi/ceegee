# Docker Deployment Guide Design

**Issue:** #50 (parent: #48)
**Date:** 2026-03-30

## Goal

Create a user-facing documentation page that enables end users and administrators to deploy and operate CeeGee via Docker, using either plain Docker commands or Docker Compose.

## New File

`docs/user/60.docker-deployment.md` — numbered 60 to appear after OBS Setup (51) in the auto-generated sidebar.

## Sections

### 1. Quick Start

Three commands to get running: `docker pull`, `docker run` with named volume and port mapping. Show the expected output (server listening on port 3000).

- Image: `andrew559labs/ceegee:latest`
- Port: `3000`
- Volume: `ceegee-data:/app/data`

### 2. Docker Compose

Provide a complete `docker-compose.yml` with:
- Service definition referencing `andrew559labs/ceegee:latest`
- Named volume for `/app/data`
- Port mapping `3000:3000`
- `restart: unless-stopped` policy

Cover `docker compose up -d`, `docker compose down`, and `docker compose logs`.

### 3. Configuration

**Environment variables table:**

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Set in the image, no need to override |
| `NUXT_HOST` | `0.0.0.0` | Bind address — set in the image |
| `PORT` | `3000` | Server listen port |

**Data volume (`/app/data`):**

| Path | Contents |
|------|----------|
| `ceegee.db` | SQLite database (auto-created on first run) |
| `assets/` | Uploaded media files |
| `fonts/` | Cached Google Fonts |

Emphasize: always use a named volume or bind mount — without one, data is lost when the container is removed.

### 4. Common Operations

Cover both plain Docker and Docker Compose variants for:
- Starting and stopping
- Viewing logs
- Updating to a new version (pull new image, recreate container)
- Backing up data (copy volume contents or bind mount directory)

### 5. Connecting OBS

Brief section explaining:
- Use the host machine's IP (not `localhost`) when OBS runs on a different machine
- URL format: `http://<host-ip>:3000/o/<workspaceId>/channel/<channelId>`
- Link to the existing OBS Setup guide for full details

### 6. Troubleshooting

Common issues with solutions:
- **Port already in use** — change the host port mapping
- **Permission denied on data volume** — container runs as non-root user `ceegee`, ensure volume permissions
- **Can't connect from another machine** — check firewall, ensure binding to `0.0.0.0`
- **Data lost after restart** — must use a named volume, not anonymous

## Tone and Audience

Practical, command-focused. Assumes the reader knows basic Docker but nothing about CeeGee. No unnecessary explanation of Docker concepts.

## Out of Scope

- Building the image from source (covered in developer docs)
- CI/CD pipeline configuration
- Reverse proxy / TLS setup
- Multi-container orchestration beyond the single CeeGee service
