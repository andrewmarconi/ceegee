import { createAsset } from 'engine-core';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

export default defineEventHandler(async (event) => {
  const workspaceId = Number(getRouterParam(event, 'workspaceId'));
  const formData = await readMultipartFormData(event);
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: 'No file uploaded' });
  }

  const file = formData.find((f) => f.name === 'file');
  if (!file || !file.filename || !file.data) {
    throw createError({ statusCode: 400, message: 'Missing file field' });
  }

  const assetDir = join(process.cwd(), 'data', 'assets', String(workspaceId));
  mkdirSync(assetDir, { recursive: true });

  const filename = `${Date.now()}-${file.filename}`;
  const filePath = join(assetDir, filename);
  writeFileSync(filePath, file.data);

  const relativePath = `${workspaceId}/${filename}`;

  return createAsset(useDb(), {
    workspaceId,
    name: file.filename,
    path: relativePath,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.data.length,
  });
});
