import { updateElement } from 'engine-core';

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'elementId'));
  const body = await readBody(event);
  return updateElement(useDb(), id, body);
});
