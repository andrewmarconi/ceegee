# Docker Deployment Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a user-facing documentation page for deploying and operating CeeGee via Docker.

**Architecture:** A single Markdown file in the VuePress docs site, numbered to appear after OBS Setup in the sidebar. Covers plain Docker, Docker Compose, configuration, operations, OBS connectivity, and troubleshooting.

**Tech Stack:** VuePress (Plume theme), Markdown

---

### Task 1: Write the Docker Deployment Guide

**Files:**
- Create: `docs/user/60.docker-deployment.md`

- [ ] **Step 1: Create the documentation file**

Create `docs/user/60.docker-deployment.md` with the following content:

````markdown
---
title: Docker Deployment
---

# Docker Deployment

Deploy CeeGee as a Docker container for production use.

## Quick Start

Pull and run the latest image:

```bash
docker pull andrew559labs/ceegee:latest

docker run -d \
  --name ceegee \
  -p 3000:3000 \
  -v ceegee-data:/app/data \
  andrew559labs/ceegee:latest
```

CeeGee is now running at `http://localhost:3000`.

## Docker Compose

For easier management, use Docker Compose. Create a `docker-compose.yml`:

```yaml
services:
  ceegee:
    image: andrew559labs/ceegee:latest
    ports:
      - "3000:3000"
    volumes:
      - ceegee-data:/app/data
    restart: unless-stopped

volumes:
  ceegee-data:
```

Start the service:

```bash
docker compose up -d
```

Stop the service:

```bash
docker compose down
```

View logs:

```bash
docker compose logs -f ceegee
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Set in the image — no need to override |
| `NUXT_HOST` | `0.0.0.0` | Bind address — set in the image |
| `PORT` | `3000` | Server listen port |

To change the port, update both the environment variable and the port mapping:

**Docker run:**

```bash
docker run -d \
  --name ceegee \
  -p 8080:8080 \
  -e PORT=8080 \
  -v ceegee-data:/app/data \
  andrew559labs/ceegee:latest
```

**Docker Compose:**

```yaml
services:
  ceegee:
    image: andrew559labs/ceegee:latest
    ports:
      - "8080:8080"
    environment:
      PORT: 8080
    volumes:
      - ceegee-data:/app/data
    restart: unless-stopped

volumes:
  ceegee-data:
```

### Data Volume

All persistent data lives under `/app/data`:

| Path | Contents |
|------|----------|
| `ceegee.db` | SQLite database (auto-created on first run) |
| `assets/` | Uploaded media files |
| `fonts/` | Cached Google Fonts |

::: warning
Always use a named volume or bind mount. Without one, all data is lost when the container is removed.
:::

## Common Operations

### Starting and Stopping

**Docker:**

```bash
docker start ceegee
docker stop ceegee
docker restart ceegee
```

**Docker Compose:**

```bash
docker compose up -d
docker compose down
docker compose restart
```

### Viewing Logs

**Docker:**

```bash
docker logs -f ceegee
```

**Docker Compose:**

```bash
docker compose logs -f ceegee
```

### Updating to a New Version

**Docker:**

```bash
docker pull andrew559labs/ceegee:latest
docker stop ceegee
docker rm ceegee
docker run -d \
  --name ceegee \
  -p 3000:3000 \
  -v ceegee-data:/app/data \
  andrew559labs/ceegee:latest
```

**Docker Compose:**

```bash
docker compose pull
docker compose up -d
```

Database migrations run automatically on startup — no manual steps needed.

### Backing Up Data

Copy the volume contents to a local directory:

```bash
docker run --rm \
  -v ceegee-data:/data \
  -v $(pwd):/backup \
  busybox tar czf /backup/ceegee-backup.tar.gz -C /data .
```

To restore from a backup:

```bash
docker run --rm \
  -v ceegee-data:/data \
  -v $(pwd):/backup \
  busybox tar xzf /backup/ceegee-backup.tar.gz -C /data
```

## Connecting OBS

When OBS runs on the same machine as CeeGee, use `localhost`:

```
http://localhost:3000/o/<workspaceId>/channel/<channelId>
```

When OBS runs on a different machine, use the host machine's IP address:

```
http://192.168.1.100:3000/o/<workspaceId>/channel/<channelId>
```

See the [OBS Setup guide](/user/obs-setup/) for full instructions on adding browser sources.

## Troubleshooting

### Port Already in Use

If port 3000 is taken, map to a different host port:

```bash
docker run -d --name ceegee -p 8080:3000 -v ceegee-data:/app/data andrew559labs/ceegee:latest
```

Then access CeeGee at `http://localhost:8080`.

### Can't Connect from Another Machine

- Verify the container is running: `docker ps`
- Check your firewall allows traffic on the mapped port
- The container binds to `0.0.0.0` by default, so all network interfaces are accessible

### Data Lost After Restart

If your data disappears when the container restarts, you're likely running without a volume. Always include `-v ceegee-data:/app/data` in your `docker run` command, or use the Docker Compose configuration above.

### Permission Denied on Data Volume

The container runs as a non-root user (`ceegee`). If using a bind mount instead of a named volume, ensure the host directory is writable:

```bash
mkdir -p ./ceegee-data
chmod 777 ./ceegee-data
docker run -d --name ceegee -p 3000:3000 -v ./ceegee-data:/app/data andrew559labs/ceegee:latest
```
````

- [ ] **Step 2: Verify the docs build**

```bash
cd docs && pnpm run docs:build
```

Expected: Build succeeds, new page appears in the output. Check the sidebar ordering by inspecting the build log — the page should appear after OBS Setup.

- [ ] **Step 3: Commit**

```bash
git add docs/user/60.docker-deployment.md
git commit -m "docs: add Docker deployment guide (#50)"
```
