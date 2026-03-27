import { createDatabase } from '../src/db/connection';

export type TestDb = ReturnType<typeof createDatabase>;

export function createTestDb(): TestDb {
  return createDatabase(':memory:');
}
