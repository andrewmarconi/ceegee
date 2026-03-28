# Engine Core: Monorepo + Database + Repositories

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the engine-core package with SQLite database (Drizzle ORM), shared TypeScript types, and a tested repository layer for all MVP entities.

**Architecture:** pnpm monorepo with `apps/engine-ui` (Nuxt 4, already scaffolded) and `packages/engine-core` (pure Node/TS, no framework dependency). Repositories are plain functions that take a Drizzle DB instance, handle JSON column parsing internally, and return domain types. All operations are synchronous (better-sqlite3).

**Tech Stack:** TypeScript, Drizzle ORM, better-sqlite3, Vitest

---

> **This is Plan 1 of 5.** Subsequent plans:
> - Plan 2: Nitro API routes + Engine state management + WebSocket
> - Plan 3: Overlay system + Module loading + Built-in modules
> - Plan 4: Operator UI
> - Plan 5: Producer UI + Asset management

**Reference docs:**
- `docs/prd.md` — full PRD
- `docs/schema-sqlite.md` — SQL DDL
- `docs/schema-typescript.md` — TypeScript type definitions
- `docs/decisions.md` — architecture decisions

---

## File structure

All files created by this plan:

```
CeeGee/
├── package.json                              # Root workspace package.json
├── pnpm-workspace.yaml                       # Workspace config (moved from engine-ui)
├── .gitignore                                # Root gitignore
├── packages/
│   └── engine-core/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       ├── drizzle.config.ts
│       ├── drizzle/                          # Generated migrations (by drizzle-kit)
│       │   └── 0000_initial.sql
│       ├── src/
│       │   ├── index.ts                      # Package exports
│       │   ├── types.ts                      # Domain types (from schema-typescript.md)
│       │   └── db/
│       │       ├── schema.ts                 # Drizzle table definitions
│       │       └── connection.ts             # DB factory: createDatabase()
│       └── tests/
│           ├── helpers.ts                    # createTestDb() helper
│           ├── db.test.ts                    # Schema smoke test
│           ├── workspaces.test.ts
│           ├── channels.test.ts
│           ├── layers.test.ts
│           ├── modules.test.ts
│           ├── elements.test.ts
│           ├── assets.test.ts
│           └── runtime-state.test.ts
```

Repository functions live in `src/index.ts` alongside the exports. Each entity gets a set of functions (create, get, list, update, delete) exported by name. This keeps the package simple — one import path for everything. If the file grows unwieldy, split into `src/repositories/*.ts` later.

---

## Task 1: Root monorepo scaffolding

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.gitignore`
- Delete: `apps/engine-ui/pnpm-workspace.yaml`

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "ceegee",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "pnpm --filter engine-ui dev",
    "build": "pnpm --filter engine-ui build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint"
  }
}
```

- [ ] **Step 2: Create root `pnpm-workspace.yaml`**

Move `ignoredBuiltDependencies` from `apps/engine-ui/pnpm-workspace.yaml` and add workspace package globs:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'

ignoredBuiltDependencies:
  - '@parcel/watcher'
  - '@tailwindcss/oxide'
  - esbuild
  - unrs-resolver
  - vue-demi
```

- [ ] **Step 3: Delete `apps/engine-ui/pnpm-workspace.yaml`**

This file only had `ignoredBuiltDependencies` which is now in the root. Delete it.

```bash
rm apps/engine-ui/pnpm-workspace.yaml
```

- [ ] **Step 4: Create root `.gitignore`**

```gitignore
node_modules/
dist/
.nuxt/
.output/
*.db
*.db-journal
*.db-wal
.DS_Store
```

- [ ] **Step 5: Run `pnpm install` from root to verify workspace resolution**

```bash
cd /home/andrew/Develop/CeeGee && pnpm install
```

Expected: installs successfully, resolves `apps/engine-ui` as a workspace package.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-workspace.yaml .gitignore apps/engine-ui/
git commit -m "chore: set up root monorepo with pnpm workspaces"
```

---

## Task 2: engine-core package scaffolding

**Files:**
- Create: `packages/engine-core/package.json`
- Create: `packages/engine-core/tsconfig.json`
- Create: `packages/engine-core/vitest.config.ts`
- Create: `packages/engine-core/drizzle.config.ts`

- [ ] **Step 1: Create `packages/engine-core/package.json`**

```json
{
  "name": "engine-core",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types.ts",
    "./db/schema": "./src/db/schema.ts",
    "./db/connection": "./src/db/connection.ts"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "drizzle-kit generate"
  },
  "dependencies": {
    "better-sqlite3": "^11.9.1",
    "drizzle-orm": "^0.44.2"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.14",
    "drizzle-kit": "^0.31.1",
    "vitest": "^3.2.1",
    "typescript": "^5.9.3"
  }
}
```

- [ ] **Step 2: Create `packages/engine-core/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "."
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `packages/engine-core/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: '.',
  },
});
```

- [ ] **Step 4: Create `packages/engine-core/drizzle.config.ts`**

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
});
```

- [ ] **Step 5: Install dependencies**

```bash
cd /home/andrew/Develop/CeeGee && pnpm install
```

Expected: resolves engine-core as workspace package, installs drizzle-orm, better-sqlite3, vitest, etc.

- [ ] **Step 6: Commit**

```bash
git add packages/engine-core/
git commit -m "chore: scaffold engine-core package with vitest and drizzle"
```

---

## Task 3: Drizzle schema + initial migration

**Files:**
- Create: `packages/engine-core/src/db/schema.ts`
- Generated: `packages/engine-core/drizzle/` (migration files)

- [ ] **Step 1: Create `packages/engine-core/src/db/schema.ts`**

All MVP tables from `docs/schema-sqlite.md`:

```ts
import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

// -- Workspaces --

export const workspaces = sqliteTable('workspaces', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),

  baseWidth: integer('base_width').notNull().default(1920),
  baseHeight: integer('base_height').notNull().default(1080),
  aspectRatio: text('aspect_ratio').notNull().default('16:9'),

  safeTitleTop: real('safe_title_top'),
  safeTitleBottom: real('safe_title_bottom'),
  safeTitleLeft: real('safe_title_left'),
  safeTitleRight: real('safe_title_right'),
  safeActionTop: real('safe_action_top'),
  safeActionBottom: real('safe_action_bottom'),
  safeActionLeft: real('safe_action_left'),
  safeActionRight: real('safe_action_right'),

  themeTokensJson: text('theme_tokens_json').notNull().default('{}'),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// -- Channels --

export const channels = sqliteTable('channels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workspaceId: integer('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  description: text('description'),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_channels_workspace').on(table.workspaceId),
]);

// -- Layers --

export const layers = sqliteTable('layers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workspaceId: integer('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  channelId: integer('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  zIndex: integer('z_index').notNull(),
  region: text('region'),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_layers_channel').on(table.channelId),
]);

// -- Modules --

export const modules = sqliteTable('modules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  moduleKey: text('module_key').notNull().unique(),
  label: text('label').notNull(),
  version: text('version').notNull(),
  category: text('category').notNull(),

  configSchemaJson: text('config_schema_json').notNull(),
  dataSchemaJson: text('data_schema_json').notNull(),
  actionsJson: text('actions_json').notNull(),
  animationHooksJson: text('animation_hooks_json').notNull(),
  capabilitiesJson: text('capabilities_json').notNull().default('{}'),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// -- Elements --

export const elements = sqliteTable('elements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workspaceId: integer('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  channelId: integer('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  layerId: integer('layer_id').notNull().references(() => layers.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  moduleId: integer('module_id').notNull().references(() => modules.id),
  sortOrder: integer('sort_order').notNull().default(0),

  configJson: text('config_json').notNull(),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_elements_workspace').on(table.workspaceId),
  index('idx_elements_channel').on(table.channelId),
  index('idx_elements_layer').on(table.layerId),
]);

// -- Assets --

export const assets = sqliteTable('assets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workspaceId: integer('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  path: text('path').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),

  width: integer('width'),
  height: integer('height'),

  tagsJson: text('tags_json').notNull().default('[]'),
  folderPath: text('folder_path'),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_assets_workspace').on(table.workspaceId),
]);

// -- Element Runtime State --

export const elementRuntimeState = sqliteTable('element_runtime_state', {
  elementId: integer('element_id').primaryKey().references(() => elements.id, { onDelete: 'cascade' }),

  visibility: text('visibility').notNull(),
  runtimeDataJson: text('runtime_data_json').notNull().default('{}'),

  updatedAt: text('updated_at').notNull(),
});
```

