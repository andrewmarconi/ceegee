import { describe, it, expect } from 'vitest';
import { createTestDb } from './helpers';
import { sql } from 'drizzle-orm';

describe('database setup', () => {
  it('creates all tables from migrations', () => {
    const db = createTestDb();
    const tables = db.all<{ name: string }>(
      sql`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%' ORDER BY name`
    );
    const names = tables.map((t) => t.name);

    expect(names).toContain('workspaces');
    expect(names).toContain('channels');
    expect(names).toContain('layers');
    expect(names).toContain('modules');
    expect(names).toContain('elements');
    expect(names).toContain('assets');
    expect(names).toContain('element_runtime_state');
  });

  it('enforces foreign keys', () => {
    const db = createTestDb();
    expect(() => {
      db.run(sql`INSERT INTO channels (workspace_id, name, created_at, updated_at) VALUES (999, 'bad', '2024-01-01', '2024-01-01')`);
    }).toThrow();
  });
});
