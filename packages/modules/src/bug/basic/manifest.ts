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

  themeTokens: [
    { key: '--bug-bg', label: 'Background', type: 'text', default: 'rgba(0,0,0,0.6)' },
    { key: '--bug-radius', label: 'Border Radius', type: 'text', default: '0.4rem' },
    { key: '--bug-margin', label: 'Margin from Edge', type: 'text', default: '3vh' },
    { key: '--bug-text-size', label: 'Text Size', type: 'text', default: '0.85rem' },
    { key: '--bug-text-color', label: 'Text Color', type: 'text', default: '#ffffff' },
  ],
};
