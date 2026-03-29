import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { ResolvedFont } from '../types';

export function fontExists(cacheDir: string, slug: string): boolean {
  return existsSync(join(cacheDir, slug, 'metadata.json'));
}

export function readFontMetadata(cacheDir: string, slug: string): ResolvedFont | undefined {
  const metaPath = join(cacheDir, slug, 'metadata.json');
  if (!existsSync(metaPath)) return undefined;
  return JSON.parse(readFileSync(metaPath, 'utf-8'));
}

export function writeFont(cacheDir: string, meta: ResolvedFont, files: Map<string, Buffer>): void {
  const dir = join(cacheDir, meta.slug);
  mkdirSync(dir, { recursive: true });

  for (const [filename, data] of files) {
    writeFileSync(join(dir, filename), data);
  }

  writeFileSync(join(dir, 'metadata.json'), JSON.stringify(meta, null, 2));
}
