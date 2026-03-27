import { updateWorkspace } from 'engine-core';

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'workspaceId'));
  const body = await readBody(event);
  return updateWorkspace(useDb(), id, body);
});
