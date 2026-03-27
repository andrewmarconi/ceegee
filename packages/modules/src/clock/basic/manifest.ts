import type { ModuleManifest, JsonSchemaLike } from 'engine-core';

export const clockBasicManifest: ModuleManifest = {
  id: 'clock.basic',
  label: 'Basic Clock',
  version: '1.0.0',
  category: 'clock',

  configSchema: {
    type: 'object',
    properties: {
      format: { type: 'string', enum: ['12h', '24h'], default: '24h' },
      showSeconds: { type: 'boolean', default: true },
      label: { type: 'string', title: 'Label (optional)' },
    },
    required: ['format', 'showSeconds'],
  } satisfies JsonSchemaLike,

  dataSchema: { type: 'object', properties: {} } satisfies JsonSchemaLike,

  actions: [
    { id: 'show', label: 'Show' },
    { id: 'hide', label: 'Hide' },
  ],

  animationHooks: { enter: 'fadeIn', exit: 'fadeOut' },
};
