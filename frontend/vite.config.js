/**
 * Vite 建置配置
 * - 開發時代理 /api 到後端
 * - 建置產物輸出到 dist/
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // 開發時代理 API 請求到後端（預設 8080）
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/images': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/favicon.ico': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    // 建置產物放在 assets/ 下，方便 SPA fallback
    assetsDir: 'assets',
  },
});
