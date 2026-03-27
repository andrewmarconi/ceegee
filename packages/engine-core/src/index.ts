import { eq, asc, inArray } from 'drizzle-orm';
import {
  workspaces,
  channels,
  layers,
  modules,
  elements,
  assets,
  elementRuntimeState,
} from './db/schema';
import type { AppDatabase } from './db/connection';
import {
  now,
  type Workspace,
  type WorkspaceId,
  type CreateWorkspaceInput,
  type UpdateWorkspaceInput,
  type WorkspaceDisplayConfig,
} from './types';

// Re-export types and db utilities
export * from './types';
export { createDatabase, type AppDatabase } from './db/connection';

// ============================================================
// Workspaces
// ============================================================

type WorkspaceRow = typeof workspaces.$inferSelect;

function workspaceRowToDomain(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    displayConfig: {
      baseWidth: row.baseWidth,
      baseHeight: row.baseHeight,
      aspectRatio: row.aspectRatio,
      safeTitle: row.safeTitleTop != null
        ? { top: row.safeTitleTop, bottom: row.safeTitleBottom!, left: row.safeTitleLeft!, right: row.safeTitleRight! }
        : undefined,
      safeAction: row.safeActionTop != null
        ? { top: row.safeActionTop, bottom: row.safeActionBottom!, left: row.safeActionLeft!, right: row.safeActionRight! }
        : undefined,
    },
    themeTokens: JSON.parse(row.themeTokensJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createWorkspace(db: AppDatabase, input: CreateWorkspaceInput): Workspace {
  const dc: WorkspaceDisplayConfig = {
    baseWidth: 1920,
    baseHeight: 1080,
    aspectRatio: '16:9',
    ...input.displayConfig,
  };
  const ts = now();
  const row = db.insert(workspaces).values({
    name: input.name,
    description: input.description ?? null,
    baseWidth: dc.baseWidth,
    baseHeight: dc.baseHeight,
    aspectRatio: dc.aspectRatio,
    safeTitleTop: dc.safeTitle?.top ?? null,
    safeTitleBottom: dc.safeTitle?.bottom ?? null,
    safeTitleLeft: dc.safeTitle?.left ?? null,
    safeTitleRight: dc.safeTitle?.right ?? null,
    safeActionTop: dc.safeAction?.top ?? null,
    safeActionBottom: dc.safeAction?.bottom ?? null,
    safeActionLeft: dc.safeAction?.left ?? null,
    safeActionRight: dc.safeAction?.right ?? null,
    themeTokensJson: JSON.stringify(input.themeTokens ?? {}),
    createdAt: ts,
    updatedAt: ts,
  }).returning().get();
  return workspaceRowToDomain(row);
}

export function getWorkspace(db: AppDatabase, id: WorkspaceId): Workspace | undefined {
  const row = db.select().from(workspaces).where(eq(workspaces.id, id)).get();
  return row ? workspaceRowToDomain(row) : undefined;
}

export function listWorkspaces(db: AppDatabase): Workspace[] {
  const rows = db.select().from(workspaces).all();
  return rows.map(workspaceRowToDomain);
}

export function updateWorkspace(db: AppDatabase, id: WorkspaceId, input: UpdateWorkspaceInput): Workspace {
  const existing = getWorkspace(db, id);
  if (!existing) throw new Error(`Workspace ${id} not found`);

  const values: Record<string, unknown> = { updatedAt: now() };
  if (input.name !== undefined) values.name = input.name;
  if (input.description !== undefined) values.description = input.description;
  if (input.themeTokens !== undefined) values.themeTokensJson = JSON.stringify(input.themeTokens);
  if (input.displayConfig !== undefined) {
    const dc = { ...existing.displayConfig, ...input.displayConfig };
    values.baseWidth = dc.baseWidth;
    values.baseHeight = dc.baseHeight;
    values.aspectRatio = dc.aspectRatio;
    values.safeTitleTop = dc.safeTitle?.top ?? null;
    values.safeTitleBottom = dc.safeTitle?.bottom ?? null;
    values.safeTitleLeft = dc.safeTitle?.left ?? null;
    values.safeTitleRight = dc.safeTitle?.right ?? null;
    values.safeActionTop = dc.safeAction?.top ?? null;
    values.safeActionBottom = dc.safeAction?.bottom ?? null;
    values.safeActionLeft = dc.safeAction?.left ?? null;
    values.safeActionRight = dc.safeAction?.right ?? null;
  }

  db.update(workspaces).set(values).where(eq(workspaces.id, id)).run();
  return getWorkspace(db, id)!;
}

export function deleteWorkspace(db: AppDatabase, id: WorkspaceId): void {
  db.delete(workspaces).where(eq(workspaces.id, id)).run();
}
