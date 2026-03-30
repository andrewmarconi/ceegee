# Dynamic Google Fonts Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically download and serve Google Fonts locally so broadcast overlays render correct typography without depending on external CDNs at runtime.

**Architecture:** A server-side font cache (`data/fonts/`) populated at workspace save time. When a user sets a font token to a Google Fonts family, the server validates it, downloads woff2 files (variable preferred, static 400+700 fallback), and serves them locally. The overlay injects `@font-face` declarations from font metadata bundled in the workspace response.

**Tech Stack:** Nitro server routes, Node.js `fs` + `fetch`, Google Fonts CSS2 API, Vue 3 computed `<style>` injection

**Spec:** `docs/superpowers/specs/2026-03-28-dynamic-google-fonts-loading-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `packages/engine-core/src/fonts/parser.ts` | Extract Google Fonts family names from CSS `font-family` strings |
| `packages/engine-core/src/fonts/google-fonts-client.ts` | Validate families against Google Fonts API, download woff2 files |
| `packages/engine-core/src/fonts/cache.ts` | Read/write font metadata and files in `data/fonts/` |
| `packages/engine-core/src/fonts/index.ts` | Public API combining parser + client + cache |
| `packages/engine-core/tests/fonts/parser.test.ts` | Tests for font family parsing |
| `packages/engine-core/tests/fonts/google-fonts-client.test.ts` | Tests for Google Fonts API interaction |
| `packages/engine-core/tests/fonts/cache.test.ts` | Tests for font cache read/write |
| `apps/engine-ui/server/api/fonts/[slug]/[file].get.ts` | Serve cached woff2 files |

### Modified Files

| File | Change |
|------|--------|
| `packages/engine-core/src/types.ts` | Add `ResolvedFont` type |
| `packages/engine-core/src/index.ts` | Re-export fonts module |
| `apps/engine-ui/server/api/workspaces/[workspaceId]/index.get.ts` | Include `resolvedFonts` in response |
| `apps/engine-ui/server/api/workspaces/[workspaceId]/index.put.ts` | Validate + download fonts before saving |
| `apps/engine-ui/server/api/workspaces/index.post.ts` | Validate + download fonts on create |
| `apps/engine-ui/app/components/overlay/OverlayHost.vue` | Inject `@font-face` declarations |
| `apps/engine-ui/app/components/WorkspaceForm.vue` | Display font validation errors |

---

## Task 1: Font Family Parser

**Files:**
- Create: `packages/engine-core/src/fonts/parser.ts`
- Test: `packages/engine-core/tests/fonts/parser.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/engine-core/tests/fonts/parser.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseFontFamilies } from '../src/fonts/parser';

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/engine-core && npx vitest run tests/fonts/parser.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the parser**

Create `packages/engine-core/src/fonts/parser.ts`:

```typescript
const GENERIC_FAMILIES = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
  'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded',
]);

export function parseFontFamilies(value: string): string[] {
  if (!value.trim()) return [];

  return value
    .split(',')
    .map((part) => part.trim().replace(/^['"]|['"]$/g, '').trim())
    .filter((name) => name.length > 0 && !GENERIC_FAMILIES.has(name.toLowerCase()));
}

export function slugifyFamily(family: string): string {
  return family.toLowerCase().replace(/\s+/g, '-');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/engine-core && npx vitest run tests/fonts/parser.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/fonts/parser.ts packages/engine-core/tests/fonts/parser.test.ts
git commit -m "feat(fonts): add font family parser with tests (#20)"
```

---

## Task 2: ResolvedFont Type

**Files:**
- Modify: `packages/engine-core/src/types.ts`

- [ ] **Step 1: Add the ResolvedFont type**

Add at the end of `packages/engine-core/src/types.ts`, before the `// -- Helpers --` section:

```typescript
// -- Resolved Fonts --

export type ResolvedFont = {
  family: string;
  slug: string;
  isVariable: boolean;
  weights?: number[];
  files: string[];
};
```

- [ ] **Step 2: Verify the project still type-checks**

Run: `cd packages/engine-core && npx vitest run`
Expected: All existing tests still pass (type-only change)

- [ ] **Step 3: Commit**

```bash
git add packages/engine-core/src/types.ts
git commit -m "feat(fonts): add ResolvedFont type (#20)"
```

---

## Task 3: Font Cache Manager

