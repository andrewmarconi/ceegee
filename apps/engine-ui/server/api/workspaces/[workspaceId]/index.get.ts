import { getWorkspace } from 'engine-core';

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'workspaceId'));
  const ws = getWorkspace(useDb(), id);
  if (!ws) throw createError({ statusCode: 404, message: 'Workspace not found' });
  return ws;
});
