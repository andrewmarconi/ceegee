# VuePress LLM Documentation Plugin

**Issue:** #49
**Date:** 2026-03-30

## Goal

Install and configure `@vuepress/plugin-llms` to generate LLM-friendly documentation output (`llms.txt`, `llms-full.txt`, per-page `.md` files) during the VuePress production build.

## Changes

### Installation

Add `@vuepress/plugin-llms@next` as a dev dependency in `docs/package.json`.

### Configuration

Add the plugin to `docs/.vuepress/config.ts`:

```ts
import { llmsPlugin } from '@vuepress/plugin-llms'

export default defineUserConfig({
  // ...existing config
  plugins: [
    llmsPlugin({
      domain: 'https://andrewmarconi.github.io/ceegee/',
    }),
  ],
})
```

All other options use defaults:
- `llmsTxt`: `true` — generates `llms.txt` index file
- `llmsFullTxt`: `true` — generates `llms-full.txt` with all content merged
- `llmsMarkdown`: `true` — generates per-page clean `.md` files
- No page filtering — all documentation pages included

### Build Output

The plugin generates files in the VuePress build output directory (`.vuepress/dist/`):
- `llms.txt` — site title, description, and table of contents with links
- `llms-full.txt` — all documentation content in a single text stream
- Per-page `.md` files — clean Markdown without HTML noise

### Verification

- Run `pnpm run docs:build` in `docs/`
- Confirm `llms.txt` and `llms-full.txt` exist in the output
- Spot-check content accuracy

## Out of Scope

- Custom page filtering or content transformation
- Multi-locale configuration
- Custom template structure for `llms.txt`
