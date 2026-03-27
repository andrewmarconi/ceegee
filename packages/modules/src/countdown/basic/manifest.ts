import type { ModuleManifest, JsonSchemaLike } from 'engine-core';

export const countdownBasicManifest: ModuleManifest = {
  id: 'countdown.basic',
  label: 'Basic Countdown',
  version: '1.0.0',
  category: 'countdown',

  configSchema: {
    type: 'object',
    properties: {
      targetTime: { type: 'string', title: 'Target Time (ISO 8601)' },
      label: { type: 'string', title: 'Label' },
      finishedText: { type: 'string', title: 'Text when complete', default: '00:00:00' },
    },
    required: ['targetTime'],
  } satisfies JsonSchemaLike,

  dataSchema: { type: 'object', properties: {} } satisfies JsonSchemaLike,

  actions: [
    { id: 'show', label: 'Show' },
    { id: 'hide', label: 'Hide' },
    { id: 'reset', label: 'Reset' },
  ],

  animationHooks: { enter: 'fadeIn', exit: 'fadeOut' },
};
