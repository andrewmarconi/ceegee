import type { ModuleManifest } from 'engine-core';

export { lowerThirdBasicManifest } from './lower-third/basic/manifest';
export { bugBasicManifest } from './bug/basic/manifest';
export { billboardBasicManifest } from './billboard/basic/manifest';
export { clockBasicManifest } from './clock/basic/manifest';
export { countdownBasicManifest } from './countdown/basic/manifest';

// Server-safe manifest list (no Vue imports)
import { lowerThirdBasicManifest } from './lower-third/basic/manifest';
import { bugBasicManifest } from './bug/basic/manifest';
import { billboardBasicManifest } from './billboard/basic/manifest';
import { clockBasicManifest } from './clock/basic/manifest';
import { countdownBasicManifest } from './countdown/basic/manifest';

export const allManifests: ModuleManifest[] = [
  lowerThirdBasicManifest,
  bugBasicManifest,
  billboardBasicManifest,
  clockBasicManifest,
  countdownBasicManifest,
];
