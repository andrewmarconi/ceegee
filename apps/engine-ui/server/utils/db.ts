import { createDatabase, type AppDatabase } from 'engine-core';
import { join } from 'path';
import { mkdirSync } from 'fs';

let _db: AppDatabase | null = null;

export function useDb(): AppDatabase {
  if (!_db) {
    const dataDir = join(process.cwd(), 'data');
    mkdirSync(dataDir, { recursive: true });
    _db = createDatabase(join(dataDir, 'ceegee.db'));
  }
  return _db;
}
