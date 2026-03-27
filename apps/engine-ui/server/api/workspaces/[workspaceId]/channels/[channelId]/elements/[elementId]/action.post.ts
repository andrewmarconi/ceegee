import { elementAction } from 'engine-core';

export default defineEventHandler(async (event) => {
  const elementId = Number(getRouterParam(event, 'elementId'));
  const body = await readBody(event);
  const engineEvent = elementAction(useDb(), elementId, body.actionId, body.args);
  const payload = engineEvent.payload as { workspaceId: number; channelId: number };
  broadcastToChannel(payload.workspaceId, payload.channelId, engineEvent);
  return engineEvent;
});
