import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateFamily, parseCssForUrls } from '../../src/fonts/google-fonts-client';

// We test parseCssForUrls with real CSS samples and mock fetch for validateFamily

describe('parseCssForUrls', () => {
  it('extracts woff2 URLs from Google Fonts CSS', () => {
    const css = `
/* latin */
@font-face {
  font-family: 'Bebas Neue';
  font-style: normal;
  font-weight: 400;
  src: url(https://fonts.gstatic.com/s/bebasneue/v16/JTUSjIg69CK48gW7PXoo9Wlhyw.woff2) format('woff2');
}`;
    const urls = parseCssForUrls(css);
    expect(urls).toEqual([
      {
        url: 'https://fonts.gstatic.com/s/bebasneue/v16/JTUSjIg69CK48gW7PXoo9Wlhyw.woff2',
        weight: '400',
      },
    ]);
  });

  it('extracts variable font URLs with weight ranges', () => {
    const css = `
@font-face {
  font-family: 'Open Sans';
  font-style: normal;
  font-weight: 300 800;
  src: url(https://fonts.gstatic.com/s/opensans/v40/mem5YaGs126MiZpBA-UN_r8OUuhs.woff2) format('woff2');
}`;
    const urls = parseCssForUrls(css);
    expect(urls).toEqual([
      {
        url: 'https://fonts.gstatic.com/s/opensans/v40/mem5YaGs126MiZpBA-UN_r8OUuhs.woff2',
        weight: '300 800',
      },
    ]);
  });

  it('returns empty array for CSS with no woff2 URLs', () => {
    expect(parseCssForUrls('body { font-family: sans-serif; }')).toEqual([]);
  });
});

describe('validateFamily', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true for a valid font family', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('/* CSS */', { status: 200 }));
    const result = await validateFamily('Bebas Neue');
    expect(result).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('returns false for an invalid font family', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 400 }));
    const result = await validateFamily('Not A Real Font');
    expect(result).toBe(false);
  });

  it('throws on network error', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));
    await expect(validateFamily('Bebas Neue')).rejects.toThrow('Network error');
  });
});
