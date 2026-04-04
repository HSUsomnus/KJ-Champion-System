import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['康九_logo.png', 'icons/*.png'],
      manifest: {
        id: '/',
        name: 'KJ Champion System',
        short_name: 'KJ Champion',
        description: '康九冠軍夥伴系統 — 會員管理、活動排程、財務追蹤',
        theme_color: '#F7F5F2',
        background_color: '#F7F5F2',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'zh-TW',
        dir: 'ltr',
        categories: ['business', 'productivity'],
        launch_handler: { client_mode: 'navigate-existing' },
        icons: [
          { src: 'icons/icon-72.png', sizes: '72x72', type: 'image/png' },
          { src: 'icons/icon-96.png', sizes: '96x96', type: 'image/png' },
          { src: 'icons/icon-128.png', sizes: '128x128', type: 'image/png' },
          { src: 'icons/icon-144.png', sizes: '144x144', type: 'image/png' },
          { src: 'icons/icon-152.png', sizes: '152x152', type: 'image/png' },
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-384.png', sizes: '384x384', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: '行事曆',
            short_name: '行事曆',
            url: '/calendar',
            icons: [{ src: 'icons/shortcut-calendar.png', sizes: '96x96', type: 'image/png' }],
          },
          {
            name: '會員列表',
            short_name: '會員',
            url: '/members',
            icons: [{ src: 'icons/shortcut-members.png', sizes: '96x96', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//, /^\/.well-known\//],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', networkTimeoutSeconds: 5 },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
