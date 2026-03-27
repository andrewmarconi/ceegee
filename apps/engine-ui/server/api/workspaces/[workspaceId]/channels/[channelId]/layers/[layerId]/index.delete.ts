import { deleteLayer } from 'engine-core';

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'layerId'));
  deleteLayer(useDb(), id);
  return { ok: true };
});
