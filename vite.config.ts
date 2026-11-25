import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'favicons/favicon-16x16.png',
        'favicons/favicon-32x32.png',
        'favicons/favicon-48x48.png',
        'favicons/favicon.ico',
        'icons/apple-touch-icon-180x180.png',
      ],
      manifest: {
        name: 'Controle de Rateios',
        short_name: 'Rateios',
        description: 'Gerencie rateios de despesas compartilhadas com correção por índice',
        theme_color: '#00A868',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'pt-BR',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icons/android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        cleanupOutdatedCaches: true,
        // Navegações vão à rede primeiro: evita que um index.html antigo
        // precacheado durante a propagação de um deploy fique preso no SW.
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'navegacao',
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
    }),
  ],
})
