# VuePress LLMs Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install and configure `@vuepress/plugin-llms` to generate LLM-friendly documentation output during production builds.

**Architecture:** Add the plugin as a dev dependency in the docs workspace, configure it in the VuePress config with the GitHub Pages domain, and verify the build generates the expected output files.

**Tech Stack:** VuePress 2, @vuepress/plugin-llms, pnpm

---

### Task 1: Install the Plugin

**Files:**
- Modify: `docs/package.json`

- [ ] **Step 1: Install the plugin**

```bash
cd docs && pnpm add -D @vuepress/plugin-llms@next
```

Expected: `@vuepress/plugin-llms` appears in `devDependencies` in `docs/package.json`.

- [ ] **Step 2: Commit**

```bash
git add docs/package.json docs/pnpm-lock.yaml
git commit -m "chore: install @vuepress/plugin-llms (#49)"
```

### Task 2: Configure the Plugin

**Files:**
- Modify: `docs/.vuepress/config.ts:1-12`

- [ ] **Step 1: Add the plugin to VuePress config**

Update `docs/.vuepress/config.ts` to:

```ts
import { viteBundler } from '@vuepress/bundler-vite'
import { llmsPlugin } from '@vuepress/plugin-llms'
import { defineUserConfig } from 'vuepress'
import { plumeTheme } from 'vuepress-theme-plume'

export default defineUserConfig({
  base: '/ceegee/',
  bundler: viteBundler(),
  theme: plumeTheme(),
  lang: 'en-US',
  title: 'CeeGee',
  description: 'CeeGee Documentation',
  plugins: [
    llmsPlugin({
      domain: 'https://andrewmarconi.github.io/ceegee/',
    }),
  ],
})
```

- [ ] **Step 2: Commit**

```bash
git add docs/.vuepress/config.ts
git commit -m "feat: configure @vuepress/plugin-llms with GitHub Pages domain (#49)"
```

### Task 3: Build and Verify Output

- [ ] **Step 1: Run the production build**

```bash
cd docs && pnpm run docs:build
```

Expected: Build completes successfully without errors.

- [ ] **Step 2: Verify llms.txt exists**

```bash
cat docs/.vuepress/dist/llms.txt
```

Expected: File exists and contains the site title "CeeGee", a description, and a table of contents with links to documentation pages. Links should use the domain `https://andrewmarconi.github.io/ceegee/`.

- [ ] **Step 3: Verify llms-full.txt exists**

```bash
head -50 docs/.vuepress/dist/llms-full.txt
```

Expected: File exists and contains merged documentation content in plain text/Markdown format.

- [ ] **Step 4: Verify per-page .md files exist**

```bash
find docs/.vuepress/dist -name "*.md" | head -20
```

Expected: Clean Markdown files corresponding to documentation pages are present in the output directory.
