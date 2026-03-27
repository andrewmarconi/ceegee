import { listChannels } from 'engine-core';

export default defineEventHandler((event) => {
  const workspaceId = Number(getRouterParam(event, 'workspaceId'));
  return listChannels(useDb(), workspaceId);
});
