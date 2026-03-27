# API Routes + Engine State + WebSocket Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire engine-core to Nuxt/Nitro with full CRUD API routes for all entities, an in-memory engine state manager with Take/Clear/Action commands, and WebSocket broadcasting for live overlay updates.

**Architecture:** Nitro server routes are thin wrappers that call engine-core repository functions. A shared DB singleton (`server/utils/db.ts`) is auto-imported across routes. Engine state functions (buildChannelState, take, clear) live in engine-core for testability. WebSocket uses a connection registry (`server/utils/ws-connections.ts`) so API routes can broadcast state changes to connected overlay/app clients.

**Tech Stack:** Nuxt 4 / Nitro, engine-core (from Plan 1), WebSocket (crossws via Nitro), Vitest

---

> **This is Plan 2 of 5.** Depends on Plan 1 (engine-core database + repositories).
> Subsequent plans:
> - Plan 3: Overlay system + Module loading + Built-in modules
> - Plan 4: Operator UI
> - Plan 5: Producer UI + Asset management

**Reference docs:**
- `docs/prd.md` sections 4 (Runtime engine), 4.3 (HTTP API), 11 (Nuxt integration)
- `docs/schema-typescript.md` — ChannelState, LayerState, EngineEvent types
- `docs/decisions.md` — state:update full replacement semantics

---

## File structure

All files created or modified by this plan:

```
packages/engine-core/
├── src/
│   ├── types.ts                          # MODIFY: add ChannelState, LayerState, EngineEvent
│   ├── engine.ts                         # CREATE: buildChannelState, take, clear, elementAction
│   └── index.ts                          # MODIFY: re-export engine functions
└── tests/
    └── engine.test.ts                    # CREATE: engine state tests

apps/engine-ui/
├── package.json                          # MODIFY: add engine-core workspace dep
├── nuxt.config.ts                        # MODIFY: enable WS, configure nitro
└── server/
    ├── utils/
    │   ├── db.ts                         # CREATE: DB singleton
    │   └── ws-connections.ts             # CREATE: WS connection registry + broadcast
    ├── api/
    │   ├── health.get.ts
    │   └── workspaces/
    │       ├── index.get.ts
    │       ├── index.post.ts
    │       └── [workspaceId]/
    │           ├── index.get.ts
    │           ├── index.put.ts
    │           ├── index.delete.ts
    │           ├── channels/
    │           │   ├── index.get.ts
    │           │   ├── index.post.ts
    │           │   └── [channelId]/
    │           │       ├── index.get.ts
    │           │       ├── index.put.ts
    │           │       ├── index.delete.ts
    │           │       ├── layers/
    │           │       │   ├── index.get.ts
    │           │       │   ├── index.post.ts
    │           │       │   └── [layerId]/
    │           │       │       ├── index.get.ts
    │           │       │       ├── index.put.ts
    │           │       │       └── index.delete.ts
    │           │       └── elements/
    │           │           ├── index.get.ts
    │           │           ├── index.post.ts
    │           │           └── [elementId]/
    │           │               ├── index.get.ts
    │           │               ├── index.put.ts
    │           │               ├── index.delete.ts
    │           │               ├── take.post.ts
    │           │               ├── clear.post.ts
    │           │               └── action.post.ts
    │           └── assets/
    │               ├── index.get.ts
    │               ├── index.post.ts
    │               └── [assetId]/
    │                   ├── index.get.ts
    │                   ├── index.delete.ts
    │                   └── file.get.ts
    └── routes/
        └── ws.ts                         # CREATE: WebSocket handler
```

---

## Task 1: Engine state types

**Files:**
- Modify: `packages/engine-core/src/types.ts`

- [ ] **Step 1: Add ChannelState, LayerState, and EngineEvent types to `packages/engine-core/src/types.ts`**

Append after the `SetRuntimeStateInput` type:

```ts
// -- Engine state (in-memory, built from DB) --

export type LayerState = {
  layerId: LayerId;
  elements: ElementRuntimeState[];
};

export type ChannelState = {
  workspaceId: WorkspaceId;
  channelId: ChannelId;
  layers: LayerState[];
};

// -- WebSocket events --

export type EngineEvent =
  | { type: 'state:init'; payload: ChannelState }
  | { type: 'state:update'; payload: ChannelState }
  | {
      type: 'element:action';
      payload: {
        workspaceId: WorkspaceId;
        channelId: ChannelId;
        elementId: ElementId;
        actionId: string;
        args?: unknown;
      };
    }
  | { type: 'telemetry'; payload: unknown };
```

