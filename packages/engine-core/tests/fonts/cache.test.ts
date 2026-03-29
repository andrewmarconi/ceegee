import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { writeFont, readFontMetadata, fontExists } from '../../src/fonts/cache';
import type { ResolvedFont } from '../../src/types';

describe('font cache', () => {
  let cacheDir: string;

  beforeEach(() => {
    cacheDir = mkdtempSync(join(tmpdir(), 'font-cache-'));
  });

  afterEach(() => {
    rmSync(cacheDir, { recursive: true, force: true });
  });

  it('reports non-existent font as missing', () => {
    expect(fontExists(cacheDir, 'bebas-neue')).toBe(false);
  });

  it('writes font files and metadata', () => {
    const meta: ResolvedFont = {
      family: 'Bebas Neue',
      slug: 'bebas-neue',
      isVariable: true,
      files: ['variable.woff2'],
    };
    const files = new Map<string, Buffer>();
    files.set('variable.woff2', Buffer.from('fake-woff2-data'));

    writeFont(cacheDir, meta, files);

    expect(fontExists(cacheDir, 'bebas-neue')).toBe(true);
    const stored = readFontMetadata(cacheDir, 'bebas-neue');
    expect(stored).not.toBeUndefined();
    expect(stored!.family).toBe('Bebas Neue');
    expect(stored!.isVariable).toBe(true);
    expect(stored!.files).toEqual(['variable.woff2']);

    const fontData = readFileSync(join(cacheDir, 'bebas-neue', 'variable.woff2'));
    expect(fontData.toString()).toBe('fake-woff2-data');
  });

  it('writes static font with weights', () => {
    const meta: ResolvedFont = {
      family: 'Open Sans',
      slug: 'open-sans',
      isVariable: false,
      weights: [400, 700],
      files: ['400.woff2', '700.woff2'],
    };
    const files = new Map<string, Buffer>();
    files.set('400.woff2', Buffer.from('regular'));
    files.set('700.woff2', Buffer.from('bold'));

    writeFont(cacheDir, meta, files);

    const stored = readFontMetadata(cacheDir, 'open-sans');
    expect(stored!.isVariable).toBe(false);
    expect(stored!.weights).toEqual([400, 700]);
    expect(stored!.files).toEqual(['400.woff2', '700.woff2']);
  });

  it('returns undefined metadata for missing font', () => {
    expect(readFontMetadata(cacheDir, 'nonexistent')).toBeUndefined();
  });
});
