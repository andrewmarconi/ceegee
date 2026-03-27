# Typescript Schema

## App / engine types

```ts
// ids — all auto-increment unsigned integers from SQLite
export type WorkspaceId = number;
export type ChannelId = number;
export type LayerId = number;
export type ModulePk = number;      // DB PK for modules table
export type ElementId = number;
export type AssetId = number;

// timestamps
export type IsoDateTime = string;

// workspace

export type SafeAreaPct = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type WorkspaceDisplayConfig = {
  baseWidth: number;    // e.g. 1920
  baseHeight: number;   // e.g. 1080
  aspectRatio: string;  // "16:9"
  safeTitle?: SafeAreaPct;
  safeAction?: SafeAreaPct;
};

export type ThemeTokens = Record<string, string>; // CSS var name -> value

export type Workspace = {
  id: WorkspaceId;
  name: string;
  description?: string | null;

  displayConfig: WorkspaceDisplayConfig;
  themeTokens: ThemeTokens;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

// channel

export type Channel = {
  id: ChannelId;
  workspaceId: WorkspaceId;

  name: string;
  description?: string | null;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

// layer

export type LayerRegion =
  | 'band-lower'
  | 'band-upper'
  | 'corner-tl'
  | 'corner-tr'
  | 'corner-bl'
  | 'corner-br'
  | 'full'
  | string;

export type Layer = {
  id: LayerId;
  workspaceId: WorkspaceId;
  channelId: ChannelId;

  name: string;
  zIndex: number;
  region?: LayerRegion | null;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

// module (DB registry row, not the runtime module itself)

export type ModuleCategory =
  | 'lower-third'
  | 'bug'
  | 'billboard'
  | 'clock'
  | 'countdown'
  | string;

export type ModuleDbRow = {
  id: ModulePk;            // numeric PK
  moduleKey: string;       // stable key, e.g. "lower-third.basic"
  label: string;
  version: string;
  category: ModuleCategory;

  configSchemaJson: string;
  dataSchemaJson: string;
  actionsJson: string;
  animationHooksJson: string;
  capabilitiesJson: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

// element

export type Element = {
  id: ElementId;
  workspaceId: WorkspaceId;
  channelId: ChannelId;
  layerId: LayerId;

  name: string;
  moduleId: ModulePk;
  sortOrder: number;       // ordering within layer / rundown

  config: unknown;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

// runtime state

export type ElementVisibility =
  | 'hidden'
  | 'entering'
  | 'visible'
  | 'exiting';

export type ElementRuntimeState = {
  elementId: ElementId;
  visibility: ElementVisibility;
  runtimeData?: unknown;
  updatedAt: IsoDateTime;
};

export type LayerState = {
  layerId: LayerId;
  elements: ElementRuntimeState[];
};

export type ChannelState = {
  workspaceId: WorkspaceId;
  channelId: ChannelId;
  layers: LayerState[];
};

export type EngineState = {
  workspaces: Map<
    WorkspaceId,
    {
      channels: Map<ChannelId, ChannelState>;
    }
  >;
};

// assets

export type Asset = {
  id: AssetId;
  workspaceId: WorkspaceId;

  name: string;
  path: string;
  mimeType: string;
  sizeBytes: number;

  width?: number | null;
  height?: number | null;

  tags: string[];
  folderPath?: string | null;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

// engine events over WebSocket

export type EngineEvent =
  | {
      type: 'state:init';
      payload: ChannelState;
    }
  | {
      type: 'state:update';
      payload: ChannelState;  // full replacement of channel state
    }
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
  | {
      type: 'telemetry';
      payload: unknown;
    };
```

***

## Module / transform types

These are the **runtime** contracts for graphics modules and transform plugins.

```ts
// generic JSON-ish schema placeholder
export type JsonSchemaLike = Record<string, unknown>;

// Module runtime manifest

export type ModuleAction = {
  id: string;    // e.g. "show", "hide", "start", "stop", "reset"
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
};

// The props passed into a module's Vue component

export type ModuleComponentProps = {
  workspace: Workspace;
  channel: Channel;
  layer: Layer;
  element: Element;
  config: unknown;            // typed per module
  runtimeState: ElementRuntimeState;
};
```



Deferred types (Datasources, Transforms, Streams) are documented in [future-development.md](future-development.md).