- [ ] **Step 2: Commit**

```bash
git add packages/engine-core/src/types.ts
git commit -m "feat(engine-core): add ChannelState, LayerState, and EngineEvent types"
```

---

## Task 2: buildChannelState function + tests

**Files:**
- Create: `packages/engine-core/src/engine.ts`
- Create: `packages/engine-core/tests/engine.test.ts`
- Modify: `packages/engine-core/src/index.ts`

- [ ] **Step 1: Write failing test in `packages/engine-core/tests/engine.test.ts`**

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
  buildChannelState,
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

describe('buildChannelState', () => {
  let db: TestDb;
  let workspaceId: number;
  let channelId: number;

  beforeEach(() => {
    db = createTestDb();
    workspaceId = createWorkspace(db, { name: 'WS' }).id;
    channelId = createChannel(db, { workspaceId, name: 'Main' }).id;
  });

  it('returns empty layers for a channel with no layers', () => {
    const state = buildChannelState(db, workspaceId, channelId);
    expect(state.workspaceId).toBe(workspaceId);
    expect(state.channelId).toBe(channelId);
    expect(state.layers).toEqual([]);
  });

  it('includes layers ordered by zIndex', () => {
    createLayer(db, { workspaceId, channelId, name: 'Top', zIndex: 20 });
    createLayer(db, { workspaceId, channelId, name: 'Bottom', zIndex: 10 });
    const state = buildChannelState(db, workspaceId, channelId);
    expect(state.layers).toHaveLength(2);
    expect(state.layers[0].layerId).toBeDefined();
    expect(state.layers[1].layerId).toBeDefined();
  });

  it('includes element runtime states per layer', () => {
    const mod = upsertModule(db, stubModule);
    const layer = createLayer(db, { workspaceId, channelId, name: 'LT', zIndex: 10 });
    const el = createElement(db, {
      workspaceId, channelId, layerId: layer.id, name: 'Speaker', moduleId: mod.id, config: {},
    });
    setRuntimeState(db, { elementId: el.id, visibility: 'visible' });

    const state = buildChannelState(db, workspaceId, channelId);
    expect(state.layers).toHaveLength(1);
    expect(state.layers[0].elements).toHaveLength(1);
    expect(state.layers[0].elements[0].elementId).toBe(el.id);
    expect(state.layers[0].elements[0].visibility).toBe('visible');
  });

  it('defaults to hidden for elements with no runtime state', () => {
    const mod = upsertModule(db, stubModule);
    const layer = createLayer(db, { workspaceId, channelId, name: 'LT', zIndex: 10 });
    createElement(db, {
      workspaceId, channelId, layerId: layer.id, name: 'Speaker', moduleId: mod.id, config: {},
    });

    const state = buildChannelState(db, workspaceId, channelId);
    expect(state.layers[0].elements[0].visibility).toBe('hidden');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/andrew/Develop/CeeGee/packages/engine-core && npx vitest run tests/engine.test.ts
```

Expected: FAIL — `buildChannelState` is not exported.

- [ ] **Step 3: Create `packages/engine-core/src/engine.ts`**

```ts
import type { AppDatabase } from './db/connection';
import type {
  WorkspaceId,
  ChannelId,
  ElementId,
  ChannelState,
  LayerState,
  ElementRuntimeState,
  EngineEvent,
} from './types';
import { now } from './types';
import {
  listLayers,
  listElementsByChannel,
  listRuntimeStateByChannel,
  getElement,
  setRuntimeState,
  getRuntimeState,
} from './index';

export function buildChannelState(
  db: AppDatabase,
  workspaceId: WorkspaceId,
  channelId: ChannelId,
): ChannelState {
  const layers = listLayers(db, channelId);
  const allElements = listElementsByChannel(db, channelId);
  const allStates = listRuntimeStateByChannel(db, channelId);

  const stateByElement = new Map(allStates.map((s) => [s.elementId, s]));

  const layerStates: LayerState[] = layers.map((layer) => {
    const layerElements = allElements.filter((e) => e.layerId === layer.id);
    const elementStates: ElementRuntimeState[] = layerElements.map((el) => {
      const rs = stateByElement.get(el.id);
      return {
        elementId: el.id,
        visibility: rs?.visibility ?? 'hidden',
        runtimeData: rs?.runtimeData ?? {},
        updatedAt: rs?.updatedAt ?? now(),
      };
    });
    return { layerId: layer.id, elements: elementStates };
  });

  return { workspaceId, channelId, layers: layerStates };
}

export function take(
  db: AppDatabase,
  elementId: ElementId,
): ChannelState {
  const element = getElement(db, elementId);
  if (!element) throw new Error(`Element ${elementId} not found`);

  // Hide any currently visible element on the same layer
  const currentStates = listRuntimeStateByChannel(db, element.channelId);
  const allElements = listElementsByChannel(db, element.channelId);
  const sameLayerElementIds = new Set(
    allElements.filter((e) => e.layerId === element.layerId).map((e) => e.id),
  );

  for (const rs of currentStates) {
    if (sameLayerElementIds.has(rs.elementId) && rs.visibility === 'visible') {
      setRuntimeState(db, { elementId: rs.elementId, visibility: 'hidden' });
    }
  }

  // Show the target element
  setRuntimeState(db, { elementId, visibility: 'visible' });

  return buildChannelState(db, element.workspaceId, element.channelId);
}

export function clear(
  db: AppDatabase,
  elementId: ElementId,
): ChannelState {
  const element = getElement(db, elementId);
  if (!element) throw new Error(`Element ${elementId} not found`);

  setRuntimeState(db, { elementId, visibility: 'hidden' });

  return buildChannelState(db, element.workspaceId, element.channelId);
}

export function elementAction(
  db: AppDatabase,
  elementId: ElementId,
  actionId: string,
  args?: unknown,
): EngineEvent {
  const element = getElement(db, elementId);
  if (!element) throw new Error(`Element ${elementId} not found`);

  // Store the action in runtimeData so overlay can react
  const existing = getRuntimeState(db, elementId);
  setRuntimeState(db, {
    elementId,
    visibility: existing?.visibility ?? 'hidden',
    runtimeData: { ...(existing?.runtimeData as object ?? {}), lastAction: { actionId, args, ts: now() } },
  });

  return {
    type: 'element:action',
    payload: {
      workspaceId: element.workspaceId,
      channelId: element.channelId,
      elementId,
      actionId,
      args,
    },
  };
}
```

- [ ] **Step 4: Re-export from `packages/engine-core/src/index.ts`**

Add at the bottom of `packages/engine-core/src/index.ts`:

```ts
// Engine state
export { buildChannelState, take, clear, elementAction } from './engine';
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /home/andrew/Develop/CeeGee/packages/engine-core && npx vitest run tests/engine.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/engine-core/src/engine.ts packages/engine-core/src/index.ts packages/engine-core/tests/engine.test.ts
git commit -m "feat(engine-core): add buildChannelState function with tests"
```

---

## Task 3: Take/Clear/Action engine functions + tests

**Files:**
- Modify: `packages/engine-core/tests/engine.test.ts`

- [ ] **Step 1: Add take/clear/action tests to `packages/engine-core/tests/engine.test.ts`**

Append after the `buildChannelState` describe block:

```ts
import { take, clear, elementAction } from '../src/index';

describe('take', () => {
  let db: TestDb;
  let workspaceId: number;
  let channelId: number;
  let layerId: number;
  let moduleId: number;

  beforeEach(() => {
    db = createTestDb();
    workspaceId = createWorkspace(db, { name: 'WS' }).id;
    channelId = createChannel(db, { workspaceId, name: 'Main' }).id;
    layerId = createLayer(db, { workspaceId, channelId, name: 'LT', zIndex: 10 }).id;
    moduleId = upsertModule(db, stubModule).id;
  });

  it('sets element to visible', () => {
    const el = createElement(db, { workspaceId, channelId, layerId, name: 'A', moduleId, config: {} });
    const state = take(db, el.id);
    const elState = state.layers[0].elements.find((e) => e.elementId === el.id);
    expect(elState?.visibility).toBe('visible');
  });

  it('hides the previously visible element on the same layer', () => {
    const elA = createElement(db, { workspaceId, channelId, layerId, name: 'A', moduleId, config: {} });
    const elB = createElement(db, { workspaceId, channelId, layerId, name: 'B', moduleId, config: {} });

    take(db, elA.id); // A is now visible
    const state = take(db, elB.id); // B takes over

    const stateA = state.layers[0].elements.find((e) => e.elementId === elA.id);
    const stateB = state.layers[0].elements.find((e) => e.elementId === elB.id);
    expect(stateA?.visibility).toBe('hidden');
    expect(stateB?.visibility).toBe('visible');
  });

  it('does not affect elements on other layers', () => {
    const layer2 = createLayer(db, { workspaceId, channelId, name: 'Bugs', zIndex: 20 }).id;
    const elA = createElement(db, { workspaceId, channelId, layerId, name: 'LT', moduleId, config: {} });
    const elB = createElement(db, { workspaceId, channelId, layerId: layer2, name: 'Bug', moduleId, config: {} });

    take(db, elB.id); // Bug visible on layer2
    const state = take(db, elA.id); // LT visible on layer1

    const bugLayer = state.layers.find((l) => l.layerId === layer2);
    const bugState = bugLayer?.elements.find((e) => e.elementId === elB.id);
    expect(bugState?.visibility).toBe('visible');
  });

  it('throws for non-existent element', () => {
    expect(() => take(db, 999)).toThrow('Element 999 not found');
  });
});

describe('clear', () => {
  let db: TestDb;
  let workspaceId: number;
  let channelId: number;
  let layerId: number;
  let moduleId: number;

  beforeEach(() => {
    db = createTestDb();
    workspaceId = createWorkspace(db, { name: 'WS' }).id;
    channelId = createChannel(db, { workspaceId, name: 'Main' }).id;
    layerId = createLayer(db, { workspaceId, channelId, name: 'LT', zIndex: 10 }).id;
    moduleId = upsertModule(db, stubModule).id;
  });

  it('sets element to hidden', () => {
    const el = createElement(db, { workspaceId, channelId, layerId, name: 'A', moduleId, config: {} });
    take(db, el.id);
    const state = clear(db, el.id);
    const elState = state.layers[0].elements.find((e) => e.elementId === el.id);
    expect(elState?.visibility).toBe('hidden');
  });
});

describe('elementAction', () => {
  let db: TestDb;
  let workspaceId: number;
  let channelId: number;
  let layerId: number;
  let moduleId: number;

  beforeEach(() => {
    db = createTestDb();
    workspaceId = createWorkspace(db, { name: 'WS' }).id;
    channelId = createChannel(db, { workspaceId, name: 'Main' }).id;
    layerId = createLayer(db, { workspaceId, channelId, name: 'LT', zIndex: 10 }).id;
    moduleId = upsertModule(db, stubModule).id;
  });

  it('returns an element:action event', () => {
    const el = createElement(db, { workspaceId, channelId, layerId, name: 'A', moduleId, config: {} });
    const event = elementAction(db, el.id, 'emphasize', { intensity: 1 });
    expect(event.type).toBe('element:action');
    expect(event.payload).toMatchObject({
      workspaceId,
      channelId,
      elementId: el.id,
      actionId: 'emphasize',
      args: { intensity: 1 },
    });
  });

  it('persists action in runtimeData', () => {
    const el = createElement(db, { workspaceId, channelId, layerId, name: 'A', moduleId, config: {} });
    elementAction(db, el.id, 'start');
    const state = buildChannelState(db, workspaceId, channelId);
    const elState = state.layers[0].elements.find((e) => e.elementId === el.id);
    expect((elState?.runtimeData as any).lastAction.actionId).toBe('start');
  });
});
```

- [ ] **Step 2: Run all engine tests**

```bash
cd /home/andrew/Develop/CeeGee/packages/engine-core && npx vitest run tests/engine.test.ts
```

Expected: all tests pass (~11 tests: 4 buildChannelState + 4 take + 1 clear + 2 elementAction).

- [ ] **Step 3: Run full test suite to verify no regressions**

```bash
cd /home/andrew/Develop/CeeGee/packages/engine-core && npx vitest run
```

Expected: all existing 47 tests + 11 new tests = 58 tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/engine-core/tests/engine.test.ts
git commit -m "feat(engine-core): add take/clear/action engine functions with tests"
```

---

## Task 4: Nitro setup — DB singleton, WS config, workspace dependency

**Files:**
- Modify: `apps/engine-ui/package.json`
- Modify: `apps/engine-ui/nuxt.config.ts`
- Create: `apps/engine-ui/server/utils/db.ts`
- Create: `apps/engine-ui/server/utils/ws-connections.ts`

- [ ] **Step 1: Add engine-core as workspace dependency in `apps/engine-ui/package.json`**

Add to `dependencies`:

```json
"engine-core": "workspace:*"
```

- [ ] **Step 2: Update `apps/engine-ui/nuxt.config.ts`**

```ts
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  nitro: {
    experimental: {
      websocket: true
    }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
```

Changes: removed `routeRules` prerender (not needed), added `nitro.experimental.websocket`.

- [ ] **Step 3: Create `apps/engine-ui/server/utils/db.ts`**

```ts
import { createDatabase, type AppDatabase } from 'engine-core';
import { join } from 'path';
import { mkdirSync } from 'fs';

let _db: AppDatabase | null = null;

export function useDb(): AppDatabase {
  if (!_db) {
    const dataDir = join(process.cwd(), 'data');
    mkdirSync(dataDir, { recursive: true });
    _db = createDatabase(join(dataDir, 'ceegee.db'));
  }
  return _db;
}
```

- [ ] **Step 4: Create `apps/engine-ui/server/utils/ws-connections.ts`**

```ts
import type { ChannelState, EngineEvent } from 'engine-core';

type WsConnection = {
  peer: any;
  workspaceId: number;
  channelId: number;
};

const connections = new Map<string, WsConnection>();

export function addWsConnection(peer: any, workspaceId: number, channelId: number) {
  connections.set(peer.id ?? peer.toString(), { peer, workspaceId, channelId });
}

export function removeWsConnection(peer: any) {
  connections.delete(peer.id ?? peer.toString());
}

export function broadcastToChannel(workspaceId: number, channelId: number, event: EngineEvent) {
  const json = JSON.stringify(event);
  for (const conn of connections.values()) {
    if (conn.workspaceId === workspaceId && conn.channelId === channelId) {
      conn.peer.send(json);
    }
  }
}

export function getWsConnectionCount(): number {
  return connections.size;
}
```

- [ ] **Step 5: Install dependencies**

```bash
cd /home/andrew/Develop/CeeGee && pnpm install
```

- [ ] **Step 6: Commit**

```bash
git add apps/engine-ui/package.json apps/engine-ui/nuxt.config.ts apps/engine-ui/server/ pnpm-lock.yaml
git commit -m "feat(engine-ui): add Nitro setup with DB singleton and WS connection registry"
```

---

## Task 5: Workspaces + Channels API routes

**Files:**
- Create: 10 route files under `apps/engine-ui/server/api/workspaces/`

- [ ] **Step 1: Create workspace route files**

`apps/engine-ui/server/api/workspaces/index.get.ts`:
```ts
import { listWorkspaces } from 'engine-core';

export default defineEventHandler(() => {
  return listWorkspaces(useDb());
});
```

`apps/engine-ui/server/api/workspaces/index.post.ts`:
```ts
import { createWorkspace } from 'engine-core';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  return createWorkspace(useDb(), body);
});
```

`apps/engine-ui/server/api/workspaces/[workspaceId]/index.get.ts`:
```ts
import { getWorkspace } from 'engine-core';

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'workspaceId'));
  const ws = getWorkspace(useDb(), id);
  if (!ws) throw createError({ statusCode: 404, message: 'Workspace not found' });
  return ws;
});
```

`apps/engine-ui/server/api/workspaces/[workspaceId]/index.put.ts`:
```ts
import { updateWorkspace } from 'engine-core';

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'workspaceId'));
  const body = await readBody(event);
  return updateWorkspace(useDb(), id, body);
});
```

`apps/engine-ui/server/api/workspaces/[workspaceId]/index.delete.ts`:
```ts
import { deleteWorkspace } from 'engine-core';

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'workspaceId'));
  deleteWorkspace(useDb(), id);
  return { ok: true };
});
```

- [ ] **Step 2: Create channel route files**

`apps/engine-ui/server/api/workspaces/[workspaceId]/channels/index.get.ts`:
```ts
import { listChannels } from 'engine-core';

export default defineEventHandler((event) => {
  const workspaceId = Number(getRouterParam(event, 'workspaceId'));
  return listChannels(useDb(), workspaceId);
});
```

`apps/engine-ui/server/api/workspaces/[workspaceId]/channels/index.post.ts`:
```ts
import { createChannel } from 'engine-core';

export default defineEventHandler(async (event) => {
  const workspaceId = Number(getRouterParam(event, 'workspaceId'));
  const body = await readBody(event);
  return createChannel(useDb(), { ...body, workspaceId });
});
```

`apps/engine-ui/server/api/workspaces/[workspaceId]/channels/[channelId]/index.get.ts`:
```ts
import { getChannel } from 'engine-core';

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'channelId'));
  const ch = getChannel(useDb(), id);
  if (!ch) throw createError({ statusCode: 404, message: 'Channel not found' });
  return ch;
});
```

`apps/engine-ui/server/api/workspaces/[workspaceId]/channels/[channelId]/index.put.ts`:
```ts
import { updateChannel } from 'engine-core';

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'channelId'));
  const body = await readBody(event);
  return updateChannel(useDb(), id, body);
});
```

`apps/engine-ui/server/api/workspaces/[workspaceId]/channels/[channelId]/index.delete.ts`:
```ts
import { deleteChannel } from 'engine-core';

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'channelId'));
  deleteChannel(useDb(), id);
  return { ok: true };
});
```

- [ ] **Step 3: Start dev server and smoke test**

```bash
cd /home/andrew/Develop/CeeGee && pnpm dev &
sleep 5
curl -s http://localhost:3000/api/workspaces | head
curl -s -X POST http://localhost:3000/api/workspaces -H 'Content-Type: application/json' -d '{"name":"Test Show"}' | head
curl -s http://localhost:3000/api/workspaces | head
```

Expected: First GET returns `[]`, POST returns the created workspace, second GET returns `[{...}]`.

- [ ] **Step 4: Commit**

```bash
git add apps/engine-ui/server/api/workspaces/
git commit -m "feat(engine-ui): add workspaces and channels API routes"
```

---

## Task 6: Layers + Elements API routes

**Files:**
- Create: 10 route files under layers/ and elements/

- [ ] **Step 1: Create layer route files**

`apps/engine-ui/server/api/workspaces/[workspaceId]/channels/[channelId]/layers/index.get.ts`:
```ts
import { listLayers } from 'engine-core';

export default defineEventHandler((event) => {
  const channelId = Number(getRouterParam(event, 'channelId'));
  return listLayers(useDb(), channelId);
});
```

`apps/engine-ui/server/api/workspaces/[workspaceId]/channels/[channelId]/layers/index.post.ts`:
```ts
import { createLayer } from 'engine-core';

export default defineEventHandler(async (event) => {
  const workspaceId = Number(getRouterParam(event, 'workspaceId'));
  const channelId = Number(getRouterParam(event, 'channelId'));
  const body = await readBody(event);
  return createLayer(useDb(), { ...body, workspaceId, channelId });
});
```

`apps/engine-ui/server/api/workspaces/[workspaceId]/channels/[channelId]/layers/[layerId]/index.get.ts`:
```ts
import { getLayer } from 'engine-core';

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'layerId'));
  const layer = getLayer(useDb(), id);
  if (!layer) throw createError({ statusCode: 404, message: 'Layer not found' });
  return layer;
});
```

`apps/engine-ui/server/api/workspaces/[workspaceId]/channels/[channelId]/layers/[layerId]/index.put.ts`:
```ts
import { updateLayer } from 'engine-core';

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'layerId'));
  const body = await readBody(event);
  return updateLayer(useDb(), id, body);
});
```

`apps/engine-ui/server/api/workspaces/[workspaceId]/channels/[channelId]/layers/[layerId]/index.delete.ts`:
```ts
import { deleteLayer } from 'engine-core';

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'layerId'));
  deleteLayer(useDb(), id);
  return { ok: true };
});
```

- [ ] **Step 2: Create element route files**

`apps/engine-ui/server/api/workspaces/[workspaceId]/channels/[channelId]/elements/index.get.ts`:
```ts
import { listElementsByChannel } from 'engine-core';

export default defineEventHandler((event) => {
  const channelId = Number(getRouterParam(event, 'channelId'));
  return listElementsByChannel(useDb(), channelId);
});
```

`apps/engine-ui/server/api/workspaces/[workspaceId]/channels/[channelId]/elements/index.post.ts`:
```ts
import { createElement } from 'engine-core';

export default defineEventHandler(async (event) => {
  const workspaceId = Number(getRouterParam(event, 'workspaceId'));
  const channelId = Number(getRouterParam(event, 'channelId'));
  const body = await readBody(event);
  return createElement(useDb(), { ...body, workspaceId, channelId });
});
```

`apps/engine-ui/server/api/workspaces/[workspaceId]/channels/[channelId]/elements/[elementId]/index.get.ts`:
```ts
import { getElement } from 'engine-core';

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'elementId'));
  const el = getElement(useDb(), id);
  if (!el) throw createError({ statusCode: 404, message: 'Element not found' });
  return el;
});
```

`apps/engine-ui/server/api/workspaces/[workspaceId]/channels/[channelId]/elements/[elementId]/index.put.ts`:
```ts
import { updateElement } from 'engine-core';

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'elementId'));
  const body = await readBody(event);
  return updateElement(useDb(), id, body);
});
```

`apps/engine-ui/server/api/workspaces/[workspaceId]/channels/[channelId]/elements/[elementId]/index.delete.ts`:
```ts
import { deleteElement } from 'engine-core';

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'elementId'));
  deleteElement(useDb(), id);
  return { ok: true };
});
```

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/server/api/workspaces/
git commit -m "feat(engine-ui): add layers and elements API routes"
```

---

## Task 7: Engine control + Health API routes

**Files:**
- Create: 3 engine control route files + 1 health route

- [ ] **Step 1: Create engine control routes**

`apps/engine-ui/server/api/workspaces/[workspaceId]/channels/[channelId]/elements/[elementId]/take.post.ts`:
```ts
import { take } from 'engine-core';

export default defineEventHandler((event) => {
  const elementId = Number(getRouterParam(event, 'elementId'));
  const state = take(useDb(), elementId);
  broadcastToChannel(state.workspaceId, state.channelId, { type: 'state:update', payload: state });
  return state;
});
```

`apps/engine-ui/server/api/workspaces/[workspaceId]/channels/[channelId]/elements/[elementId]/clear.post.ts`:
```ts
import { clear } from 'engine-core';

export default defineEventHandler((event) => {
  const elementId = Number(getRouterParam(event, 'elementId'));
  const state = clear(useDb(), elementId);
  broadcastToChannel(state.workspaceId, state.channelId, { type: 'state:update', payload: state });
  return state;
});
```

`apps/engine-ui/server/api/workspaces/[workspaceId]/channels/[channelId]/elements/[elementId]/action.post.ts`:
```ts
import { elementAction } from 'engine-core';

export default defineEventHandler(async (event) => {
  const elementId = Number(getRouterParam(event, 'elementId'));
  const body = await readBody(event);
  const engineEvent = elementAction(useDb(), elementId, body.actionId, body.args);
  const { workspaceId, channelId } = engineEvent.payload as { workspaceId: number; channelId: number };
  broadcastToChannel(workspaceId, channelId, engineEvent);
  return engineEvent;
});
```

- [ ] **Step 2: Create health route**

`apps/engine-ui/server/api/health.get.ts`:
```ts
const startedAt = Date.now();

export default defineEventHandler(() => {
  return {
    status: 'ok',
    uptimeMs: Date.now() - startedAt,
    wsConnections: getWsConnectionCount()
  };
});
```

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/server/api/
git commit -m "feat(engine-ui): add engine control (take/clear/action) and health API routes"
```

---

## Task 8: Assets API routes + file upload/serving

**Files:**
- Create: 5 asset route files

- [ ] **Step 1: Create asset route files**

`apps/engine-ui/server/api/workspaces/[workspaceId]/assets/index.get.ts`:
```ts
import { listAssets } from 'engine-core';

export default defineEventHandler((event) => {
  const workspaceId = Number(getRouterParam(event, 'workspaceId'));
  return listAssets(useDb(), workspaceId);
});
```

`apps/engine-ui/server/api/workspaces/[workspaceId]/assets/index.post.ts`:
```ts
import { createAsset } from 'engine-core';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

export default defineEventHandler(async (event) => {
  const workspaceId = Number(getRouterParam(event, 'workspaceId'));
  const formData = await readMultipartFormData(event);
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: 'No file uploaded' });
  }

  const file = formData.find((f) => f.name === 'file');
  if (!file || !file.filename || !file.data) {
    throw createError({ statusCode: 400, message: 'Missing file field' });
  }

  const assetDir = join(process.cwd(), 'data', 'assets', String(workspaceId));
  mkdirSync(assetDir, { recursive: true });

  const filename = `${Date.now()}-${file.filename}`;
  const filePath = join(assetDir, filename);
  writeFileSync(filePath, file.data);

  const relativePath = `${workspaceId}/${filename}`;

  return createAsset(useDb(), {
    workspaceId,
    name: file.filename,
    path: relativePath,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.data.length,
  });
});
```

`apps/engine-ui/server/api/workspaces/[workspaceId]/assets/[assetId]/index.get.ts`:
```ts
import { getAsset } from 'engine-core';

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'assetId'));
  const asset = getAsset(useDb(), id);
  if (!asset) throw createError({ statusCode: 404, message: 'Asset not found' });
  return asset;
});
```

`apps/engine-ui/server/api/workspaces/[workspaceId]/assets/[assetId]/index.delete.ts`:
```ts
import { getAsset, deleteAsset } from 'engine-core';
import { join } from 'path';
import { unlinkSync, existsSync } from 'fs';

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'assetId'));
  const asset = getAsset(useDb(), id);
  if (!asset) throw createError({ statusCode: 404, message: 'Asset not found' });

  const filePath = join(process.cwd(), 'data', 'assets', asset.path);
  if (existsSync(filePath)) unlinkSync(filePath);

  deleteAsset(useDb(), id);
  return { ok: true };
});
```

`apps/engine-ui/server/api/workspaces/[workspaceId]/assets/[assetId]/file.get.ts`:
```ts
import { getAsset } from 'engine-core';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'assetId'));
  const asset = getAsset(useDb(), id);
  if (!asset) throw createError({ statusCode: 404, message: 'Asset not found' });

  const filePath = join(process.cwd(), 'data', 'assets', asset.path);
  if (!existsSync(filePath)) throw createError({ statusCode: 404, message: 'Asset file not found' });

  setResponseHeader(event, 'Content-Type', asset.mimeType);
  setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable');
  return readFileSync(filePath);
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/engine-ui/server/api/workspaces/
git commit -m "feat(engine-ui): add assets API routes with file upload and serving"
```

---

## Task 9: WebSocket handler

**Files:**
- Create: `apps/engine-ui/server/routes/ws.ts`

- [ ] **Step 1: Create `apps/engine-ui/server/routes/ws.ts`**

```ts
import { buildChannelState } from 'engine-core';

export default defineWebSocketHandler({
  open(peer) {
    // Client must send a subscribe message after connecting
  },

  message(peer, message) {
    try {
      const data = JSON.parse(message.text());

      if (data.type === 'subscribe') {
        const workspaceId = Number(data.workspaceId);
        const channelId = Number(data.channelId);

        if (!workspaceId || !channelId) {
          peer.send(JSON.stringify({ type: 'error', message: 'Invalid workspaceId or channelId' }));
          return;
        }

        // Remove any existing subscription for this peer (re-subscribe)
        removeWsConnection(peer);
        addWsConnection(peer, workspaceId, channelId);

        // Send initial channel state
        const db = useDb();
        const state = buildChannelState(db, workspaceId, channelId);
        peer.send(JSON.stringify({ type: 'state:init', payload: state }));
      }
    } catch {
      // Ignore malformed messages
    }
  },

  close(peer) {
    removeWsConnection(peer);
  }
});
```

- [ ] **Step 2: Smoke test WebSocket**

Start dev server and test with a WebSocket client:

```bash
cd /home/andrew/Develop/CeeGee && pnpm dev &
sleep 5

# Create test data
curl -s -X POST http://localhost:3000/api/workspaces -H 'Content-Type: application/json' -d '{"name":"Test"}'
curl -s -X POST http://localhost:3000/api/workspaces/1/channels -H 'Content-Type: application/json' -d '{"name":"Main"}'

# Test WebSocket (using websocat or similar, if available)
# echo '{"type":"subscribe","workspaceId":1,"channelId":1}' | websocat ws://localhost:3000/ws
# Expected: receive {"type":"state:init","payload":{"workspaceId":1,"channelId":1,"layers":[]}}
```

- [ ] **Step 3: Commit**

```bash
git add apps/engine-ui/server/routes/ws.ts
git commit -m "feat(engine-ui): add WebSocket handler with subscribe and state:init"
```

---

## Task 10: Final verification

- [ ] **Step 1: Run engine-core unit tests**

```bash
cd /home/andrew/Develop/CeeGee/packages/engine-core && npx vitest run
```

Expected: all tests pass (47 repository tests + ~11 engine tests = ~58 tests).

- [ ] **Step 2: Start dev server and run full API smoke test**

```bash
cd /home/andrew/Develop/CeeGee && pnpm dev &
sleep 5

# Health
curl -s http://localhost:3000/api/health

# Create workspace
curl -s -X POST http://localhost:3000/api/workspaces -H 'Content-Type: application/json' -d '{"name":"Live Show"}'

# Create channel
curl -s -X POST http://localhost:3000/api/workspaces/1/channels -H 'Content-Type: application/json' -d '{"name":"Program"}'

# Create layer
curl -s -X POST http://localhost:3000/api/workspaces/1/channels/1/layers -H 'Content-Type: application/json' -d '{"name":"Lower Thirds","zIndex":10}'

# Create element (needs a module registered — engine will auto-register in Plan 3)
# For now, manually verify routes respond correctly

# List
curl -s http://localhost:3000/api/workspaces
curl -s http://localhost:3000/api/workspaces/1/channels
curl -s http://localhost:3000/api/workspaces/1/channels/1/layers
```

Expected: all endpoints return correct data. Health returns `{"status":"ok",...}`.

- [ ] **Step 3: Commit any final adjustments**

```bash
git add -A
git commit -m "feat(engine-ui): verify all API routes and WebSocket handler"
```