- [ ] **Step 2: Generate initial migration**

```bash
cd /home/andrew/Develop/CeeGee/packages/engine-core && npx drizzle-kit generate
```

Expected: creates `drizzle/0000_*.sql` with CREATE TABLE statements for all tables.

- [ ] **Step 3: Verify generated SQL matches `docs/schema-sqlite.md`**

Open the generated migration file and check that all tables, columns, indexes, and foreign keys match the spec. Drizzle-kit generates the SQL from the schema definition — verify it looks correct.

- [ ] **Step 4: Commit**

```bash
git add packages/engine-core/src/db/schema.ts packages/engine-core/drizzle/
git commit -m "feat(engine-core): add drizzle schema for all MVP tables"
```

---

## Task 4: DB connection factory + test helpers

**Files:**
- Create: `packages/engine-core/src/db/connection.ts`
- Create: `packages/engine-core/tests/helpers.ts`
- Create: `packages/engine-core/tests/db.test.ts`

- [ ] **Step 1: Create `packages/engine-core/src/db/connection.ts`**

```ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

export type AppDatabase = ReturnType<typeof createDatabase>;

const MIGRATIONS_DIR = new URL('../../drizzle', import.meta.url).pathname;

export function createDatabase(dbPath: string): ReturnType<typeof drizzle<typeof schema>> {
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db;
}
```

- [ ] **Step 2: Create `packages/engine-core/tests/helpers.ts`**

```ts
import { createDatabase } from '../src/db/connection';

export type TestDb = ReturnType<typeof createDatabase>;

export function createTestDb(): TestDb {
  return createDatabase(':memory:');
}
```

- [ ] **Step 3: Write schema smoke test in `packages/engine-core/tests/db.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { createTestDb } from './helpers';
import { sql } from 'drizzle-orm';

describe('database setup', () => {
  it('creates all tables from migrations', () => {
    const db = createTestDb();
    const tables = db.all<{ name: string }>(
      sql`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%' ORDER BY name`
    );
    const names = tables.map((t) => t.name);

    expect(names).toContain('workspaces');
    expect(names).toContain('channels');
    expect(names).toContain('layers');
    expect(names).toContain('modules');
    expect(names).toContain('elements');
    expect(names).toContain('assets');
    expect(names).toContain('element_runtime_state');
  });

  it('enforces foreign keys', () => {
    const db = createTestDb();
    expect(() => {
      db.run(sql`INSERT INTO channels (workspace_id, name, created_at, updated_at) VALUES (999, 'bad', '2024-01-01', '2024-01-01')`);
    }).toThrow();
  });
});
```

- [ ] **Step 4: Run tests to verify**

```bash
cd /home/andrew/Develop/CeeGee/packages/engine-core && npx vitest run
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/db/connection.ts packages/engine-core/tests/
git commit -m "feat(engine-core): add database connection factory and test helpers"
```

---

## Task 5: Domain types

**Files:**
- Create: `packages/engine-core/src/types.ts`

- [ ] **Step 1: Create `packages/engine-core/src/types.ts`**

Domain types from `docs/schema-typescript.md` plus input types for repository operations:

```ts
// -- ID types (auto-increment integers from SQLite) --

export type WorkspaceId = number;
export type ChannelId = number;
export type LayerId = number;
export type ModulePk = number;
export type ElementId = number;
export type AssetId = number;
export type IsoDateTime = string;

// -- Workspace --

export type SafeAreaPct = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type WorkspaceDisplayConfig = {
  baseWidth: number;
  baseHeight: number;
  aspectRatio: string;
  safeTitle?: SafeAreaPct;
  safeAction?: SafeAreaPct;
};

export type ThemeTokens = Record<string, string>;

