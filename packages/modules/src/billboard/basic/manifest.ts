import type { ModuleManifest, JsonSchemaLike } from 'engine-core';

export const billboardBasicManifest: ModuleManifest = {
  id: 'billboard.basic',
  label: 'Basic Billboard',
  version: '1.0.0',
  category: 'billboard',

  configSchema: {
    type: 'object',
    properties: {
      headline: { type: 'string', title: 'Headline' },
      subline: { type: 'string', title: 'Subline' },
      alignment: { type: 'string', enum: ['left', 'center', 'right'], default: 'center' },
    },
    required: ['headline', 'alignment'],
  } satisfies JsonSchemaLike,

  dataSchema: {
    type: 'object',
    properties: { headline: { type: 'string' }, subline: { type: 'string' } },
    required: ['headline'],
  } satisfies JsonSchemaLike,

  actions: [
    { id: 'show', label: 'Show' },
    { id: 'hide', label: 'Hide' },
  ],

  animationHooks: { enter: 'fadeScale', exit: 'fadeOut' },
  capabilities: { supportsLayerRegions: true },
};
