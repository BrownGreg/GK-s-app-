import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // injectManifest (plutôt que generateSW) : nécessaire pour avoir un
      // service worker à nous, avec un gestionnaire d'évènement `push` pour
      // les notifications — generateSW ne permet pas d'ajouter du code perso.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Nos envies',
        short_name: 'Nos envies',
        description: 'La carte de nos dates, de nos envies et de nos souvenirs.',
        start_url: '/',
        display: 'standalone',
        background_color: '#0B1730',
        theme_color: '#0B1730',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024
      }
    })
  ]
})
