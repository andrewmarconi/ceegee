import type { ModuleManifest, JsonSchemaLike } from 'engine-core';

export const bugBasicManifest: ModuleManifest = {
  id: 'bug.basic',
  label: 'Basic Brand Bug',
  version: '1.0.0',
  category: 'bug',

  configSchema: {
    type: 'object',
    properties: {
      text: { type: 'string', title: 'Label' },
      logoAssetId: { type: ['integer', 'null'], title: 'Logo' },
      position: { type: 'string', enum: ['top-right', 'top-left', 'bottom-right', 'bottom-left'], default: 'top-right' },
    },
    required: ['position'],
  } satisfies JsonSchemaLike,

  dataSchema: { type: 'object', properties: { text: { type: 'string' } } } satisfies JsonSchemaLike,

  actions: [
    { id: 'show', label: 'Show' },
    { id: 'hide', label: 'Hide' },
  ],

  animationHooks: { enter: 'fadeScale', exit: 'fadeOut' },
  capabilities: { supportsLayerRegions: true },
};
