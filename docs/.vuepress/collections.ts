import { defineCollections } from 'vuepress-theme-plume'

export default defineCollections([
  {
    type: 'doc',
    dir: 'user',
    linkPrefix: '/user/',
    title: 'User Guide',
    sidebar: 'auto',
  },
  {
    type: 'doc',
    dir: 'developer',
    linkPrefix: '/developer/',
    title: 'Developer Guide',
    sidebar: 'auto',
  },
])
