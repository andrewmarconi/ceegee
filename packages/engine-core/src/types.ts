// -- ID types (auto-increment integers from SQLite) --

export type WorkspaceId = number;
export type ChannelId = number;
export type LayerId = number;
export type ModulePk = number;
export type ElementId = number;
export type AssetId = number;
export type IsoDateTime = string;

// -- Workspace --

export type SafeAreaPct = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type WorkspaceDisplayConfig = {
  baseWidth: number;
  baseHeight: number;
  aspectRatio: string;
  safeTitle?: SafeAreaPct;
  safeAction?: SafeAreaPct;
};

export type ThemeTokens = Record<string, string>;

export type Workspace = {
  id: WorkspaceId;
  name: string;
  description: string | null;
  displayConfig: WorkspaceDisplayConfig;
  themeTokens: ThemeTokens;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type CreateWorkspaceInput = {
  name: string;
  description?: string | null;
  displayConfig?: Partial<WorkspaceDisplayConfig>;
  themeTokens?: ThemeTokens;
};

export type UpdateWorkspaceInput = Partial<CreateWorkspaceInput>;

// -- Channel --

export type Channel = {
  id: ChannelId;
  workspaceId: WorkspaceId;
  name: string;
  description: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type CreateChannelInput = {
  workspaceId: WorkspaceId;
  name: string;
  description?: string | null;
};

export type UpdateChannelInput = Partial<Omit<CreateChannelInput, 'workspaceId'>>;

// -- Layer --

export type LayerRegion =
  | 'band-lower'
  | 'band-upper'
  | 'corner-tl'
  | 'corner-tr'
  | 'corner-bl'
  | 'corner-br'
  | 'full'
  | (string & {});

export type Layer = {
  id: LayerId;
  workspaceId: WorkspaceId;
  channelId: ChannelId;
  name: string;
  zIndex: number;
  region: LayerRegion | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type CreateLayerInput = {
  workspaceId: WorkspaceId;
  channelId: ChannelId;
  name: string;
  zIndex: number;
  region?: LayerRegion | null;
};

export type UpdateLayerInput = Partial<Omit<CreateLayerInput, 'workspaceId' | 'channelId'>>;

// -- Module --

export type JsonSchemaLike = Record<string, unknown>;

export type ModuleAction = {
  id: string;
  label: string;
};

export type ModuleAnimationHooks = {
  enter?: string;
  exit?: string;
  emphasize?: string;
};

export type ModuleCapabilities = {
  supportsLayerRegions?: boolean;
  supportsMultipleInstancesPerLayer?: boolean;
};

export type ThemeTokenDef = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'dropdown';
  default: string;
  options?: string[];
};

export type ModuleCategory =
  | 'lower-third'
  | 'bug'
  | 'billboard'
  | 'clock'
  | 'countdown'
  | (string & {});

export type ModuleRecord = {
  id: ModulePk;
  moduleKey: string;
  label: string;
  version: string;
  category: ModuleCategory;
  configSchema: JsonSchemaLike;
  dataSchema: JsonSchemaLike;
  actions: ModuleAction[];
  animationHooks: ModuleAnimationHooks;
  capabilities: ModuleCapabilities;
  themeTokens: ThemeTokenDef[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type UpsertModuleInput = {
  moduleKey: string;
  label: string;
  version: string;
  category: ModuleCategory;
  configSchema: JsonSchemaLike;
  dataSchema: JsonSchemaLike;
  actions: ModuleAction[];
  animationHooks: ModuleAnimationHooks;
  capabilities?: ModuleCapabilities;
  themeTokens?: ThemeTokenDef[];
};

// ModuleManifest is the runtime contract exported by each module package.
// It mirrors UpsertModuleInput but uses `id` as the stable key.
export type ModuleManifest = {
  id: string;                  // stable key, e.g. "lower-third.basic"
  label: string;
  version: string;
  category: ModuleCategory;
  configSchema: JsonSchemaLike;
  dataSchema: JsonSchemaLike;
  actions: ModuleAction[];
  animationHooks: ModuleAnimationHooks;
  capabilities?: ModuleCapabilities;
  themeTokens?: ThemeTokenDef[];
};

// Props passed to every module's Vue component by OverlayHost
export type ModuleComponentProps = {
  workspace: Workspace;
  channel: Channel;
  layer: Layer;
  element: Element;
  config: unknown;
  runtimeState: ElementRuntimeState;
};

// -- Element --

export type Element = {
  id: ElementId;
  workspaceId: WorkspaceId;
  channelId: ChannelId;
  layerId: LayerId;
  name: string;
  moduleId: ModulePk;
  sortOrder: number;
  config: unknown;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type CreateElementInput = {
  workspaceId: WorkspaceId;
  channelId: ChannelId;
  layerId: LayerId;
  name: string;
  moduleId: ModulePk;
  sortOrder?: number;
  config: unknown;
};

export type UpdateElementInput = Partial<Pick<CreateElementInput, 'name' | 'sortOrder' | 'config'>>;

// -- Asset --

export type Asset = {
  id: AssetId;
  workspaceId: WorkspaceId;
  name: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  tags: string[];
  folderPath: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type CreateAssetInput = {
  workspaceId: WorkspaceId;
  name: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  tags?: string[];
  folderPath?: string | null;
};

export type UpdateAssetInput = Partial<Pick<CreateAssetInput, 'name' | 'tags' | 'folderPath'>>;

// -- Runtime State --

export type ElementVisibility = 'hidden' | 'entering' | 'visible' | 'exiting';

export type ElementRuntimeState = {
  elementId: ElementId;
  visibility: ElementVisibility;
  runtimeData: unknown;
  updatedAt: IsoDateTime;
};

export type SetRuntimeStateInput = {
  elementId: ElementId;
  visibility: ElementVisibility;
  runtimeData?: unknown;
};

// -- Engine state (in-memory, built from DB) --

export type LayerState = {
  layerId: LayerId;
  elements: ElementRuntimeState[];
};

export type ChannelState = {
  workspaceId: WorkspaceId;
  channelId: ChannelId;
  layers: LayerState[];
};

// -- WebSocket events --

export type EngineEvent =
  | { type: 'state:init'; payload: ChannelState }
  | { type: 'state:update'; payload: ChannelState }
  | {
      type: 'element:action';
      payload: {
        workspaceId: WorkspaceId;
        channelId: ChannelId;
        elementId: ElementId;
        actionId: string;
        args?: unknown;
      };
    }
  | { type: 'telemetry'; payload: unknown };

// -- Helpers --

export function now(): IsoDateTime {
  return new Date().toISOString();
}
