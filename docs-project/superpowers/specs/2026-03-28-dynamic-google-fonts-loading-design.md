# Dynamic Google Fonts Loading for Overlay Output

**Date:** 2026-03-28
**Issue:** #20
**Status:** Draft

## Problem

When a workspace sets `--overlay-font-family-primary` or `--overlay-font-family-secondary` to a Google Fonts family (e.g., `'Bebas Neue', sans-serif`), the overlay output has no way to load the font files. The browser falls back to the generic family, producing incorrect typography in broadcast overlays.

## Solution

A server-side font cache with on-demand download at workspace save time. Fonts are validated against Google Fonts, downloaded as woff2 files, and served locally. The overlay injects `@font-face` declarations pointing at the local cache, eliminating any runtime dependency on Google's CDN.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Cache location | Server-side (`data/fonts/`) | OBS Browser Source doesn't reliably persist browser caches across restarts |
| Parse/download timing | At workspace save | Eliminates FOUT; gives immediate validation feedback |
| Font format | Variable font preferred, static 400+700 fallback | Variable fonts are a single file covering all weights; static 400+700 covers the common cases |
| Validation feedback | Inline form error | Simple, clear; avoids complexity of autocomplete/search |
| Font data delivery | Bundled in workspace GET response (`resolvedFonts`) | Single fetch for overlay; no extra API call at render time |
| Google Fonts access | Public CSS2 API (no API key) | Simpler setup; no key management |

## Architecture

### Font Parsing

A utility that extracts Google Fonts candidate family names from CSS `font-family` token values.

**Input:** `'Bebas Neue', sans-serif`
**Output:** `['Bebas Neue']`

**Rules:**
- Strip single/double quotes, trim whitespace
- Split on commas
- Filter out CSS generic families: `serif`, `sans-serif`, `monospace`, `cursive`, `fantasy`, `system-ui`, `ui-serif`, `ui-sans-serif`, `ui-monospace`, `ui-rounded`
- Return remaining family names as candidates

### Google Fonts Client

A server-side utility that validates and downloads fonts from Google Fonts.

**Validation:** Fetch `https://fonts.googleapis.com/css2?family=<encoded-family>` with a modern browser user-agent header (required to get woff2 format). A 200 response means the font exists; 400 means it does not.

**Download flow:**
1. First attempt: request variable font axes (e.g., `?family=Bebas+Neue:wght@100..900`). If the response contains a `woff2` URL with axis ranges, download as `variable.woff2`.
2. Fallback: request static weights `?family=Bebas+Neue:wght@400;700`. Download as `400.woff2` and `700.woff2`.
3. Parse woff2 URLs from the CSS response using regex on `src: url(...)` declarations.

