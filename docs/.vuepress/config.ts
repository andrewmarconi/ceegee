import { viteBundler } from '@vuepress/bundler-vite'
import { defineUserConfig } from 'vuepress'
import { plumeTheme } from 'vuepress-theme-plume'

export default defineUserConfig({
  base: '/ceegee/',
  bundler: viteBundler(),
  theme: plumeTheme(),
  lang: 'en-US',
  title: 'CeeGee',
  description: 'CeeGee Documentation',
})