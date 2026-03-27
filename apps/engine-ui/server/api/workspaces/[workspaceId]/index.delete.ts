import { deleteWorkspace } from 'engine-core';

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'workspaceId'));
  deleteWorkspace(useDb(), id);
  return { ok: true };
});
