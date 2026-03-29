import { getWorkspace, getResolvedFonts } from 'engine-core';
import { join } from 'path';

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'workspaceId'));
  const ws = getWorkspace(useDb(), id);
  if (!ws) throw createError({ statusCode: 404, message: 'Workspace not found' });

  const cacheDir = join(process.cwd(), 'data', 'fonts');
  return {
    ...ws,
    resolvedFonts: getResolvedFonts(cacheDir, ws.themeTokens),
  };
});
