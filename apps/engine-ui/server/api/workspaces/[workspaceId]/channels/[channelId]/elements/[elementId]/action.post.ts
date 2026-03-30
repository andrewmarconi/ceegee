import { elementAction } from 'engine-core';

export default defineEventHandler(async (event) => {
  const elementId = Number(getRouterParam(event, 'elementId'));
  const body = await readBody(event);
  try {
    const engineEvent = elementAction(useDb(), elementId, body.actionId, body.args);
    const payload = engineEvent.payload as { workspaceId: number; channelId: number };
    broadcastToChannel(payload.workspaceId, payload.channelId, engineEvent);
    return engineEvent;
  } catch (err: any) {
    if (err.message === 'Layer is locked') {
      throw createError({ statusCode: 403, statusMessage: 'Layer is locked' });
    }
    throw err;
  }
});
