// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'
import Aura from '@primeuix/themes/aura'

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@primevue/nuxt-module'],
  devtools: {
    enabled: true
  },
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-01-15',
  nitro: {
    experimental: {
      websocket: true
    }
  },
  vite: {
    plugins: [tailwindcss()]
  },
  debug: true,
  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },
  primevue: {
    options: {
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.p-dark'
        }
      }
    }
  }
})
