import { createDatabase, type AppDatabase } from 'engine-core';
import { join, resolve } from 'path';
import { mkdirSync, existsSync } from 'fs';

let _db: AppDatabase | null = null;

function findMigrationsDir(): string {
  // Try multiple possible locations for the drizzle migrations folder
  const candidates = [
    // From engine-ui (pnpm workspace link)
    resolve(process.cwd(), '../../packages/engine-core/drizzle'),
    // From monorepo root
    resolve(process.cwd(), 'packages/engine-core/drizzle'),
    // Relative to this file via import.meta.url
    new URL('../../../../packages/engine-core/drizzle', import.meta.url).pathname,
  ];

  for (const dir of candidates) {
    if (existsSync(join(dir, 'meta', '_journal.json'))) {
      return dir;
    }
  }

  throw new Error(`Cannot find drizzle migrations. Tried: ${candidates.join(', ')}`);
}

export function useDb(): AppDatabase {
  if (!_db) {
    const dataDir = join(process.cwd(), 'data');
    mkdirSync(dataDir, { recursive: true });
    _db = createDatabase(join(dataDir, 'ceegee.db'), findMigrationsDir());
  }
  return _db;
}
