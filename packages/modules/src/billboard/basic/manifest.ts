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
      bgColor: { type: 'string', title: 'Background Color', default: 'rgba(0,0,0,0.7)' },
      bgImageAssetId: { type: ['integer', 'null'], title: 'Background Image' },
      bgImageFit: { type: 'string', enum: ['cover', 'contain', 'fill'], default: 'cover', title: 'Image Fit' },
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

  themeTokens: [
    { key: '--bb-headline-size', label: 'Headline Size', type: 'text', default: '2rem' },
    { key: '--bb-headline-color', label: 'Headline Color', type: 'text', default: '#ffffff' },
    { key: '--bb-subline-size', label: 'Subline Size', type: 'text', default: '1.2rem' },
    { key: '--bb-subline-color', label: 'Subline Color', type: 'text', default: '#d0d0d0' },
    { key: '--bb-radius', label: 'Border Radius', type: 'text', default: '0.8rem' },
    { key: '--bb-padding', label: 'Padding', type: 'text', default: '2rem 3rem' },
  ],
};
