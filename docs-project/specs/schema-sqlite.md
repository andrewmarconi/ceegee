# Database Schema

## 1. Core tables

### 1.1 workspaces

```sql
CREATE TABLE workspaces (
  id                 INTEGER PRIMARY KEY,        -- auto-increment
  name               TEXT NOT NULL,
  description        TEXT,

  base_width         INTEGER NOT NULL DEFAULT 1920,
  base_height        INTEGER NOT NULL DEFAULT 1080,
  aspect_ratio       TEXT NOT NULL DEFAULT '16:9',

  safe_title_top     REAL,
  safe_title_bottom  REAL,
  safe_title_left    REAL,
  safe_title_right   REAL,
  safe_action_top    REAL,
  safe_action_bottom REAL,
  safe_action_left   REAL,
  safe_action_right  REAL,

  theme_tokens_json  TEXT NOT NULL DEFAULT '{}',

  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);
```

***

### 1.2 channels

```sql
CREATE TABLE channels (
  id            INTEGER PRIMARY KEY,
  workspace_id  INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  name          TEXT NOT NULL,
  description   TEXT,

  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX idx_channels_workspace ON channels(workspace_id);
```

***

### 1.3 layers

```sql
CREATE TABLE layers (
  id            INTEGER PRIMARY KEY,
  workspace_id  INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  channel_id    INTEGER NOT NULL REFERENCES channels(id)   ON DELETE CASCADE,

  name          TEXT NOT NULL,
  z_index       INTEGER NOT NULL,

  region        TEXT,  -- e.g. 'band-lower', 'corner-tr', etc.

  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX idx_layers_channel ON layers(channel_id);
```

***

### 1.4 modules (registry)

```sql
CREATE TABLE modules (
  id                   INTEGER PRIMARY KEY,     -- internal PK
  module_key           TEXT NOT NULL UNIQUE,    -- e.g. 'lower-third.basic'
  label                TEXT NOT NULL,
  version              TEXT NOT NULL,
  category             TEXT NOT NULL,           -- 'lower-third', 'bug', etc.

  config_schema_json   TEXT NOT NULL,
  data_schema_json     TEXT NOT NULL,

  actions_json         TEXT NOT NULL,           -- array of {id,label}
  animation_hooks_json TEXT NOT NULL,           -- {enter,exit,emphasize}
  capabilities_json    TEXT NOT NULL DEFAULT '{}',

  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL
);
```

(`module_key` is the stable code‑level identifier; `id` is numeric PK.)

Modules are **auto‑registered** at engine startup by scanning `packages/modules/`. The engine reads each module's exported `ModuleManifest` and upserts into this table (insert new, update version/schemas on change).

***

### 1.5 elements

```sql
CREATE TABLE elements (
  id            INTEGER PRIMARY KEY,
  workspace_id  INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  channel_id    INTEGER NOT NULL REFERENCES channels(id)   ON DELETE CASCADE,
  layer_id      INTEGER NOT NULL REFERENCES layers(id)     ON DELETE CASCADE,

  name          TEXT NOT NULL,
  module_id     INTEGER NOT NULL REFERENCES modules(id),   -- FK to modules
  sort_order    INTEGER NOT NULL DEFAULT 0,                 -- ordering within layer / rundown

  config_json   TEXT NOT NULL,

  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX idx_elements_workspace ON elements(workspace_id);
CREATE INDEX idx_elements_channel   ON elements(channel_id);
CREATE INDEX idx_elements_layer     ON elements(layer_id);
```

***

## 2. Assets

```sql
CREATE TABLE assets (
  id            INTEGER PRIMARY KEY,
  workspace_id  INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  name          TEXT NOT NULL,
  path          TEXT NOT NULL,   -- filesystem path relative to workspace asset dir
  mime_type     TEXT NOT NULL,
  size_bytes    INTEGER NOT NULL,

  width         INTEGER,
  height        INTEGER,

  tags_json     TEXT NOT NULL DEFAULT '[]',
  folder_path   TEXT,            -- virtual folders, e.g. 'Logos/ClientA'

  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX idx_assets_workspace ON assets(workspace_id);
```

***

## 3. Runtime state

### 3.1 element_runtime_state

```sql
CREATE TABLE element_runtime_state (
  element_id        INTEGER PRIMARY KEY REFERENCES elements(id) ON DELETE CASCADE,

  visibility        TEXT NOT NULL,            -- 'hidden' | 'entering' | 'visible' | 'exiting'
  runtime_data_json TEXT NOT NULL DEFAULT '{}',

  updated_at        TEXT NOT NULL
);
```

***

***

Deferred tables (datasources, bindings, streams) are documented in [future-development.md](future-development.md).

***

## 5. Notes

- All FK relationships use `INTEGER` IDs, matching SQLite's `INTEGER PRIMARY KEY` auto‑increment behavior.
- `created_at`/`updated_at` are `TEXT` ISO 8601 timestamps in MVP.
- `module_key` and `transform_key` allow you to map DB rows to code‑level modules/transformers without needing UUIDs.
- Slugs are not used — all entities are addressed by numeric ID in URLs and APIs.
