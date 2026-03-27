import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

// -- Workspaces --

export const workspaces = sqliteTable('workspaces', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),

  baseWidth: integer('base_width').notNull().default(1920),
  baseHeight: integer('base_height').notNull().default(1080),
  aspectRatio: text('aspect_ratio').notNull().default('16:9'),

  safeTitleTop: real('safe_title_top'),
  safeTitleBottom: real('safe_title_bottom'),
  safeTitleLeft: real('safe_title_left'),
  safeTitleRight: real('safe_title_right'),
  safeActionTop: real('safe_action_top'),
  safeActionBottom: real('safe_action_bottom'),
  safeActionLeft: real('safe_action_left'),
  safeActionRight: real('safe_action_right'),

  themeTokensJson: text('theme_tokens_json').notNull().default('{}'),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// -- Channels --

export const channels = sqliteTable('channels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workspaceId: integer('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  description: text('description'),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_channels_workspace').on(table.workspaceId),
]);

// -- Layers --

export const layers = sqliteTable('layers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workspaceId: integer('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  channelId: integer('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  zIndex: integer('z_index').notNull(),
  region: text('region'),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_layers_channel').on(table.channelId),
]);

// -- Modules --

export const modules = sqliteTable('modules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  moduleKey: text('module_key').notNull().unique(),
  label: text('label').notNull(),
  version: text('version').notNull(),
  category: text('category').notNull(),

  configSchemaJson: text('config_schema_json').notNull(),
  dataSchemaJson: text('data_schema_json').notNull(),
  actionsJson: text('actions_json').notNull(),
  animationHooksJson: text('animation_hooks_json').notNull(),
  capabilitiesJson: text('capabilities_json').notNull().default('{}'),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// -- Elements --

export const elements = sqliteTable('elements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workspaceId: integer('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  channelId: integer('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  layerId: integer('layer_id').notNull().references(() => layers.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  moduleId: integer('module_id').notNull().references(() => modules.id),
  sortOrder: integer('sort_order').notNull().default(0),

  configJson: text('config_json').notNull(),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_elements_workspace').on(table.workspaceId),
  index('idx_elements_channel').on(table.channelId),
  index('idx_elements_layer').on(table.layerId),
]);

// -- Assets --

export const assets = sqliteTable('assets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workspaceId: integer('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  path: text('path').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),

  width: integer('width'),
  height: integer('height'),

  tagsJson: text('tags_json').notNull().default('[]'),
  folderPath: text('folder_path'),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_assets_workspace').on(table.workspaceId),
]);

// -- Element Runtime State --

export const elementRuntimeState = sqliteTable('element_runtime_state', {
  elementId: integer('element_id').primaryKey().references(() => elements.id, { onDelete: 'cascade' }),

  visibility: text('visibility').notNull(),
  runtimeDataJson: text('runtime_data_json').notNull().default('{}'),

  updatedAt: text('updated_at').notNull(),
});