**Files:**
- Create: `packages/engine-core/src/fonts/cache.ts`
- Test: `packages/engine-core/tests/fonts/cache.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/engine-core/tests/fonts/cache.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { writeFont, readFontMetadata, fontExists } from '../src/fonts/cache';
import type { ResolvedFont } from '../src/types';

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/engine-core && npx vitest run tests/fonts/cache.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the cache manager**

Create `packages/engine-core/src/fonts/cache.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/engine-core && npx vitest run tests/fonts/cache.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/fonts/cache.ts packages/engine-core/tests/fonts/cache.test.ts
git commit -m "feat(fonts): add font cache manager with tests (#20)"
```

---

## Task 4: Google Fonts Client

**Files:**
- Create: `packages/engine-core/src/fonts/google-fonts-client.ts`
- Test: `packages/engine-core/tests/fonts/google-fonts-client.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/engine-core/tests/fonts/google-fonts-client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateFamily, parseCssForUrls } from '../src/fonts/google-fonts-client';

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/engine-core && npx vitest run tests/fonts/google-fonts-client.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the Google Fonts client**

Create `packages/engine-core/src/fonts/google-fonts-client.ts`:

```typescript
const GOOGLE_FONTS_CSS2 = 'https://fonts.googleapis.com/css2';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

export type FontUrl = {
  url: string;
  weight: string;
};

export function parseCssForUrls(css: string): FontUrl[] {
  const results: FontUrl[] = [];
  const blockRegex = /@font-face\s*\{([^}]+)\}/g;

  let block: RegExpExecArray | null;
  while ((block = blockRegex.exec(css)) !== null) {
    const body = block[1];
    const urlMatch = body.match(/src:\s*url\(([^)]+)\)\s*format\(['"]woff2['"]\)/);
    const weightMatch = body.match(/font-weight:\s*([^;]+);/);
    if (urlMatch) {
      results.push({
        url: urlMatch[1],
        weight: weightMatch ? weightMatch[1].trim() : '400',
      });
    }
  }

  return results;
}

export async function validateFamily(family: string): Promise<boolean> {
  const url = `${GOOGLE_FONTS_CSS2}?family=${encodeURIComponent(family)}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  return res.ok;
}

function isVariableWeight(weight: string): boolean {
  return weight.includes(' ') || weight.includes('..');
}

export type DownloadResult = {
  isVariable: boolean;
  weights?: number[];
  files: Map<string, Buffer>;
  fileNames: string[];
};

