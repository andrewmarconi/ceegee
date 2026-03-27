import { createLayer } from 'engine-core';

export default defineEventHandler(async (event) => {
  const workspaceId = Number(getRouterParam(event, 'workspaceId'));
  const channelId = Number(getRouterParam(event, 'channelId'));
  const body = await readBody(event);
  return createLayer(useDb(), { ...body, workspaceId, channelId });
});