export type Workspace = {
  id: WorkspaceId;
  name: string;
  description: string | null;
  displayConfig: WorkspaceDisplayConfig;
  themeTokens: ThemeTokens;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type CreateWorkspaceInput = {
  name: string;
  description?: string | null;
  displayConfig?: Partial<WorkspaceDisplayConfig>;
  themeTokens?: ThemeTokens;
};

export type UpdateWorkspaceInput = Partial<CreateWorkspaceInput>;

// -- Channel --

export type Channel = {
  id: ChannelId;
  workspaceId: WorkspaceId;
  name: string;
  description: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type CreateChannelInput = {
  workspaceId: WorkspaceId;
  name: string;
  description?: string | null;
};

export type UpdateChannelInput = Partial<Omit<CreateChannelInput, 'workspaceId'>>;

// -- Layer --

export type LayerRegion =
  | 'band-lower'
  | 'band-upper'
  | 'corner-tl'
  | 'corner-tr'
  | 'corner-bl'
  | 'corner-br'
  | 'full'
  | (string & {});

export type Layer = {
  id: LayerId;
  workspaceId: WorkspaceId;
  channelId: ChannelId;
  name: string;
  zIndex: number;
  region: LayerRegion | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type CreateLayerInput = {
  workspaceId: WorkspaceId;
  channelId: ChannelId;
  name: string;
  zIndex: number;
  region?: LayerRegion | null;
};

export type UpdateLayerInput = Partial<Omit<CreateLayerInput, 'workspaceId' | 'channelId'>>;

// -- Module --

export type JsonSchemaLike = Record<string, unknown>;

export type ModuleAction = {
  id: string;
  label: string;
};

export type ModuleAnimationHooks = {
  enter?: string;
  exit?: string;
  emphasize?: string;
};

export type ModuleCapabilities = {
  supportsLayerRegions?: boolean;
  supportsMultipleInstancesPerLayer?: boolean;
};

export type ModuleCategory =
  | 'lower-third'
  | 'bug'
  | 'billboard'
  | 'clock'
  | 'countdown'
  | (string & {});

export type ModuleRecord = {
  id: ModulePk;
  moduleKey: string;
  label: string;
  version: string;
  category: ModuleCategory;
  configSchema: JsonSchemaLike;
  dataSchema: JsonSchemaLike;
  actions: ModuleAction[];
  animationHooks: ModuleAnimationHooks;
  capabilities: ModuleCapabilities;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type UpsertModuleInput = {
  moduleKey: string;
  label: string;
  version: string;
  category: ModuleCategory;
  configSchema: JsonSchemaLike;
  dataSchema: JsonSchemaLike;
  actions: ModuleAction[];
  animationHooks: ModuleAnimationHooks;
  capabilities?: ModuleCapabilities;
};

// -- Element --

export type Element = {
  id: ElementId;
  workspaceId: WorkspaceId;
  channelId: ChannelId;
  layerId: LayerId;
  name: string;
  moduleId: ModulePk;
  sortOrder: number;
  config: unknown;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type CreateElementInput = {
  workspaceId: WorkspaceId;
  channelId: ChannelId;
  layerId: LayerId;
  name: string;
  moduleId: ModulePk;
  sortOrder?: number;
  config: unknown;
};

export type UpdateElementInput = Partial<Pick<CreateElementInput, 'name' | 'sortOrder' | 'config'>>;

// -- Asset --

export type Asset = {
  id: AssetId;
  workspaceId: WorkspaceId;
  name: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  tags: string[];
  folderPath: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type CreateAssetInput = {
  workspaceId: WorkspaceId;
  name: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  tags?: string[];
  folderPath?: string | null;
};

export type UpdateAssetInput = Partial<Pick<CreateAssetInput, 'name' | 'tags' | 'folderPath'>>;

// -- Runtime State --

export type ElementVisibility = 'hidden' | 'entering' | 'visible' | 'exiting';

export type ElementRuntimeState = {
  elementId: ElementId;
  visibility: ElementVisibility;
  runtimeData: unknown;
  updatedAt: IsoDateTime;
};

export type SetRuntimeStateInput = {
  elementId: ElementId;
  visibility: ElementVisibility;
  runtimeData?: unknown;
};

// -- Helpers --

export function now(): IsoDateTime {
  return new Date().toISOString();
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/engine-core/src/types.ts
git commit -m "feat(engine-core): add domain types and input types"
```

---

## Task 6: Workspaces repository + tests

**Files:**
- Create: `packages/engine-core/src/index.ts`
- Create: `packages/engine-core/tests/workspaces.test.ts`

Workspaces are the most complex entity (flattened safe-area columns, JSON theme tokens). This task establishes the repository pattern used by all subsequent tasks.

- [ ] **Step 1: Write failing tests in `packages/engine-core/tests/workspaces.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, type TestDb } from './helpers';
import {
  createWorkspace,
  getWorkspace,
  listWorkspaces,
  updateWorkspace,
  deleteWorkspace,
} from '../src/index';

describe('workspaces repository', () => {
  let db: TestDb;

  beforeEach(() => {
    db = createTestDb();
  });

  it('creates a workspace with defaults', () => {
    const ws = createWorkspace(db, { name: 'Test Show' });
    expect(ws.id).toBeGreaterThan(0);
    expect(ws.name).toBe('Test Show');
    expect(ws.description).toBeNull();
    expect(ws.displayConfig.baseWidth).toBe(1920);
    expect(ws.displayConfig.baseHeight).toBe(1080);
    expect(ws.displayConfig.aspectRatio).toBe('16:9');
    expect(ws.themeTokens).toEqual({});
    expect(ws.createdAt).toBeTruthy();
  });

  it('creates a workspace with custom display config and theme', () => {
    const ws = createWorkspace(db, {
      name: 'Custom',
      description: 'A custom show',
      displayConfig: {
        baseWidth: 3840,
        baseHeight: 2160,
        aspectRatio: '16:9',
        safeTitle: { top: 5, bottom: 5, left: 5, right: 5 },
      },
      themeTokens: { '--primary': '#ff0000', '--font': 'Inter' },
    });
    expect(ws.displayConfig.baseWidth).toBe(3840);
    expect(ws.displayConfig.safeTitle?.top).toBe(5);
    expect(ws.themeTokens['--primary']).toBe('#ff0000');
  });

  it('gets a workspace by id', () => {
    const created = createWorkspace(db, { name: 'Find Me' });
    const found = getWorkspace(db, created.id);
    expect(found).toEqual(created);
  });

  it('returns undefined for missing workspace', () => {
    expect(getWorkspace(db, 999)).toBeUndefined();
  });

  it('lists all workspaces', () => {
    createWorkspace(db, { name: 'A' });
    createWorkspace(db, { name: 'B' });
    const all = listWorkspaces(db);
    expect(all).toHaveLength(2);
    expect(all[0].name).toBe('A');
    expect(all[1].name).toBe('B');
  });

  it('updates a workspace', () => {
    const ws = createWorkspace(db, { name: 'Original' });
    const updated = updateWorkspace(db, ws.id, {
      name: 'Updated',
      themeTokens: { '--bg': '#000' },
    });
    expect(updated.name).toBe('Updated');
    expect(updated.themeTokens['--bg']).toBe('#000');
    expect(updated.id).toBe(ws.id);
  });

  it('deletes a workspace', () => {
    const ws = createWorkspace(db, { name: 'Delete Me' });
    deleteWorkspace(db, ws.id);
    expect(getWorkspace(db, ws.id)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/andrew/Develop/CeeGee/packages/engine-core && npx vitest run tests/workspaces.test.ts
```

Expected: FAIL — `createWorkspace` is not exported from `../src/index`.

- [ ] **Step 3: Implement in `packages/engine-core/src/index.ts`**

```ts
import { eq } from 'drizzle-orm';
import { workspaces } from './db/schema';
import type { AppDatabase } from './db/connection';
import type {
  Workspace,
  WorkspaceId,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  WorkspaceDisplayConfig,
} from './types';
import { now } from './types';

// Re-export types and db utilities
export * from './types';
export { createDatabase, type AppDatabase } from './db/connection';

// -- Row mapping --

type WorkspaceRow = typeof workspaces.$inferSelect;

function workspaceRowToDomain(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    displayConfig: {
      baseWidth: row.baseWidth,
      baseHeight: row.baseHeight,
      aspectRatio: row.aspectRatio,
      safeTitle: row.safeTitleTop != null
        ? { top: row.safeTitleTop, bottom: row.safeTitleBottom!, left: row.safeTitleLeft!, right: row.safeTitleRight! }
        : undefined,
      safeAction: row.safeActionTop != null
        ? { top: row.safeActionTop, bottom: row.safeActionBottom!, left: row.safeActionLeft!, right: row.safeActionRight! }
        : undefined,
    },
    themeTokens: JSON.parse(row.themeTokensJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// -- Repository functions --

export function createWorkspace(db: AppDatabase, input: CreateWorkspaceInput): Workspace {
  const dc: WorkspaceDisplayConfig = {
    baseWidth: 1920,
    baseHeight: 1080,
    aspectRatio: '16:9',
    ...input.displayConfig,
  };
  const ts = now();
  const row = db.insert(workspaces).values({
    name: input.name,
    description: input.description ?? null,
    baseWidth: dc.baseWidth,
    baseHeight: dc.baseHeight,
    aspectRatio: dc.aspectRatio,
    safeTitleTop: dc.safeTitle?.top ?? null,
    safeTitleBottom: dc.safeTitle?.bottom ?? null,
    safeTitleLeft: dc.safeTitle?.left ?? null,
    safeTitleRight: dc.safeTitle?.right ?? null,
    safeActionTop: dc.safeAction?.top ?? null,
    safeActionBottom: dc.safeAction?.bottom ?? null,
    safeActionLeft: dc.safeAction?.left ?? null,
    safeActionRight: dc.safeAction?.right ?? null,
    themeTokensJson: JSON.stringify(input.themeTokens ?? {}),
    createdAt: ts,
    updatedAt: ts,
  }).returning().get();
  return workspaceRowToDomain(row);
}

export function getWorkspace(db: AppDatabase, id: WorkspaceId): Workspace | undefined {
  const row = db.select().from(workspaces).where(eq(workspaces.id, id)).get();
  return row ? workspaceRowToDomain(row) : undefined;
}

export function listWorkspaces(db: AppDatabase): Workspace[] {
  const rows = db.select().from(workspaces).all();
  return rows.map(workspaceRowToDomain);
}

export function updateWorkspace(db: AppDatabase, id: WorkspaceId, input: UpdateWorkspaceInput): Workspace {
  const existing = getWorkspace(db, id);
  if (!existing) throw new Error(`Workspace ${id} not found`);

  const values: Record<string, unknown> = { updatedAt: now() };
  if (input.name !== undefined) values.name = input.name;
  if (input.description !== undefined) values.description = input.description;
  if (input.themeTokens !== undefined) values.themeTokensJson = JSON.stringify(input.themeTokens);
  if (input.displayConfig !== undefined) {
    const dc = { ...existing.displayConfig, ...input.displayConfig };
    values.baseWidth = dc.baseWidth;
    values.baseHeight = dc.baseHeight;
    values.aspectRatio = dc.aspectRatio;
    values.safeTitleTop = dc.safeTitle?.top ?? null;
    values.safeTitleBottom = dc.safeTitle?.bottom ?? null;
    values.safeTitleLeft = dc.safeTitle?.left ?? null;
    values.safeTitleRight = dc.safeTitle?.right ?? null;
    values.safeActionTop = dc.safeAction?.top ?? null;
    values.safeActionBottom = dc.safeAction?.bottom ?? null;
    values.safeActionLeft = dc.safeAction?.left ?? null;
    values.safeActionRight = dc.safeAction?.right ?? null;
  }

  db.update(workspaces).set(values).where(eq(workspaces.id, id)).run();
  return getWorkspace(db, id)!;
}

export function deleteWorkspace(db: AppDatabase, id: WorkspaceId): void {
  db.delete(workspaces).where(eq(workspaces.id, id)).run();
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/andrew/Develop/CeeGee/packages/engine-core && npx vitest run tests/workspaces.test.ts
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/index.ts packages/engine-core/tests/workspaces.test.ts
git commit -m "feat(engine-core): add workspaces repository with tests"
```

---

## Task 7: Channels repository + tests

**Files:**
- Modify: `packages/engine-core/src/index.ts`
- Create: `packages/engine-core/tests/channels.test.ts`

- [ ] **Step 1: Write failing tests in `packages/engine-core/tests/channels.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, type TestDb } from './helpers';
import {
  createWorkspace,
  createChannel,
  getChannel,
  listChannels,
  updateChannel,
  deleteChannel,
} from '../src/index';

describe('channels repository', () => {
  let db: TestDb;
  let workspaceId: number;

  beforeEach(() => {
    db = createTestDb();
    workspaceId = createWorkspace(db, { name: 'Test WS' }).id;
  });

  it('creates a channel', () => {
    const ch = createChannel(db, { workspaceId, name: 'Main Program' });
    expect(ch.id).toBeGreaterThan(0);
    expect(ch.name).toBe('Main Program');
    expect(ch.workspaceId).toBe(workspaceId);
  });

  it('gets a channel by id', () => {
    const created = createChannel(db, { workspaceId, name: 'Find Me' });
    expect(getChannel(db, created.id)).toEqual(created);
  });

  it('returns undefined for missing channel', () => {
    expect(getChannel(db, 999)).toBeUndefined();
  });

  it('lists channels for a workspace', () => {
    createChannel(db, { workspaceId, name: 'Program' });
    createChannel(db, { workspaceId, name: 'Preview' });
    const chs = listChannels(db, workspaceId);
    expect(chs).toHaveLength(2);
  });

  it('updates a channel', () => {
    const ch = createChannel(db, { workspaceId, name: 'Original' });
    const updated = updateChannel(db, ch.id, { name: 'Renamed' });
    expect(updated.name).toBe('Renamed');
  });

  it('deletes a channel', () => {
    const ch = createChannel(db, { workspaceId, name: 'Delete Me' });
    deleteChannel(db, ch.id);
    expect(getChannel(db, ch.id)).toBeUndefined();
  });

  it('cascades delete when workspace is deleted', () => {
    const ch = createChannel(db, { workspaceId, name: 'Cascade' });
    deleteWorkspace(db, workspaceId);
    expect(getChannel(db, ch.id)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/andrew/Develop/CeeGee/packages/engine-core && npx vitest run tests/channels.test.ts
```

Expected: FAIL — `createChannel` is not exported.

- [ ] **Step 3: Add channel repository functions to `packages/engine-core/src/index.ts`**

Append after the workspaces section:

```ts
import { channels } from './db/schema';
import type { Channel, ChannelId, CreateChannelInput, UpdateChannelInput, WorkspaceId } from './types';

type ChannelRow = typeof channels.$inferSelect;

function channelRowToDomain(row: ChannelRow): Channel {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    description: row.description ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createChannel(db: AppDatabase, input: CreateChannelInput): Channel {
  const ts = now();
  const row = db.insert(channels).values({
    workspaceId: input.workspaceId,
    name: input.name,
    description: input.description ?? null,
    createdAt: ts,
    updatedAt: ts,
  }).returning().get();
  return channelRowToDomain(row);
}

export function getChannel(db: AppDatabase, id: ChannelId): Channel | undefined {
  const row = db.select().from(channels).where(eq(channels.id, id)).get();
  return row ? channelRowToDomain(row) : undefined;
}

export function listChannels(db: AppDatabase, workspaceId: WorkspaceId): Channel[] {
  const rows = db.select().from(channels).where(eq(channels.workspaceId, workspaceId)).all();
  return rows.map(channelRowToDomain);
}

export function updateChannel(db: AppDatabase, id: ChannelId, input: UpdateChannelInput): Channel {
  const values: Record<string, unknown> = { updatedAt: now() };
  if (input.name !== undefined) values.name = input.name;
  if (input.description !== undefined) values.description = input.description;
  db.update(channels).set(values).where(eq(channels.id, id)).run();
  return getChannel(db, id)!;
}

export function deleteChannel(db: AppDatabase, id: ChannelId): void {
  db.delete(channels).where(eq(channels.id, id)).run();
}
```

Note: merge the new import from `./db/schema` into the existing import at the top of the file. The `WorkspaceId` import is already present from the types re-export.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/andrew/Develop/CeeGee/packages/engine-core && npx vitest run tests/channels.test.ts
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/index.ts packages/engine-core/tests/channels.test.ts
git commit -m "feat(engine-core): add channels repository with tests"
```

---

## Task 8: Layers repository + tests

**Files:**
- Modify: `packages/engine-core/src/index.ts`
- Create: `packages/engine-core/tests/layers.test.ts`

- [ ] **Step 1: Write failing tests in `packages/engine-core/tests/layers.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, type TestDb } from './helpers';
import {
  createWorkspace,
  createChannel,
  createLayer,
  getLayer,
  listLayers,
  updateLayer,
  deleteLayer,
  deleteChannel,
} from '../src/index';

describe('layers repository', () => {
  let db: TestDb;
  let workspaceId: number;
  let channelId: number;

  beforeEach(() => {
    db = createTestDb();
    workspaceId = createWorkspace(db, { name: 'WS' }).id;
    channelId = createChannel(db, { workspaceId, name: 'Main' }).id;
  });

  it('creates a layer', () => {
    const layer = createLayer(db, { workspaceId, channelId, name: 'Lower Thirds', zIndex: 10 });
    expect(layer.id).toBeGreaterThan(0);
    expect(layer.name).toBe('Lower Thirds');
    expect(layer.zIndex).toBe(10);
    expect(layer.region).toBeNull();
  });

  it('creates a layer with region', () => {
    const layer = createLayer(db, { workspaceId, channelId, name: 'Bug', zIndex: 20, region: 'corner-tr' });
    expect(layer.region).toBe('corner-tr');
  });

  it('gets a layer by id', () => {
    const created = createLayer(db, { workspaceId, channelId, name: 'Find', zIndex: 1 });
    expect(getLayer(db, created.id)).toEqual(created);
  });

  it('lists layers for a channel ordered by z-index', () => {
    createLayer(db, { workspaceId, channelId, name: 'Top', zIndex: 30 });
    createLayer(db, { workspaceId, channelId, name: 'Bottom', zIndex: 10 });
    createLayer(db, { workspaceId, channelId, name: 'Middle', zIndex: 20 });
    const layers = listLayers(db, channelId);
    expect(layers).toHaveLength(3);
    expect(layers[0].name).toBe('Bottom');
    expect(layers[1].name).toBe('Middle');
    expect(layers[2].name).toBe('Top');
  });

  it('updates a layer', () => {
    const layer = createLayer(db, { workspaceId, channelId, name: 'Old', zIndex: 1 });
    const updated = updateLayer(db, layer.id, { name: 'New', zIndex: 50 });
    expect(updated.name).toBe('New');
    expect(updated.zIndex).toBe(50);
  });

  it('deletes a layer', () => {
    const layer = createLayer(db, { workspaceId, channelId, name: 'Del', zIndex: 1 });
    deleteLayer(db, layer.id);
    expect(getLayer(db, layer.id)).toBeUndefined();
  });

  it('cascades delete when channel is deleted', () => {
    const layer = createLayer(db, { workspaceId, channelId, name: 'Cascade', zIndex: 1 });
    deleteChannel(db, channelId);
    expect(getLayer(db, layer.id)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/andrew/Develop/CeeGee/packages/engine-core && npx vitest run tests/layers.test.ts
```

Expected: FAIL — `createLayer` is not exported.

- [ ] **Step 3: Add layer repository functions to `packages/engine-core/src/index.ts`**

```ts
import { asc } from 'drizzle-orm';
import { layers } from './db/schema';
import type { Layer, LayerId, ChannelId, CreateLayerInput, UpdateLayerInput } from './types';

type LayerRow = typeof layers.$inferSelect;

function layerRowToDomain(row: LayerRow): Layer {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    channelId: row.channelId,
    name: row.name,
    zIndex: row.zIndex,
    region: (row.region as Layer['region']) ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createLayer(db: AppDatabase, input: CreateLayerInput): Layer {
  const ts = now();
  const row = db.insert(layers).values({
    workspaceId: input.workspaceId,
    channelId: input.channelId,
    name: input.name,
    zIndex: input.zIndex,
    region: input.region ?? null,
    createdAt: ts,
    updatedAt: ts,
  }).returning().get();
  return layerRowToDomain(row);
}

export function getLayer(db: AppDatabase, id: LayerId): Layer | undefined {
  const row = db.select().from(layers).where(eq(layers.id, id)).get();
  return row ? layerRowToDomain(row) : undefined;
}

export function listLayers(db: AppDatabase, channelId: ChannelId): Layer[] {
  const rows = db.select().from(layers)
    .where(eq(layers.channelId, channelId))
    .orderBy(asc(layers.zIndex))
    .all();
  return rows.map(layerRowToDomain);
}

export function updateLayer(db: AppDatabase, id: LayerId, input: UpdateLayerInput): Layer {
  const values: Record<string, unknown> = { updatedAt: now() };
  if (input.name !== undefined) values.name = input.name;
  if (input.zIndex !== undefined) values.zIndex = input.zIndex;
  if (input.region !== undefined) values.region = input.region;
  db.update(layers).set(values).where(eq(layers.id, id)).run();
  return getLayer(db, id)!;
}

export function deleteLayer(db: AppDatabase, id: LayerId): void {
  db.delete(layers).where(eq(layers.id, id)).run();
}
```

Merge the `asc` import into the existing `drizzle-orm` import line. Merge the `layers` import into the existing `./db/schema` import.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/andrew/Develop/CeeGee/packages/engine-core && npx vitest run tests/layers.test.ts
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/index.ts packages/engine-core/tests/layers.test.ts
git commit -m "feat(engine-core): add layers repository with tests"
```

---

## Task 9: Modules repository + tests

**Files:**
- Modify: `packages/engine-core/src/index.ts`
- Create: `packages/engine-core/tests/modules.test.ts`

Modules use **upsert** (insert-or-update by `moduleKey`) for auto-registration at engine startup.

- [ ] **Step 1: Write failing tests in `packages/engine-core/tests/modules.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, type TestDb } from './helpers';
import {
  upsertModule,
  getModuleByKey,
  listModules,
  type UpsertModuleInput,
} from '../src/index';

const sampleModule: UpsertModuleInput = {
  moduleKey: 'lower-third.basic',
  label: 'Basic Lower Third',
  version: '1.0.0',
  category: 'lower-third',
  configSchema: { type: 'object', properties: { alignment: { type: 'string' } } },
  dataSchema: { type: 'object', properties: { primaryText: { type: 'string' } } },
  actions: [{ id: 'show', label: 'Show' }, { id: 'hide', label: 'Hide' }],
  animationHooks: { enter: 'slideUp', exit: 'slideDown' },
  capabilities: { supportsLayerRegions: true },
};

describe('modules repository', () => {
  let db: TestDb;

  beforeEach(() => {
    db = createTestDb();
  });

  it('inserts a new module', () => {
    const mod = upsertModule(db, sampleModule);
    expect(mod.id).toBeGreaterThan(0);
    expect(mod.moduleKey).toBe('lower-third.basic');
    expect(mod.label).toBe('Basic Lower Third');
    expect(mod.actions).toEqual(sampleModule.actions);
    expect(mod.capabilities.supportsLayerRegions).toBe(true);
  });

  it('updates an existing module on upsert (same moduleKey)', () => {
    const first = upsertModule(db, sampleModule);
    const updated = upsertModule(db, { ...sampleModule, version: '2.0.0', label: 'Updated LT' });
    expect(updated.id).toBe(first.id);
    expect(updated.version).toBe('2.0.0');
    expect(updated.label).toBe('Updated LT');
  });

  it('gets a module by key', () => {
    upsertModule(db, sampleModule);
    const found = getModuleByKey(db, 'lower-third.basic');
    expect(found).toBeDefined();
    expect(found!.moduleKey).toBe('lower-third.basic');
  });

  it('returns undefined for missing module key', () => {
    expect(getModuleByKey(db, 'nonexistent')).toBeUndefined();
  });

  it('lists all modules', () => {
    upsertModule(db, sampleModule);
    upsertModule(db, { ...sampleModule, moduleKey: 'bug.basic', label: 'Bug', category: 'bug' });
    const all = listModules(db);
    expect(all).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/andrew/Develop/CeeGee/packages/engine-core && npx vitest run tests/modules.test.ts
```

Expected: FAIL — `upsertModule` is not exported.

- [ ] **Step 3: Add modules repository functions to `packages/engine-core/src/index.ts`**

```ts
import { modules } from './db/schema';
import type { ModuleRecord, ModulePk, UpsertModuleInput } from './types';

type ModuleRow = typeof modules.$inferSelect;

function moduleRowToDomain(row: ModuleRow): ModuleRecord {
  return {
    id: row.id,
    moduleKey: row.moduleKey,
    label: row.label,
    version: row.version,
    category: row.category,
    configSchema: JSON.parse(row.configSchemaJson),
    dataSchema: JSON.parse(row.dataSchemaJson),
    actions: JSON.parse(row.actionsJson),
    animationHooks: JSON.parse(row.animationHooksJson),
    capabilities: JSON.parse(row.capabilitiesJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function upsertModule(db: AppDatabase, input: UpsertModuleInput): ModuleRecord {
  const ts = now();
  const existing = db.select().from(modules).where(eq(modules.moduleKey, input.moduleKey)).get();

  if (existing) {
    db.update(modules).set({
      label: input.label,
      version: input.version,
      category: input.category,
      configSchemaJson: JSON.stringify(input.configSchema),
      dataSchemaJson: JSON.stringify(input.dataSchema),
      actionsJson: JSON.stringify(input.actions),
      animationHooksJson: JSON.stringify(input.animationHooks),
      capabilitiesJson: JSON.stringify(input.capabilities ?? {}),
      updatedAt: ts,
    }).where(eq(modules.id, existing.id)).run();
    return moduleRowToDomain(db.select().from(modules).where(eq(modules.id, existing.id)).get()!);
  }

  const row = db.insert(modules).values({
    moduleKey: input.moduleKey,
    label: input.label,
    version: input.version,
    category: input.category,
    configSchemaJson: JSON.stringify(input.configSchema),
    dataSchemaJson: JSON.stringify(input.dataSchema),
    actionsJson: JSON.stringify(input.actions),
    animationHooksJson: JSON.stringify(input.animationHooks),
    capabilitiesJson: JSON.stringify(input.capabilities ?? {}),
    createdAt: ts,
    updatedAt: ts,
  }).returning().get();
  return moduleRowToDomain(row);
}

export function getModuleByKey(db: AppDatabase, moduleKey: string): ModuleRecord | undefined {
  const row = db.select().from(modules).where(eq(modules.moduleKey, moduleKey)).get();
  return row ? moduleRowToDomain(row) : undefined;
}

export function getModule(db: AppDatabase, id: ModulePk): ModuleRecord | undefined {
  const row = db.select().from(modules).where(eq(modules.id, id)).get();
  return row ? moduleRowToDomain(row) : undefined;
}

export function listModules(db: AppDatabase): ModuleRecord[] {
  const rows = db.select().from(modules).all();
  return rows.map(moduleRowToDomain);
}
```

Merge imports into existing lines at the top.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/andrew/Develop/CeeGee/packages/engine-core && npx vitest run tests/modules.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/index.ts packages/engine-core/tests/modules.test.ts
git commit -m "feat(engine-core): add modules repository with upsert and tests"
```

---

## Task 10: Elements repository + tests

**Files:**
- Modify: `packages/engine-core/src/index.ts`
- Create: `packages/engine-core/tests/elements.test.ts`

- [ ] **Step 1: Write failing tests in `packages/engine-core/tests/elements.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, type TestDb } from './helpers';
import {
  createWorkspace,
  createChannel,
  createLayer,
  upsertModule,
  createElement,
  getElement,
  listElements,
  updateElement,
  deleteElement,
  deleteLayer,
  type UpsertModuleInput,
} from '../src/index';

const stubModule: UpsertModuleInput = {
  moduleKey: 'lower-third.basic',
  label: 'Basic LT',
  version: '1.0.0',
  category: 'lower-third',
  configSchema: {},
  dataSchema: {},
  actions: [],
  animationHooks: {},
};

describe('elements repository', () => {
  let db: TestDb;
  let workspaceId: number;
  let channelId: number;
  let layerId: number;
  let moduleId: number;

  beforeEach(() => {
    db = createTestDb();
    workspaceId = createWorkspace(db, { name: 'WS' }).id;
    channelId = createChannel(db, { workspaceId, name: 'Main' }).id;
    layerId = createLayer(db, { workspaceId, channelId, name: 'LT Layer', zIndex: 10 }).id;
    moduleId = upsertModule(db, stubModule).id;
  });

  it('creates an element', () => {
    const el = createElement(db, {
      workspaceId,
      channelId,
      layerId,
      name: 'Andrew / Creative Tech',
      moduleId,
      config: { primaryText: 'Andrew', secondaryText: 'Creative Technologist' },
    });
    expect(el.id).toBeGreaterThan(0);
    expect(el.name).toBe('Andrew / Creative Tech');
    expect(el.sortOrder).toBe(0);
    expect((el.config as any).primaryText).toBe('Andrew');
  });

  it('creates an element with custom sortOrder', () => {
    const el = createElement(db, {
      workspaceId, channelId, layerId, name: 'Sorted', moduleId, sortOrder: 5, config: {},
    });
    expect(el.sortOrder).toBe(5);
  });

  it('gets an element by id', () => {
    const created = createElement(db, {
      workspaceId, channelId, layerId, name: 'Find', moduleId, config: {},
    });
    expect(getElement(db, created.id)).toEqual(created);
  });

  it('lists elements for a layer ordered by sortOrder', () => {
    createElement(db, { workspaceId, channelId, layerId, name: 'C', moduleId, sortOrder: 3, config: {} });
    createElement(db, { workspaceId, channelId, layerId, name: 'A', moduleId, sortOrder: 1, config: {} });
    createElement(db, { workspaceId, channelId, layerId, name: 'B', moduleId, sortOrder: 2, config: {} });
    const els = listElements(db, layerId);
    expect(els).toHaveLength(3);
    expect(els[0].name).toBe('A');
    expect(els[1].name).toBe('B');
    expect(els[2].name).toBe('C');
  });

  it('updates an element', () => {
    const el = createElement(db, { workspaceId, channelId, layerId, name: 'Old', moduleId, config: { x: 1 } });
    const updated = updateElement(db, el.id, { name: 'New', config: { x: 2 } });
    expect(updated.name).toBe('New');
    expect((updated.config as any).x).toBe(2);
  });

  it('deletes an element', () => {
    const el = createElement(db, { workspaceId, channelId, layerId, name: 'Del', moduleId, config: {} });
    deleteElement(db, el.id);
    expect(getElement(db, el.id)).toBeUndefined();
  });

  it('cascades delete when layer is deleted', () => {
    const el = createElement(db, { workspaceId, channelId, layerId, name: 'Cascade', moduleId, config: {} });
    deleteLayer(db, layerId);
    expect(getElement(db, el.id)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/andrew/Develop/CeeGee/packages/engine-core && npx vitest run tests/elements.test.ts
```

Expected: FAIL — `createElement` is not exported.

- [ ] **Step 3: Add element repository functions to `packages/engine-core/src/index.ts`**

```ts
import { elements } from './db/schema';
import type { Element, ElementId, LayerId, CreateElementInput, UpdateElementInput } from './types';

type ElementRow = typeof elements.$inferSelect;

function elementRowToDomain(row: ElementRow): Element {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    channelId: row.channelId,
    layerId: row.layerId,
    name: row.name,
    moduleId: row.moduleId,
    sortOrder: row.sortOrder,
    config: JSON.parse(row.configJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createElement(db: AppDatabase, input: CreateElementInput): Element {
  const ts = now();
  const row = db.insert(elements).values({
    workspaceId: input.workspaceId,
    channelId: input.channelId,
    layerId: input.layerId,
    name: input.name,
    moduleId: input.moduleId,
    sortOrder: input.sortOrder ?? 0,
    configJson: JSON.stringify(input.config),
    createdAt: ts,
    updatedAt: ts,
  }).returning().get();
  return elementRowToDomain(row);
}

export function getElement(db: AppDatabase, id: ElementId): Element | undefined {
  const row = db.select().from(elements).where(eq(elements.id, id)).get();
  return row ? elementRowToDomain(row) : undefined;
}

export function listElements(db: AppDatabase, layerId: LayerId): Element[] {
  const rows = db.select().from(elements)
    .where(eq(elements.layerId, layerId))
    .orderBy(asc(elements.sortOrder))
    .all();
  return rows.map(elementRowToDomain);
}

export function listElementsByChannel(db: AppDatabase, channelId: ChannelId): Element[] {
  const rows = db.select().from(elements)
    .where(eq(elements.channelId, channelId))
    .orderBy(asc(elements.sortOrder))
    .all();
  return rows.map(elementRowToDomain);
}

export function updateElement(db: AppDatabase, id: ElementId, input: UpdateElementInput): Element {
  const values: Record<string, unknown> = { updatedAt: now() };
  if (input.name !== undefined) values.name = input.name;
  if (input.sortOrder !== undefined) values.sortOrder = input.sortOrder;
  if (input.config !== undefined) values.configJson = JSON.stringify(input.config);
  db.update(elements).set(values).where(eq(elements.id, id)).run();
  return getElement(db, id)!;
}

export function deleteElement(db: AppDatabase, id: ElementId): void {
  db.delete(elements).where(eq(elements.id, id)).run();
}
```

Merge imports into existing lines.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/andrew/Develop/CeeGee/packages/engine-core && npx vitest run tests/elements.test.ts
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/index.ts packages/engine-core/tests/elements.test.ts
git commit -m "feat(engine-core): add elements repository with tests"
```

---

## Task 11: Assets repository + tests

**Files:**
- Modify: `packages/engine-core/src/index.ts`
- Create: `packages/engine-core/tests/assets.test.ts`

Metadata-only CRUD. File serving handled in Plan 2 (API routes).

- [ ] **Step 1: Write failing tests in `packages/engine-core/tests/assets.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, type TestDb } from './helpers';
import {
  createWorkspace,
  createAsset,
  getAsset,
  listAssets,
  updateAsset,
  deleteAsset,
} from '../src/index';

describe('assets repository', () => {
  let db: TestDb;
  let workspaceId: number;

  beforeEach(() => {
    db = createTestDb();
    workspaceId = createWorkspace(db, { name: 'WS' }).id;
  });

  it('creates an asset', () => {
    const asset = createAsset(db, {
      workspaceId,
      name: 'logo.png',
      path: 'ws-1/logos/logo.png',
      mimeType: 'image/png',
      sizeBytes: 12345,
      width: 200,
      height: 100,
      tags: ['logo', 'brand'],
      folderPath: 'Logos',
    });
    expect(asset.id).toBeGreaterThan(0);
    expect(asset.name).toBe('logo.png');
    expect(asset.tags).toEqual(['logo', 'brand']);
    expect(asset.folderPath).toBe('Logos');
  });

  it('creates an asset with minimal fields', () => {
    const asset = createAsset(db, {
      workspaceId,
      name: 'bg.svg',
      path: 'ws-1/bg.svg',
      mimeType: 'image/svg+xml',
      sizeBytes: 500,
    });
    expect(asset.width).toBeNull();
    expect(asset.tags).toEqual([]);
    expect(asset.folderPath).toBeNull();
  });

  it('gets an asset by id', () => {
    const created = createAsset(db, {
      workspaceId, name: 'find.png', path: 'p', mimeType: 'image/png', sizeBytes: 1,
    });
    expect(getAsset(db, created.id)).toEqual(created);
  });

  it('lists assets for a workspace', () => {
    createAsset(db, { workspaceId, name: 'a.png', path: 'a', mimeType: 'image/png', sizeBytes: 1 });
    createAsset(db, { workspaceId, name: 'b.png', path: 'b', mimeType: 'image/png', sizeBytes: 1 });
    const all = listAssets(db, workspaceId);
    expect(all).toHaveLength(2);
  });

  it('updates an asset', () => {
    const asset = createAsset(db, {
      workspaceId, name: 'old.png', path: 'p', mimeType: 'image/png', sizeBytes: 1,
    });
    const updated = updateAsset(db, asset.id, { name: 'new.png', tags: ['updated'] });
    expect(updated.name).toBe('new.png');
    expect(updated.tags).toEqual(['updated']);
  });

  it('deletes an asset', () => {
    const asset = createAsset(db, {
      workspaceId, name: 'del.png', path: 'p', mimeType: 'image/png', sizeBytes: 1,
    });
    deleteAsset(db, asset.id);
    expect(getAsset(db, asset.id)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/andrew/Develop/CeeGee/packages/engine-core && npx vitest run tests/assets.test.ts
```

Expected: FAIL — `createAsset` is not exported.

- [ ] **Step 3: Add asset repository functions to `packages/engine-core/src/index.ts`**

```ts
import { assets } from './db/schema';
import type { Asset, AssetId, CreateAssetInput, UpdateAssetInput } from './types';

type AssetRow = typeof assets.$inferSelect;

function assetRowToDomain(row: AssetRow): Asset {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    path: row.path,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    width: row.width ?? null,
    height: row.height ?? null,
    tags: JSON.parse(row.tagsJson),
    folderPath: row.folderPath ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createAsset(db: AppDatabase, input: CreateAssetInput): Asset {
  const ts = now();
  const row = db.insert(assets).values({
    workspaceId: input.workspaceId,
    name: input.name,
    path: input.path,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    width: input.width ?? null,
    height: input.height ?? null,
    tagsJson: JSON.stringify(input.tags ?? []),
    folderPath: input.folderPath ?? null,
    createdAt: ts,
    updatedAt: ts,
  }).returning().get();
  return assetRowToDomain(row);
}

export function getAsset(db: AppDatabase, id: AssetId): Asset | undefined {
  const row = db.select().from(assets).where(eq(assets.id, id)).get();
  return row ? assetRowToDomain(row) : undefined;
}

export function listAssets(db: AppDatabase, workspaceId: WorkspaceId): Asset[] {
  const rows = db.select().from(assets).where(eq(assets.workspaceId, workspaceId)).all();
  return rows.map(assetRowToDomain);
}

export function updateAsset(db: AppDatabase, id: AssetId, input: UpdateAssetInput): Asset {
  const values: Record<string, unknown> = { updatedAt: now() };
  if (input.name !== undefined) values.name = input.name;
  if (input.tags !== undefined) values.tagsJson = JSON.stringify(input.tags);
  if (input.folderPath !== undefined) values.folderPath = input.folderPath;
  db.update(assets).set(values).where(eq(assets.id, id)).run();
  return getAsset(db, id)!;
}

export function deleteAsset(db: AppDatabase, id: AssetId): void {
  db.delete(assets).where(eq(assets.id, id)).run();
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/andrew/Develop/CeeGee/packages/engine-core && npx vitest run tests/assets.test.ts
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/index.ts packages/engine-core/tests/assets.test.ts
git commit -m "feat(engine-core): add assets repository with tests"
```

---

## Task 12: Runtime state repository + tests

**Files:**
- Modify: `packages/engine-core/src/index.ts`
- Create: `packages/engine-core/tests/runtime-state.test.ts`

Runtime state is different from other repos: it uses **upsert** (set/replace) keyed by `elementId`, and supports bulk get for a channel.

- [ ] **Step 1: Write failing tests in `packages/engine-core/tests/runtime-state.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, type TestDb } from './helpers';
import {
  createWorkspace,
  createChannel,
  createLayer,
  upsertModule,
  createElement,
  setRuntimeState,
  getRuntimeState,
  listRuntimeStateByChannel,
  clearRuntimeState,
  type UpsertModuleInput,
} from '../src/index';

const stubModule: UpsertModuleInput = {
  moduleKey: 'test.mod',
  label: 'Test',
  version: '1.0.0',
  category: 'lower-third',
  configSchema: {},
  dataSchema: {},
  actions: [],
  animationHooks: {},
};

describe('runtime state repository', () => {
  let db: TestDb;
  let elementId: number;
  let channelId: number;

  beforeEach(() => {
    db = createTestDb();
    const ws = createWorkspace(db, { name: 'WS' });
    const ch = createChannel(db, { workspaceId: ws.id, name: 'Main' });
    channelId = ch.id;
    const layer = createLayer(db, { workspaceId: ws.id, channelId: ch.id, name: 'LT', zIndex: 10 });
    const mod = upsertModule(db, stubModule);
    const el = createElement(db, {
      workspaceId: ws.id, channelId: ch.id, layerId: layer.id,
      name: 'El', moduleId: mod.id, config: {},
    });
    elementId = el.id;
  });

  it('sets runtime state for an element', () => {
    const state = setRuntimeState(db, { elementId, visibility: 'visible' });
    expect(state.elementId).toBe(elementId);
    expect(state.visibility).toBe('visible');
    expect(state.runtimeData).toEqual({});
  });

  it('updates runtime state on re-set (upsert)', () => {
    setRuntimeState(db, { elementId, visibility: 'entering' });
    const updated = setRuntimeState(db, { elementId, visibility: 'visible', runtimeData: { elapsed: 100 } });
    expect(updated.visibility).toBe('visible');
    expect((updated.runtimeData as any).elapsed).toBe(100);
  });

  it('gets runtime state for an element', () => {
    setRuntimeState(db, { elementId, visibility: 'hidden' });
    const state = getRuntimeState(db, elementId);
    expect(state).toBeDefined();
    expect(state!.visibility).toBe('hidden');
  });

  it('returns undefined for element with no state', () => {
    expect(getRuntimeState(db, elementId)).toBeUndefined();
  });

  it('lists runtime states for a channel', () => {
    const ws = createWorkspace(db, { name: 'WS2' });
    const ch2 = createChannel(db, { workspaceId: ws.id, name: 'Ch2' });
    const layer2 = createLayer(db, { workspaceId: ws.id, channelId: ch2.id, name: 'L', zIndex: 1 });
    const mod = upsertModule(db, { ...stubModule, moduleKey: 'test.mod2' });
    const el2 = createElement(db, {
      workspaceId: ws.id, channelId: ch2.id, layerId: layer2.id,
      name: 'Other', moduleId: mod.id, config: {},
    });

    setRuntimeState(db, { elementId, visibility: 'visible' });
    setRuntimeState(db, { elementId: el2.id, visibility: 'hidden' });

    const states = listRuntimeStateByChannel(db, channelId);
    expect(states).toHaveLength(1);
    expect(states[0].elementId).toBe(elementId);
  });

  it('clears runtime state for an element', () => {
    setRuntimeState(db, { elementId, visibility: 'visible' });
    clearRuntimeState(db, elementId);
    expect(getRuntimeState(db, elementId)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/andrew/Develop/CeeGee/packages/engine-core && npx vitest run tests/runtime-state.test.ts
```

Expected: FAIL — `setRuntimeState` is not exported.

- [ ] **Step 3: Add runtime state repository functions to `packages/engine-core/src/index.ts`**

```ts
import { inArray } from 'drizzle-orm';
import { elementRuntimeState } from './db/schema';
import type { ElementRuntimeState, ElementId, SetRuntimeStateInput } from './types';

type RuntimeStateRow = typeof elementRuntimeState.$inferSelect;

function runtimeStateRowToDomain(row: RuntimeStateRow): ElementRuntimeState {
  return {
    elementId: row.elementId,
    visibility: row.visibility as ElementRuntimeState['visibility'],
    runtimeData: JSON.parse(row.runtimeDataJson),
    updatedAt: row.updatedAt,
  };
}

export function setRuntimeState(db: AppDatabase, input: SetRuntimeStateInput): ElementRuntimeState {
  const ts = now();
  const existing = db.select().from(elementRuntimeState)
    .where(eq(elementRuntimeState.elementId, input.elementId)).get();

  if (existing) {
    db.update(elementRuntimeState).set({
      visibility: input.visibility,
      runtimeDataJson: JSON.stringify(input.runtimeData ?? {}),
      updatedAt: ts,
    }).where(eq(elementRuntimeState.elementId, input.elementId)).run();
  } else {
    db.insert(elementRuntimeState).values({
      elementId: input.elementId,
      visibility: input.visibility,
      runtimeDataJson: JSON.stringify(input.runtimeData ?? {}),
      updatedAt: ts,
    }).run();
  }

  return runtimeStateRowToDomain(
    db.select().from(elementRuntimeState).where(eq(elementRuntimeState.elementId, input.elementId)).get()!
  );
}

export function getRuntimeState(db: AppDatabase, elementId: ElementId): ElementRuntimeState | undefined {
  const row = db.select().from(elementRuntimeState)
    .where(eq(elementRuntimeState.elementId, elementId)).get();
  return row ? runtimeStateRowToDomain(row) : undefined;
}

export function listRuntimeStateByChannel(db: AppDatabase, channelId: ChannelId): ElementRuntimeState[] {
  const elementIds = db.select({ id: elements.id }).from(elements)
    .where(eq(elements.channelId, channelId)).all().map((r) => r.id);

  if (elementIds.length === 0) return [];

  const rows = db.select().from(elementRuntimeState)
    .where(inArray(elementRuntimeState.elementId, elementIds)).all();
  return rows.map(runtimeStateRowToDomain);
}

export function clearRuntimeState(db: AppDatabase, elementId: ElementId): void {
  db.delete(elementRuntimeState).where(eq(elementRuntimeState.elementId, elementId)).run();
}
```

Merge the `inArray` import into the existing `drizzle-orm` import. Merge `elementRuntimeState` into the schema import.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/andrew/Develop/CeeGee/packages/engine-core && npx vitest run tests/runtime-state.test.ts
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/index.ts packages/engine-core/tests/runtime-state.test.ts
git commit -m "feat(engine-core): add runtime state repository with tests"
```

---

## Task 13: Final verification + package exports

**Files:**
- Verify: `packages/engine-core/src/index.ts` (already has all exports)

- [ ] **Step 1: Run all tests**

```bash
cd /home/andrew/Develop/CeeGee/packages/engine-core && npx vitest run
```

Expected: all test files pass (db.test.ts, workspaces, channels, layers, modules, elements, assets, runtime-state). Total should be ~47 tests.

- [ ] **Step 2: Run from root workspace**

```bash
cd /home/andrew/Develop/CeeGee && pnpm test
```

Expected: engine-core tests all pass. engine-ui has no test script (that's fine — it will in Plan 4/5).

- [ ] **Step 3: Verify exports**

Check that `packages/engine-core/src/index.ts` re-exports everything needed by consumers:

- Types: all from `./types`
- DB: `createDatabase`, `AppDatabase`
- Workspace functions: `createWorkspace`, `getWorkspace`, `listWorkspaces`, `updateWorkspace`, `deleteWorkspace`
- Channel functions: `createChannel`, `getChannel`, `listChannels`, `updateChannel`, `deleteChannel`
- Layer functions: `createLayer`, `getLayer`, `listLayers`, `updateLayer`, `deleteLayer`
- Module functions: `upsertModule`, `getModule`, `getModuleByKey`, `listModules`
- Element functions: `createElement`, `getElement`, `listElements`, `listElementsByChannel`, `updateElement`, `deleteElement`
- Asset functions: `createAsset`, `getAsset`, `listAssets`, `updateAsset`, `deleteAsset`
- Runtime state functions: `setRuntimeState`, `getRuntimeState`, `listRuntimeStateByChannel`, `clearRuntimeState`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(engine-core): verify all repositories and package exports"
```
