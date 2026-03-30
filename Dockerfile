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
