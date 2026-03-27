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
