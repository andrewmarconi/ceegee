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
