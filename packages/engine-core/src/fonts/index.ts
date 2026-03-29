import { parseFontFamilies, slugifyFamily } from './parser';
import { validateFamily, downloadFamily } from './google-fonts-client';
import { fontExists, readFontMetadata, writeFont } from './cache';
import type { ResolvedFont } from '../types';

const FONT_TOKEN_KEYS = [
  '--overlay-font-family-primary',
  '--overlay-font-family-secondary',
];

export type FontValidationError = {
  token: string;
  family: string;
  message: string;
};

export async function validateAndCacheFonts(
  cacheDir: string,
  themeTokens: Record<string, string>,
): Promise<FontValidationError | null> {
  const seen = new Set<string>();

  for (const tokenKey of FONT_TOKEN_KEYS) {
    const value = themeTokens[tokenKey];
    if (!value) continue;

    const families = parseFontFamilies(value);
    for (const family of families) {
      const slug = slugifyFamily(family);
      if (seen.has(slug)) continue;
      seen.add(slug);

      if (fontExists(cacheDir, slug)) continue;

      const isValid = await validateFamily(family);
      if (!isValid) {
        return { token: tokenKey, family, message: `Font '${family}' not found on Google Fonts` };
      }

      const result = await downloadFamily(family);
      const meta: ResolvedFont = {
        family,
        slug,
        isVariable: result.isVariable,
        weights: result.weights,
        files: result.fileNames,
      };
      writeFont(cacheDir, meta, result.files);
    }
  }

  return null;
}

export function getResolvedFonts(
  cacheDir: string,
  themeTokens: Record<string, string>,
): ResolvedFont[] {
  const fonts: ResolvedFont[] = [];
  const seen = new Set<string>();

  for (const tokenKey of FONT_TOKEN_KEYS) {
    const value = themeTokens[tokenKey];
    if (!value) continue;

    const families = parseFontFamilies(value);
    for (const family of families) {
      const slug = slugifyFamily(family);
      if (seen.has(slug)) continue;
      seen.add(slug);

      const meta = readFontMetadata(cacheDir, slug);
      if (meta) fonts.push(meta);
    }
  }

  return fonts;
}

// Re-export for convenience
export { parseFontFamilies, slugifyFamily } from './parser';
export { fontExists, readFontMetadata } from './cache';
