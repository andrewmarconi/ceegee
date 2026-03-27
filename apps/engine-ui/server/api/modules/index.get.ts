import { listModules } from 'engine-core';

export default defineEventHandler(() => {
  return listModules(useDb());
});
