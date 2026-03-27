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
  type Channel,
  type ChannelId,
  type CreateChannelInput,
  type UpdateChannelInput,
  type Layer,
  type LayerId,
  type CreateLayerInput,
  type UpdateLayerInput,
  type ModuleRecord,
  type ModulePk,
  type UpsertModuleInput,
  type Element,
  type ElementId,
  type CreateElementInput,
  type UpdateElementInput,
  type Asset,
  type AssetId,
  type CreateAssetInput,
  type UpdateAssetInput,
  type ElementRuntimeState,
  type SetRuntimeStateInput,
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

// ============================================================
// Channels
// ============================================================

type ChannelRow = typeof channels.$inferSelect;

function channelRowToDomain(row: ChannelRow): Channel {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    description: row.description ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createChannel(db: AppDatabase, input: CreateChannelInput): Channel {
  const ts = now();
  const row = db.insert(channels).values({
    workspaceId: input.workspaceId,
    name: input.name,
    description: input.description ?? null,
    createdAt: ts,
    updatedAt: ts,
  }).returning().get();
  return channelRowToDomain(row);
}

export function getChannel(db: AppDatabase, id: ChannelId): Channel | undefined {
  const row = db.select().from(channels).where(eq(channels.id, id)).get();
  return row ? channelRowToDomain(row) : undefined;
}

export function listChannels(db: AppDatabase, workspaceId: WorkspaceId): Channel[] {
  const rows = db.select().from(channels).where(eq(channels.workspaceId, workspaceId)).all();
  return rows.map(channelRowToDomain);
}

export function updateChannel(db: AppDatabase, id: ChannelId, input: UpdateChannelInput): Channel {
  const values: Record<string, unknown> = { updatedAt: now() };
  if (input.name !== undefined) values.name = input.name;
  if (input.description !== undefined) values.description = input.description;
  db.update(channels).set(values).where(eq(channels.id, id)).run();
  return getChannel(db, id)!;
}

export function deleteChannel(db: AppDatabase, id: ChannelId): void {
  db.delete(channels).where(eq(channels.id, id)).run();
}

// ============================================================
// Layers
// ============================================================

type LayerRow = typeof layers.$inferSelect;

function layerRowToDomain(row: LayerRow): Layer {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    channelId: row.channelId,
    name: row.name,
    zIndex: row.zIndex,
    region: (row.region as Layer['region']) ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createLayer(db: AppDatabase, input: CreateLayerInput): Layer {
  const ts = now();
  const row = db.insert(layers).values({
    workspaceId: input.workspaceId,
    channelId: input.channelId,
    name: input.name,
    zIndex: input.zIndex,
    region: input.region ?? null,
    createdAt: ts,
    updatedAt: ts,
  }).returning().get();
  return layerRowToDomain(row);
}

export function getLayer(db: AppDatabase, id: LayerId): Layer | undefined {
  const row = db.select().from(layers).where(eq(layers.id, id)).get();
  return row ? layerRowToDomain(row) : undefined;
}

export function listLayers(db: AppDatabase, channelId: ChannelId): Layer[] {
  const rows = db.select().from(layers)
    .where(eq(layers.channelId, channelId))
    .orderBy(asc(layers.zIndex))
    .all();
  return rows.map(layerRowToDomain);
}

export function updateLayer(db: AppDatabase, id: LayerId, input: UpdateLayerInput): Layer {
  const values: Record<string, unknown> = { updatedAt: now() };
  if (input.name !== undefined) values.name = input.name;
  if (input.zIndex !== undefined) values.zIndex = input.zIndex;
  if (input.region !== undefined) values.region = input.region;
  db.update(layers).set(values).where(eq(layers.id, id)).run();
  return getLayer(db, id)!;
}

export function deleteLayer(db: AppDatabase, id: LayerId): void {
  db.delete(layers).where(eq(layers.id, id)).run();
}

// ============================================================
// Modules
// ============================================================

type ModuleRow = typeof modules.$inferSelect;

function moduleRowToDomain(row: ModuleRow): ModuleRecord {
  return {
    id: row.id,
    moduleKey: row.moduleKey,
    label: row.label,
    version: row.version,
    category: row.category,
    configSchema: JSON.parse(row.configSchemaJson),
    dataSchema: JSON.parse(row.dataSchemaJson),
    actions: JSON.parse(row.actionsJson),
    animationHooks: JSON.parse(row.animationHooksJson),
    capabilities: JSON.parse(row.capabilitiesJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function upsertModule(db: AppDatabase, input: UpsertModuleInput): ModuleRecord {
  const ts = now();
  const existing = db.select().from(modules).where(eq(modules.moduleKey, input.moduleKey)).get();

  if (existing) {
    db.update(modules).set({
      label: input.label,
      version: input.version,
      category: input.category,
      configSchemaJson: JSON.stringify(input.configSchema),
      dataSchemaJson: JSON.stringify(input.dataSchema),
      actionsJson: JSON.stringify(input.actions),
      animationHooksJson: JSON.stringify(input.animationHooks),
      capabilitiesJson: JSON.stringify(input.capabilities ?? {}),
      updatedAt: ts,
    }).where(eq(modules.id, existing.id)).run();
    return moduleRowToDomain(db.select().from(modules).where(eq(modules.id, existing.id)).get()!);
  }

  const row = db.insert(modules).values({
    moduleKey: input.moduleKey,
    label: input.label,
    version: input.version,
    category: input.category,
    configSchemaJson: JSON.stringify(input.configSchema),
    dataSchemaJson: JSON.stringify(input.dataSchema),
    actionsJson: JSON.stringify(input.actions),
    animationHooksJson: JSON.stringify(input.animationHooks),
    capabilitiesJson: JSON.stringify(input.capabilities ?? {}),
    createdAt: ts,
    updatedAt: ts,
  }).returning().get();
  return moduleRowToDomain(row);
}

export function getModuleByKey(db: AppDatabase, moduleKey: string): ModuleRecord | undefined {
  const row = db.select().from(modules).where(eq(modules.moduleKey, moduleKey)).get();
  return row ? moduleRowToDomain(row) : undefined;
}

export function getModule(db: AppDatabase, id: ModulePk): ModuleRecord | undefined {
  const row = db.select().from(modules).where(eq(modules.id, id)).get();
  return row ? moduleRowToDomain(row) : undefined;
}

export function listModules(db: AppDatabase): ModuleRecord[] {
  const rows = db.select().from(modules).all();
  return rows.map(moduleRowToDomain);
}

// ============================================================
// Elements
// ============================================================

type ElementRow = typeof elements.$inferSelect;

function elementRowToDomain(row: ElementRow): Element {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    channelId: row.channelId,
    layerId: row.layerId,
    name: row.name,
    moduleId: row.moduleId,
    sortOrder: row.sortOrder,
    config: JSON.parse(row.configJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createElement(db: AppDatabase, input: CreateElementInput): Element {
  const ts = now();
  const row = db.insert(elements).values({
    workspaceId: input.workspaceId,
    channelId: input.channelId,
    layerId: input.layerId,
    name: input.name,
    moduleId: input.moduleId,
    sortOrder: input.sortOrder ?? 0,
    configJson: JSON.stringify(input.config),
    createdAt: ts,
    updatedAt: ts,
  }).returning().get();
  return elementRowToDomain(row);
}

export function getElement(db: AppDatabase, id: ElementId): Element | undefined {
  const row = db.select().from(elements).where(eq(elements.id, id)).get();
  return row ? elementRowToDomain(row) : undefined;
}

export function listElements(db: AppDatabase, layerId: LayerId): Element[] {
  const rows = db.select().from(elements)
    .where(eq(elements.layerId, layerId))
    .orderBy(asc(elements.sortOrder))
    .all();
  return rows.map(elementRowToDomain);
}

export function listElementsByChannel(db: AppDatabase, channelId: ChannelId): Element[] {
  const rows = db.select().from(elements)
    .where(eq(elements.channelId, channelId))
    .orderBy(asc(elements.sortOrder))
    .all();
  return rows.map(elementRowToDomain);
}

export function updateElement(db: AppDatabase, id: ElementId, input: UpdateElementInput): Element {
  const values: Record<string, unknown> = { updatedAt: now() };
  if (input.name !== undefined) values.name = input.name;
  if (input.sortOrder !== undefined) values.sortOrder = input.sortOrder;
  if (input.config !== undefined) values.configJson = JSON.stringify(input.config);
  db.update(elements).set(values).where(eq(elements.id, id)).run();
  return getElement(db, id)!;
}

export function deleteElement(db: AppDatabase, id: ElementId): void {
  db.delete(elements).where(eq(elements.id, id)).run();
}

// ============================================================
// Assets
// ============================================================

type AssetRow = typeof assets.$inferSelect;

function assetRowToDomain(row: AssetRow): Asset {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    path: row.path,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    width: row.width ?? null,
    height: row.height ?? null,
    tags: JSON.parse(row.tagsJson),
    folderPath: row.folderPath ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createAsset(db: AppDatabase, input: CreateAssetInput): Asset {
  const ts = now();
  const row = db.insert(assets).values({
    workspaceId: input.workspaceId,
    name: input.name,
    path: input.path,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    width: input.width ?? null,
    height: input.height ?? null,
    tagsJson: JSON.stringify(input.tags ?? []),
    folderPath: input.folderPath ?? null,
    createdAt: ts,
    updatedAt: ts,
  }).returning().get();
  return assetRowToDomain(row);
}

export function getAsset(db: AppDatabase, id: AssetId): Asset | undefined {
  const row = db.select().from(assets).where(eq(assets.id, id)).get();
  return row ? assetRowToDomain(row) : undefined;
}

export function listAssets(db: AppDatabase, workspaceId: WorkspaceId): Asset[] {
  const rows = db.select().from(assets).where(eq(assets.workspaceId, workspaceId)).all();
  return rows.map(assetRowToDomain);
}

export function updateAsset(db: AppDatabase, id: AssetId, input: UpdateAssetInput): Asset {
  const values: Record<string, unknown> = { updatedAt: now() };
  if (input.name !== undefined) values.name = input.name;
  if (input.tags !== undefined) values.tagsJson = JSON.stringify(input.tags);
  if (input.folderPath !== undefined) values.folderPath = input.folderPath;
  db.update(assets).set(values).where(eq(assets.id, id)).run();
  return getAsset(db, id)!;
}

export function deleteAsset(db: AppDatabase, id: AssetId): void {
  db.delete(assets).where(eq(assets.id, id)).run();
}

// ============================================================
// Runtime State
// ============================================================

type RuntimeStateRow = typeof elementRuntimeState.$inferSelect;

function runtimeStateRowToDomain(row: RuntimeStateRow): ElementRuntimeState {
  return {
    elementId: row.elementId,
    visibility: row.visibility as ElementRuntimeState['visibility'],
    runtimeData: JSON.parse(row.runtimeDataJson),
    updatedAt: row.updatedAt,
  };
}

export function setRuntimeState(db: AppDatabase, input: SetRuntimeStateInput): ElementRuntimeState {
  const ts = now();
  const existing = db.select().from(elementRuntimeState)
    .where(eq(elementRuntimeState.elementId, input.elementId)).get();

  if (existing) {
    db.update(elementRuntimeState).set({
      visibility: input.visibility,
      runtimeDataJson: JSON.stringify(input.runtimeData ?? {}),
      updatedAt: ts,
    }).where(eq(elementRuntimeState.elementId, input.elementId)).run();
  } else {
    db.insert(elementRuntimeState).values({
      elementId: input.elementId,
      visibility: input.visibility,
      runtimeDataJson: JSON.stringify(input.runtimeData ?? {}),
      updatedAt: ts,
    }).run();
  }

  return runtimeStateRowToDomain(
    db.select().from(elementRuntimeState).where(eq(elementRuntimeState.elementId, input.elementId)).get()!
  );
}

export function getRuntimeState(db: AppDatabase, elementId: ElementId): ElementRuntimeState | undefined {
  const row = db.select().from(elementRuntimeState)
    .where(eq(elementRuntimeState.elementId, elementId)).get();
  return row ? runtimeStateRowToDomain(row) : undefined;
}

export function listRuntimeStateByChannel(db: AppDatabase, channelId: ChannelId): ElementRuntimeState[] {
  const elementIds = db.select({ id: elements.id }).from(elements)
    .where(eq(elements.channelId, channelId)).all().map((r) => r.id);

  if (elementIds.length === 0) return [];

  const rows = db.select().from(elementRuntimeState)
    .where(inArray(elementRuntimeState.elementId, elementIds)).all();
  return rows.map(runtimeStateRowToDomain);
}

export function clearRuntimeState(db: AppDatabase, elementId: ElementId): void {
  db.delete(elementRuntimeState).where(eq(elementRuntimeState.elementId, elementId)).run();
}

// Engine state
export { buildChannelState, take, clear, elementAction } from './engine';
