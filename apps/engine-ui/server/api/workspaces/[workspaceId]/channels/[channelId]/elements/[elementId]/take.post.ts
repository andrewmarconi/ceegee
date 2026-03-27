import { take } from 'engine-core';

export default defineEventHandler((event) => {
  const elementId = Number(getRouterParam(event, 'elementId'));
  const state = take(useDb(), elementId);
  broadcastToChannel(state.workspaceId, state.channelId, { type: 'state:update', payload: state });
  return state;
});
