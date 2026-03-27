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
  take,
  clear,
  elementAction,
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

    take(db, elA.id);
    const state = take(db, elB.id);

    const stateA = state.layers[0].elements.find((e) => e.elementId === elA.id);
    const stateB = state.layers[0].elements.find((e) => e.elementId === elB.id);
    expect(stateA?.visibility).toBe('hidden');
    expect(stateB?.visibility).toBe('visible');
  });

  it('does not affect elements on other layers', () => {
    const layer2Id = createLayer(db, { workspaceId, channelId, name: 'Bugs', zIndex: 20 }).id;
    const elA = createElement(db, { workspaceId, channelId, layerId, name: 'LT', moduleId, config: {} });
    const elB = createElement(db, { workspaceId, channelId, layerId: layer2Id, name: 'Bug', moduleId, config: {} });

    take(db, elB.id);
    const state = take(db, elA.id);

    const bugLayer = state.layers.find((l) => l.layerId === layer2Id);
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
