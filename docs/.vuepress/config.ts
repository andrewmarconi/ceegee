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
      domain: 'https://andrewmarconi.github.io',
    }),
  ],
})