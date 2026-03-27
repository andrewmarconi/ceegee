import type { ModuleManifest } from 'engine-core';
import type { Component } from 'vue';
import { lowerThirdBasicManifest } from './lower-third/basic/manifest';
import { bugBasicManifest } from './bug/basic/manifest';
import { billboardBasicManifest } from './billboard/basic/manifest';
import { clockBasicManifest } from './clock/basic/manifest';
import { countdownBasicManifest } from './countdown/basic/manifest';

// moduleKey → lazy component loader (for defineAsyncComponent in OverlayHost)
export const moduleComponents: Record<string, () => Promise<Component>> = {
  'lower-third.basic': () => import('./lower-third/basic/LowerThirdBasic.vue') as Promise<Component>,
  'bug.basic': () => import('./bug/basic/BugBasic.vue') as Promise<Component>,
  'billboard.basic': () => import('./billboard/basic/BillboardBasic.vue') as Promise<Component>,
  'clock.basic': () => import('./clock/basic/ClockBasic.vue') as Promise<Component>,
  'countdown.basic': () => import('./countdown/basic/CountdownBasic.vue') as Promise<Component>,
};

// moduleKey → manifest (for server-side registration)
export const moduleManifests: Record<string, ModuleManifest> = {
  'lower-third.basic': lowerThirdBasicManifest,
  'bug.basic': bugBasicManifest,
  'billboard.basic': billboardBasicManifest,
  'clock.basic': clockBasicManifest,
  'countdown.basic': countdownBasicManifest,
};