**User-agent:** Must send a modern browser user-agent to receive woff2 format (e.g., Chrome's UA string).

### Font Cache

**Directory structure:**
```
data/fonts/
  bebas-neue/
    variable.woff2      # if variable font available
    400.woff2            # static fallback
    700.woff2            # static fallback
    metadata.json
  open-sans/
    variable.woff2
    metadata.json
```

**Slug generation:** Family name lowercased, spaces replaced with hyphens (e.g., `Bebas Neue` -> `bebas-neue`).

**metadata.json (variable font example):**
```json
{
  "family": "Bebas Neue",
  "slug": "bebas-neue",
  "isVariable": true,
  "files": ["variable.woff2"],
  "downloadedAt": "2026-03-28T12:00:00Z"
}
```

**metadata.json (static font example):**
```json
{
  "family": "Open Sans",
  "slug": "open-sans",
  "isVariable": false,
  "weights": [400, 700],
  "files": ["400.woff2", "700.woff2"],
  "downloadedAt": "2026-03-28T12:00:00Z"
}
```

The `weights` field is only present for static fonts. For variable fonts, the single file covers all weights.

**Cache hit logic:** If `data/fonts/<slug>/metadata.json` exists, the font is cached. No TTL or invalidation needed — Google Fonts families don't change their font files.

### Font Serving Route

**Endpoint:** `GET /api/fonts/:slug/:file`

**Behavior:**
- Read file from `data/fonts/<slug>/<file>`
- Set `Content-Type: font/woff2`
- Set `Cache-Control: public, max-age=31536000, immutable`
- Return 404 if file does not exist

Follows the same pattern as the existing asset file serving route.

### Workspace Update Handler Changes

**Current flow:** Parse body -> update workspace in DB -> return workspace.

**New flow:** Parse body -> extract font tokens -> for each candidate family: check cache, if miss validate+download from Google Fonts -> if validation fails return 422 -> update workspace in DB -> return workspace with resolvedFonts.

**422 error response:**
```json
{
  "statusCode": 422,
  "message": "Font 'Beba Neue' not found on Google Fonts",
  "data": {
    "token": "--overlay-font-family-primary",
    "family": "Beba Neue"
  }
}
```

**Network failure response (502):**
```json
{
  "statusCode": 502,
  "message": "Could not reach Google Fonts to validate font. Check your internet connection."
}
```

### Workspace GET Response Changes

**New field:** `resolvedFonts` added to the workspace response.

```typescript
type ResolvedFont = {
  family: string;
  slug: string;
  isVariable: boolean;
  weights?: number[];  // only present for static fonts
  files: string[];
};

// Added to Workspace response type
resolvedFonts: ResolvedFont[];
```

**Population:** When building the workspace GET response, read `metadata.json` for each font token that has a cached font. Return an empty array if no fonts are cached.

### OverlayHost Changes

**Current behavior:** Fetches workspace, applies `themeTokens` as CSS custom properties.

**New behavior:** Additionally reads `resolvedFonts` from the workspace response and generates `@font-face` declarations.

**For variable fonts:**
```css
@font-face {
  font-family: 'Bebas Neue';
  src: url('/api/fonts/bebas-neue/variable.woff2') format('woff2');
  font-weight: 1 999;
  font-display: block;
}
```

**For static fonts:**
```css
@font-face {
  font-family: 'Bebas Neue';
  src: url('/api/fonts/bebas-neue/400.woff2') format('woff2');
  font-weight: 400;
  font-display: block;
}
@font-face {
  font-family: 'Bebas Neue';
  src: url('/api/fonts/bebas-neue/700.woff2') format('woff2');
  font-weight: 700;
  font-display: block;
}
```

**`font-display: block`** hides text until the font loads. This is appropriate for broadcast overlays where a flash of unstyled text is worse than a brief invisible period. Since fonts are served locally, the invisible period should be negligible.

**Font family name matching:** The `font-family` value in `@font-face` must match the family name as the user typed it in the token, so that the existing `var(--overlay-font-family-primary)` CSS references resolve correctly.

### WorkspaceForm Changes

**Current behavior:** Text inputs for font family tokens, no validation beyond required fields.

**New behavior:** On submit, if the API returns a 422 with font validation data, display an inline error under the corresponding font field: "Font 'Beba Neue' not found on Google Fonts."

**Edge cases:**
- Both tokens reference the same font family: server downloads once, both tokens work.
- Token value is empty or only generic families: no validation or download attempted.
- Token value unchanged from last save: server checks cache (fast hit), no re-download.

## New Files

| File | Purpose |
|------|---------|
| `packages/engine-core/src/fonts/parser.ts` | Parse font family names from CSS font-family strings |
| `packages/engine-core/src/fonts/google-fonts-client.ts` | Validate and download fonts from Google Fonts CSS2 API |
| `packages/engine-core/src/fonts/cache.ts` | Read/write font cache in `data/fonts/` |
| `packages/engine-core/src/fonts/index.ts` | Public API: `validateAndCacheFonts()`, `getResolvedFonts()` |
| `apps/engine-ui/server/api/fonts/[slug]/[file].get.ts` | Serve cached font files |

## Modified Files

| File | Change |
|------|--------|
| `apps/engine-ui/server/api/workspaces/[workspaceId]/index.put.ts` | Add font validation+download before DB update |
| `apps/engine-ui/server/api/workspaces/[workspaceId]/index.get.ts` | Include `resolvedFonts` in response |
| `apps/engine-ui/server/api/workspaces/index.post.ts` | Add font validation+download on workspace create |
| `apps/engine-ui/app/components/overlay/OverlayHost.vue` | Generate and inject `@font-face` declarations |
| `apps/engine-ui/app/components/WorkspaceForm.vue` | Display inline font validation errors |
| `packages/engine-core/src/types.ts` | Add `ResolvedFont` type |

## Out of Scope

- Font autocomplete/search UI (future enhancement)
- Self-hosted font upload (future enhancement)
- Font weight selection UI (future enhancement)
- Cache invalidation/cleanup tooling
- Italic/style variants beyond weight
