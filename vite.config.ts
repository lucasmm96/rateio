import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/rateio/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Controle de Rateios',
        short_name: 'Rateios',
        description: 'Gerencie rateios de despesas compartilhadas com correção por índice',
        theme_color: '#00A868',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: '/rateio/',
        scope: '/rateio/',
        lang: 'pt-BR',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
      },
    }),
  ],
})
