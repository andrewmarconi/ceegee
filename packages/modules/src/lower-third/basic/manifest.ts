import type { ModuleManifest, JsonSchemaLike } from 'engine-core';

export const lowerThirdBasicManifest: ModuleManifest = {
  id: 'lower-third.basic',
  label: 'Basic Lower Third',
  version: '1.0.0',
  category: 'lower-third',

  configSchema: {
    type: 'object',
    properties: {
      primaryText: { type: 'string', title: 'Name' },
      secondaryText: { type: 'string', title: 'Title / Role' },
      tertiaryText: { type: 'string', title: 'Pronouns / Org' },
      alignment: { type: 'string', enum: ['left', 'right', 'center'], default: 'left' },
      variant: { type: 'string', enum: ['solid', 'glass', 'outline'], default: 'solid' },
      showLogo: { type: 'boolean', default: false },
      logoAssetId: { type: ['integer', 'null'] },
    },
    required: ['primaryText', 'alignment', 'variant', 'showLogo'],
  } satisfies JsonSchemaLike,

  dataSchema: {
    type: 'object',
    properties: {
      primaryText: { type: 'string' },
      secondaryText: { type: 'string' },
      tertiaryText: { type: 'string' },
    },
    required: ['primaryText'],
  } satisfies JsonSchemaLike,

  actions: [
    { id: 'show', label: 'Show' },
    { id: 'hide', label: 'Hide' },
    { id: 'emphasize', label: 'Emphasize' },
  ],

  animationHooks: { enter: 'slideUp', exit: 'slideDown', emphasize: 'pulse' },

  capabilities: {
    supportsLayerRegions: true,
    supportsMultipleInstancesPerLayer: true,
  },
};
