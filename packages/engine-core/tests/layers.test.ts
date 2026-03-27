import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, type TestDb } from './helpers';
import {
  createWorkspace,
  createChannel,
  deleteChannel,
  createLayer,
  getLayer,
  listLayers,
  updateLayer,
  deleteLayer,
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
