import { defineThemeConfig } from 'vuepress-theme-plume'
import collections from './collections'
import navbar from './navbar'

export default defineThemeConfig({
  logo: false,
  appearance: 'force-dark',
  profile: {
    name: 'CeeGee',
  },
  navbar,
  collections,
  social: [
    { icon: 'github', link: 'https://github.com/andrewmarconi/ceegee' },
  ],
  footer: {
    message: 'CeeGee Documentation',
    copyright: 'MIT Licensed',
  },
})
