import { defineThemeConfig } from 'vuepress-theme-plume'
import collections from './collections'
import navbar from './navbar'

export default defineThemeConfig({
  logo: false,
  appearance: true,
  profile: {
    name: 'CeeGee',
  },
  navbar,
  collections,
  footer: {
    message: 'CeeGee Documentation',
    copyright: 'MIT Licensed',
  },
})
