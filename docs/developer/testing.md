# Testing

CeeGee uses Vitest for testing. Tests currently cover `packages/engine-core`.

## Running tests

```bash
# Run all tests across the monorepo
pnpm test

# Run engine-core tests only
cd packages/engine-core
pnpm test

# Watch mode
pnpm vitest --watch
```

## Test structure

```
packages/engine-core/tests/
├── helpers.ts              # Shared test utilities
├── db.test.ts              # Database connection and migration
├── engine.test.ts          # Engine logic (buildChannelState, take, clear, elementAction)
├── workspaces.test.ts      # Workspace CRUD
├── channels.test.ts        # Channel CRUD
├── layers.test.ts          # Layer CRUD
├── elements.test.ts        # Element CRUD
├── modules.test.ts         # Module upsert and queries
├── assets.test.ts          # Asset CRUD
└── runtime-state.test.ts   # Runtime state operations
```

## Test helpers

`tests/helpers.ts` provides a utility for creating isolated in-memory databases:

```ts
import { createDatabase } from '../src/index';

export type TestDb = ReturnType<typeof createDatabase>;

export function createTestDb(): TestDb {
  return createDatabase(':memory:');
}
```

Each test file creates a fresh in-memory database in `beforeEach`, ensuring complete isolation between tests.

## Writing tests

### Pattern

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createWorkspace,
  listWorkspaces,
  // ... other functions
} from '../src/index';
import { createTestDb, type TestDb } from './helpers';

describe('workspaces', () => {
  let db: TestDb;

  beforeEach(() => {
    db = createTestDb();
  });

  it('creates a workspace', () => {
    const ws = createWorkspace(db, {
      name: 'Test',
      displayConfig: {
        baseWidth: 1920,
        baseHeight: 1080,
        aspectRatio: '16:9',
      },
      themeTokens: {},
    });

    expect(ws.id).toBeDefined();
    expect(ws.name).toBe('Test');
  });
});
```

### Conventions

- Use in-memory SQLite (`:memory:`) for test databases. No files to clean up.
- Create a fresh database per test via `beforeEach`.
- Import functions and types from `../src/index`.
- Test one domain area per file.
- Test both the happy path and edge cases (not found, duplicate keys, cascade deletes).

## Configuration

`packages/engine-core/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: '.',
  },
});
```

## What to test

When adding new functionality to `engine-core`:

- **CRUD operations**: Verify create, read, list, update, and delete for each entity.
- **Engine logic**: Test state mutations from `take()`, `clear()`, `elementAction()`.
- **State building**: Verify `buildChannelState()` assembles the correct structure.
- **Edge cases**: Missing entities, cascade deletes, duplicate module keys.
- **Data integrity**: Ensure JSON fields serialize/deserialize correctly.
