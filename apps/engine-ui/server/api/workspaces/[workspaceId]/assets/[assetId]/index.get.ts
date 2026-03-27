import { getAsset } from 'engine-core';

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'assetId'));
  const asset = getAsset(useDb(), id);
  if (!asset) throw createError({ statusCode: 404, message: 'Asset not found' });
  return asset;
});
