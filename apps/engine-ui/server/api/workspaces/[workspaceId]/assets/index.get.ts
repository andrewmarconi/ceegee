import { listAssets } from 'engine-core';

export default defineEventHandler((event) => {
  const workspaceId = Number(getRouterParam(event, 'workspaceId'));
  return listAssets(useDb(), workspaceId);
});
