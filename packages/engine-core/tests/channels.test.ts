import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, type TestDb } from './helpers';
import {
  createWorkspace,
  deleteWorkspace,
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
