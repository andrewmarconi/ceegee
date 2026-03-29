import { describe, it, expect } from 'vitest';
import { parseFontFamilies } from '../../src/fonts/parser';

describe('parseFontFamilies', () => {
  it('extracts a quoted family name', () => {
    expect(parseFontFamilies("'Bebas Neue', sans-serif")).toEqual(['Bebas Neue']);
  });

  it('extracts a double-quoted family name', () => {
    expect(parseFontFamilies('"Open Sans", serif')).toEqual(['Open Sans']);
  });

  it('extracts an unquoted multi-word family name', () => {
    expect(parseFontFamilies('Bebas Neue, sans-serif')).toEqual(['Bebas Neue']);
  });

  it('filters out all CSS generic families', () => {
    const generics = [
      'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
      'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded',
    ];
    for (const g of generics) {
      expect(parseFontFamilies(g)).toEqual([]);
    }
  });

  it('returns multiple non-generic families', () => {
    expect(parseFontFamilies("'Bebas Neue', 'Open Sans', sans-serif"))
      .toEqual(['Bebas Neue', 'Open Sans']);
  });

  it('returns empty array for empty string', () => {
    expect(parseFontFamilies('')).toEqual([]);
  });

  it('returns empty array for only generic families', () => {
    expect(parseFontFamilies('sans-serif')).toEqual([]);
  });

  it('trims whitespace around family names', () => {
    expect(parseFontFamilies("  'Bebas Neue'  ,  sans-serif  ")).toEqual(['Bebas Neue']);
  });
});
