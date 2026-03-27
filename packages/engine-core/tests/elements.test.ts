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
