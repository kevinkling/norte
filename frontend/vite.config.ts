import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// Por defecto la app vive en la raíz ('/'), como en Cloudflare Pages.
// Si se publica bajo un subpath, definir VITE_BASE_PATH (ej. /norte/).
const base = process.env.VITE_BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Norte',
        short_name: 'Norte',
        description: 'Organizador personal de Casa y Auto',
        theme_color: '#f3f4ef',
        background_color: '#f3f4ef',
        display: 'standalone',
        lang: 'es',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
        ],
      },
      workbox: {
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
  server: {
    port: 5173,
  },
})
