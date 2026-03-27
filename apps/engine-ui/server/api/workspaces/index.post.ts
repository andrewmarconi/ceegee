import { createWorkspace } from 'engine-core';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  return createWorkspace(useDb(), body);
});
