import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['康九_logo.png', 'icons/*.png'],
      manifest: {
        name: 'KJ Champion System',
        short_name: 'KJ Champion',
        description: '康九冠軍系統',
        theme_color: '#F7F5F2',
        background_color: '#F7F5F2',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // /survey-api/ 必須排除在 SPA navigation fallback 之外：LINE OAuth callback
        // 是瀏覽器頂層 navigation，若被 Service Worker 當成 SPA 路由回傳 index.html，
        // callback 永遠到不了 Cloudflare Pages Worker proxy / kj-survey-server（change 20 診斷報告）
        navigateFallbackDenylist: [/^\/api\//, /^\/survey-api\//],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', networkTimeoutSeconds: 5 },
          },
          {
            urlPattern: /^https?:\/\/.*\/survey-api\/.*/,
            handler: 'NetworkFirst',
            options: { cacheName: 'survey-api-cache', networkTimeoutSeconds: 5 },
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
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.js'],
  },
})
