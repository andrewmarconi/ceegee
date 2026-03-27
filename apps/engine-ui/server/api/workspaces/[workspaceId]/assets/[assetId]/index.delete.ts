import { getAsset, deleteAsset } from 'engine-core';
import { join } from 'path';
import { unlinkSync, existsSync } from 'fs';

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'assetId'));
  const asset = getAsset(useDb(), id);
  if (!asset) throw createError({ statusCode: 404, message: 'Asset not found' });

  const filePath = join(process.cwd(), 'data', 'assets', asset.path);
  if (existsSync(filePath)) unlinkSync(filePath);

  deleteAsset(useDb(), id);
  return { ok: true };
});
