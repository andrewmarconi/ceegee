import { updateElement, buildChannelState } from 'engine-core';

export default defineEventHandler(async (event) => {
  const workspaceId = Number(getRouterParam(event, 'workspaceId'));
  const channelId = Number(getRouterParam(event, 'channelId'));
  const id = Number(getRouterParam(event, 'elementId'));
  const body = await readBody(event);
  const updated = updateElement(useDb(), id, body);
  const state = buildChannelState(useDb(), workspaceId, channelId);
  broadcastToChannel(workspaceId, channelId, { type: 'state:update', payload: state });
  return updated;
});
