import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, type TestDb } from './helpers';
import {
  upsertModule,
  getModuleByKey,
  listModules,
  type UpsertModuleInput,
  type ThemeTokenDef,
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
  themeTokens: [
    { key: '--lt-primary-color', label: 'Primary Color', type: 'text', default: '#ffffff' },
    { key: '--lt-size', label: 'Size', type: 'dropdown', default: 'medium', options: ['small', 'medium', 'large'] },
  ],
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

  it('persists and retrieves themeTokens', () => {
    const mod = upsertModule(db, sampleModule);
    expect(mod.themeTokens).toHaveLength(2);
    expect(mod.themeTokens[0]).toEqual({
      key: '--lt-primary-color',
      label: 'Primary Color',
      type: 'text',
      default: '#ffffff',
    });
    expect(mod.themeTokens[1]).toEqual({
      key: '--lt-size',
      label: 'Size',
      type: 'dropdown',
      default: 'medium',
      options: ['small', 'medium', 'large'],
    });
  });

  it('defaults themeTokens to empty array when not provided', () => {
    const { themeTokens: _, ...inputWithout } = sampleModule;
    const mod = upsertModule(db, inputWithout as UpsertModuleInput);
    expect(mod.themeTokens).toEqual([]);
  });
});
