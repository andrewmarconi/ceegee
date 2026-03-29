import { updateWorkspace, validateAndCacheFonts, getResolvedFonts } from 'engine-core';
import { join } from 'path';

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'workspaceId'));
  const body = await readBody(event);

  // Validate and cache fonts if themeTokens are provided
  if (body.themeTokens) {
    const cacheDir = join(process.cwd(), 'data', 'fonts');
    try {
      const error = await validateAndCacheFonts(cacheDir, body.themeTokens);
      if (error) {
        throw createError({
          statusCode: 422,
          message: error.message,
          data: { token: error.token, family: error.family },
        });
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'statusCode' in err) throw err;
      throw createError({
        statusCode: 502,
        message: 'Could not reach Google Fonts to validate font. Check your internet connection.',
      });
    }
  }

  const workspace = updateWorkspace(useDb(), id, body);
  const cacheDir = join(process.cwd(), 'data', 'fonts');
  return {
    ...workspace,
    resolvedFonts: getResolvedFonts(cacheDir, workspace.themeTokens),
  };
});