export async function downloadFamily(family: string): Promise<DownloadResult> {
  // Try variable font first
  const variableUrl = `${GOOGLE_FONTS_CSS2}?family=${encodeURIComponent(family)}:wght@100..900`;
  const variableRes = await fetch(variableUrl, { headers: { 'User-Agent': USER_AGENT } });

  if (variableRes.ok) {
    const css = await variableRes.text();
    const urls = parseCssForUrls(css);
    // Check if any entry has a variable weight range
    const variableEntry = urls.find((u) => isVariableWeight(u.weight));
    if (variableEntry) {
      const fontRes = await fetch(variableEntry.url);
      const buffer = Buffer.from(await fontRes.arrayBuffer());
      return {
        isVariable: true,
        files: new Map([['variable.woff2', buffer]]),
        fileNames: ['variable.woff2'],
      };
    }
  }

  // Fall back to static weights 400 + 700
  const staticUrl = `${GOOGLE_FONTS_CSS2}?family=${encodeURIComponent(family)}:wght@400;700`;
  const staticRes = await fetch(staticUrl, { headers: { 'User-Agent': USER_AGENT } });

  if (!staticRes.ok) {
    // Some fonts only have a single weight (e.g., Bebas Neue is 400 only)
    const singleUrl = `${GOOGLE_FONTS_CSS2}?family=${encodeURIComponent(family)}`;
    const singleRes = await fetch(singleUrl, { headers: { 'User-Agent': USER_AGENT } });
    if (!singleRes.ok) {
      throw new Error(`Failed to fetch font CSS for "${family}"`);
    }
    const css = await singleRes.text();
    const urls = parseCssForUrls(css);
    if (urls.length === 0) throw new Error(`No woff2 URLs found for "${family}"`);
    const fontRes = await fetch(urls[0].url);
    const buffer = Buffer.from(await fontRes.arrayBuffer());
    const weight = urls[0].weight.trim();
    const fileName = `${weight}.woff2`;
    return {
      isVariable: false,
      weights: [parseInt(weight, 10) || 400],
      files: new Map([[fileName, buffer]]),
      fileNames: [fileName],
    };
  }

  const css = await staticRes.text();
  const urls = parseCssForUrls(css);
  const files = new Map<string, Buffer>();
  const weights: number[] = [];
  const fileNames: string[] = [];

  for (const entry of urls) {
    const w = entry.weight.trim();
    const fileName = `${w}.woff2`;
    const fontRes = await fetch(entry.url);
    files.set(fileName, Buffer.from(await fontRes.arrayBuffer()));
    weights.push(parseInt(w, 10));
    fileNames.push(fileName);
  }

  return { isVariable: false, weights, files, fileNames };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/engine-core && npx vitest run tests/fonts/google-fonts-client.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/fonts/google-fonts-client.ts packages/engine-core/tests/fonts/google-fonts-client.test.ts
git commit -m "feat(fonts): add Google Fonts client with tests (#20)"
```

---

## Task 5: Public Font API (Orchestration)

**Files:**
- Create: `packages/engine-core/src/fonts/index.ts`
- Modify: `packages/engine-core/src/index.ts`

- [ ] **Step 1: Create the public font API**

Create `packages/engine-core/src/fonts/index.ts`:

```typescript
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
```

- [ ] **Step 2: Add re-export in engine-core index.ts**

Add this line to the bottom of `packages/engine-core/src/index.ts`, after the existing re-exports section:

```typescript
export {
  validateAndCacheFonts,
  getResolvedFonts,
  type FontValidationError,
} from './fonts/index';
```

- [ ] **Step 3: Run all engine-core tests**

Run: `cd packages/engine-core && npx vitest run`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add packages/engine-core/src/fonts/index.ts packages/engine-core/src/index.ts
git commit -m "feat(fonts): add public font orchestration API (#20)"
```

---

## Task 6: Font Serving Route

**Files:**
- Create: `apps/engine-ui/server/api/fonts/[slug]/[file].get.ts`

- [ ] **Step 1: Create the font file serving route**

Create `apps/engine-ui/server/api/fonts/[slug]/[file].get.ts`:

```typescript
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug');
  const file = getRouterParam(event, 'file');

  if (!slug || !file) {
    throw createError({ statusCode: 400, message: 'Missing slug or file parameter' });
  }

  // Prevent path traversal
  if (slug.includes('..') || file.includes('..')) {
    throw createError({ statusCode: 400, message: 'Invalid path' });
  }

  const filePath = join(process.cwd(), 'data', 'fonts', slug, file);

  if (!existsSync(filePath)) {
    throw createError({ statusCode: 404, message: 'Font file not found' });
  }

  setResponseHeader(event, 'Content-Type', 'font/woff2');
  setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable');
  return readFileSync(filePath);
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/engine-ui/server/api/fonts/\[slug\]/\[file\].get.ts
git commit -m "feat(fonts): add font file serving route (#20)"
```

---

## Task 7: Workspace API — Font Validation on Update

**Files:**
- Modify: `apps/engine-ui/server/api/workspaces/[workspaceId]/index.put.ts`
- Modify: `apps/engine-ui/server/api/workspaces/[workspaceId]/index.get.ts`

- [ ] **Step 1: Update the workspace PUT route to validate and cache fonts**

Replace the contents of `apps/engine-ui/server/api/workspaces/[workspaceId]/index.put.ts` with:

```typescript
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
```

- [ ] **Step 2: Update the workspace GET route to include resolvedFonts**

Replace the contents of `apps/engine-ui/server/api/workspaces/[workspaceId]/index.get.ts` with:

```typescript
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
```

- [ ] **Step 3: Verify the dev server starts without errors**

Run: `cd apps/engine-ui && npx nuxt typecheck` (or start the dev server briefly)
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add apps/engine-ui/server/api/workspaces/\[workspaceId\]/index.put.ts apps/engine-ui/server/api/workspaces/\[workspaceId\]/index.get.ts
git commit -m "feat(fonts): validate and resolve fonts in workspace API (#20)"
```

---

## Task 8: Workspace API — Font Validation on Create

**Files:**
- Modify: `apps/engine-ui/server/api/workspaces/index.post.ts`

- [ ] **Step 1: Update the workspace POST route to validate and cache fonts**

Replace the contents of `apps/engine-ui/server/api/workspaces/index.post.ts` with:

```typescript
import { createWorkspace, validateAndCacheFonts, getResolvedFonts } from 'engine-core';
import { join } from 'path';

export default defineEventHandler(async (event) => {
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

  const workspace = createWorkspace(useDb(), body);
  const cacheDir = join(process.cwd(), 'data', 'fonts');
  return {
    ...workspace,
    resolvedFonts: getResolvedFonts(cacheDir, workspace.themeTokens),
  };
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/engine-ui/server/api/workspaces/index.post.ts
git commit -m "feat(fonts): validate and resolve fonts on workspace create (#20)"
```

---

## Task 9: OverlayHost — Inject @font-face Declarations

**Files:**
- Modify: `apps/engine-ui/app/components/overlay/OverlayHost.vue`

- [ ] **Step 1: Add font face generation to OverlayHost**

In `apps/engine-ui/app/components/overlay/OverlayHost.vue`, add a `ResolvedFont` import alongside the existing type imports:

```typescript
import type {
  Workspace,
  Channel,
  Layer,
  Element,
  ModuleRecord,
  LayerState,
  ResolvedFont,
} from 'engine-core';
```

- [ ] **Step 2: Add the font face computed property and style injection**

After the existing `themeVars` computed property (around line 117), add:

```typescript
// Font face injection
type WorkspaceWithFonts = Workspace & { resolvedFonts?: ResolvedFont[] };

const fontFaceCss = computed(() => {
  const ws = workspace.value as WorkspaceWithFonts | null;
  if (!ws?.resolvedFonts?.length) return '';

  return ws.resolvedFonts.map((font) => {
    if (font.isVariable) {
      return `@font-face {
  font-family: '${font.family}';
  src: url('/api/fonts/${font.slug}/variable.woff2') format('woff2');
  font-weight: 1 999;
  font-display: block;
}`;
    }
    return (font.weights ?? [400]).map((w) => `@font-face {
  font-family: '${font.family}';
  src: url('/api/fonts/${font.slug}/${w}.woff2') format('woff2');
  font-weight: ${w};
  font-display: block;
}`).join('\n');
  }).join('\n');
});

// Inject dynamic font styles via <head>
useHead({
  style: computed(() =>
    fontFaceCss.value ? [{ innerHTML: fontFaceCss.value }] : []
  ),
});
```

- [ ] **Step 3: Verify the overlay renders without errors**

Start the dev server: `cd apps/engine-ui && npx nuxt dev`
Open an overlay page in the browser. Confirm no console errors. If a workspace has font tokens set, verify `@font-face` declarations appear in the page `<head>`.

- [ ] **Step 4: Commit**

```bash
git add apps/engine-ui/app/components/overlay/OverlayHost.vue
git commit -m "feat(fonts): inject @font-face declarations in OverlayHost (#20)"
```

---

## Task 10: WorkspaceForm — Font Validation Error Display

**Files:**
- Modify: `apps/engine-ui/app/components/WorkspaceForm.vue`

- [ ] **Step 1: Add error state and display to WorkspaceForm**

In the `<script setup>` section of `apps/engine-ui/app/components/WorkspaceForm.vue`, after the `isEdit` computed (line 25), add:

```typescript
const fontErrors = reactive<Record<string, string>>({});
```

- [ ] **Step 2: Update the emit type and handleSubmit to support async errors**

Change the emit definition to add a new event for errors that the parent can call back:

Replace the `handleSubmit` function with:

```typescript
function handleSubmit() {
  if (!state.name.trim()) return;
  // Clear previous font errors
  for (const key of Object.keys(fontErrors)) delete fontErrors[key];
  emit('submit', {
    name: state.name.trim(),
    description: state.description.trim(),
    themeTokens: { ...tokenValues },
  });
}

function setFontError(token: string, message: string) {
  fontErrors[token] = message;
}

function clearFontErrors() {
  for (const key of Object.keys(fontErrors)) delete fontErrors[key];
}

defineExpose({ setFontError, clearFontErrors });
```

- [ ] **Step 3: Add inline error display in the Global Styles tab template**

In the template, within the Global Styles TabPanel, after the `<InputText>` for each token, add an error message. Replace the Global Styles token loop:

```html
<div
  v-for="token in GLOBAL_TOKENS"
  :key="token.key"
  class="flex flex-col gap-1"
>
  <label class="text-sm font-medium">{{ token.label }}</label>
  <InputText
    :model-value="getTokenValue(token.key)"
    :placeholder="token.default"
    :invalid="!!fontErrors[token.key]"
    fluid
    @update:model-value="setTokenValue(token.key, $event)"
  />
  <small v-if="fontErrors[token.key]" class="text-red-400 text-xs">
    {{ fontErrors[token.key] }}
  </small>
</div>
```

- [ ] **Step 4: Update the parent page to handle font errors**

The parent page is `apps/engine-ui/app/pages/app/index.vue`. It has two handlers: `handleCreate` and `handleUpdate`, and two `<WorkspaceForm>` instances (one for create dialog, one for edit dialog).

Add template refs for both forms. In the `<script setup>` section, add:

```typescript
const createFormRef = ref<InstanceType<typeof WorkspaceForm>>();
const editFormRef = ref<InstanceType<typeof WorkspaceForm>>();
```

Replace the `handleCreate` function with:

```typescript
async function handleCreate(data: { name: string, description: string, themeTokens: Record<string, string> }) {
  try {
    createFormRef.value?.clearFontErrors()
    const ws = await $fetch<Workspace>('/api/workspaces', {
      method: 'POST',
      body: data
    })
    workspaces.value.push(ws)
    showCreateModal.value = false
    toast.add({ summary: `Workspace "${ws.name}" created`, severity: 'success', life: 3000 })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'data' in err) {
      const errData = (err as any).data?.data
      if (errData?.token && errData?.family) {
        createFormRef.value?.setFontError(errData.token, `Font '${errData.family}' not found on Google Fonts`)
        return
      }
    }
    toast.add({ summary: 'Failed to create workspace', severity: 'error', life: 3000 })
  }
}
```

Replace the `handleUpdate` function with:

```typescript
async function handleUpdate(data: { name: string, description: string, themeTokens: Record<string, string> }) {
  if (!editingWorkspace.value) return
  const id = editingWorkspace.value.id
  try {
    editFormRef.value?.clearFontErrors()
    const updated = await $fetch<Workspace>(`/api/workspaces/${id}`, {
      method: 'PUT',
      body: data
    })
    const idx = workspaces.value.findIndex(w => w.id === id)
    if (idx !== -1) workspaces.value[idx] = updated
    editingWorkspace.value = null
    toast.add({ summary: 'Workspace updated', severity: 'success', life: 3000 })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'data' in err) {
      const errData = (err as any).data?.data
      if (errData?.token && errData?.family) {
        editFormRef.value?.setFontError(errData.token, `Font '${errData.family}' not found on Google Fonts`)
        return
      }
    }
    toast.add({ summary: 'Failed to update workspace', severity: 'error', life: 3000 })
  }
}
```

In the template, add `ref` attributes to both `<WorkspaceForm>` instances:

For the create dialog:
```html
<WorkspaceForm
  ref="createFormRef"
  :modules="modules"
  @submit="handleCreate"
  @cancel="showCreateModal = false"
/>
```

For the edit dialog:
```html
<WorkspaceForm
  ref="editFormRef"
  :workspace="editingWorkspace"
  :modules="modules"
  @submit="handleUpdate"
  @cancel="editingWorkspace = null"
/>
```

- [ ] **Step 5: Verify error display works**

Start the dev server. Edit a workspace and type an invalid font family (e.g., `'Not A Font', sans-serif`). Save. Verify a red error message appears under the font field.

- [ ] **Step 6: Commit**

```bash
git add apps/engine-ui/app/components/WorkspaceForm.vue apps/engine-ui/app/pages/app/index.vue
git commit -m "feat(fonts): display font validation errors in WorkspaceForm (#20)"
```

---

## Task 11: End-to-End Verification

- [ ] **Step 1: Start the dev server**

Run: `cd apps/engine-ui && npx nuxt dev`

- [ ] **Step 2: Test the happy path**

1. Open the workspace edit form
2. Go to Global Styles tab
3. Set Primary Font Family to `'Bebas Neue', sans-serif`
4. Save the workspace
5. Verify no errors are shown
6. Check that `data/fonts/bebas-neue/` exists with either `variable.woff2` or `400.woff2` + `metadata.json`

- [ ] **Step 3: Test the overlay renders the font**

1. Open the overlay page for that workspace
2. Open browser DevTools > Elements
3. Verify `@font-face` declarations appear in `<head>` with correct family name and local URLs
4. Verify text elements render with the correct font (check computed styles in DevTools)

- [ ] **Step 4: Test the error path**

1. Set Primary Font Family to `'Definitely Not A Font', sans-serif`
2. Save the workspace
3. Verify a red error message appears: "Font 'Definitely Not A Font' not found on Google Fonts"

- [ ] **Step 5: Test cache behavior**

1. Set the font back to `'Bebas Neue', sans-serif`
2. Save — should be fast (cache hit, no download)
3. Verify the workspace saves successfully

- [ ] **Step 6: Test the font serving route directly**

Visit `http://localhost:3000/api/fonts/bebas-neue/variable.woff2` (or `400.woff2`).
Verify: the browser downloads a file, response headers include `Content-Type: font/woff2` and `Cache-Control: public, max-age=31536000, immutable`.

- [ ] **Step 7: Final commit**

If any fixes were needed during verification, commit them:

```bash
git add -A
git commit -m "fix(fonts): address issues found during e2e verification (#20)"
```
