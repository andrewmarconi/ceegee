import { getAsset } from 'engine-core';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'assetId'));
  const asset = getAsset(useDb(), id);
  if (!asset) throw createError({ statusCode: 404, message: 'Asset not found' });

  const filePath = join(process.cwd(), 'data', 'assets', asset.path);
  if (!existsSync(filePath)) throw createError({ statusCode: 404, message: 'Asset file not found' });

  setResponseHeader(event, 'Content-Type', asset.mimeType);
  setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable');
  return readFileSync(filePath);
});
