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
