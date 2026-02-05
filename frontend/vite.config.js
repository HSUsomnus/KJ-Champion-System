import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * 本機開發時：/api 與 /health 會轉發到後端 8080
 * 發布到 Vercel 時由 Vercel 的 api/ 處理，不需改動
 */
export default defineConfig({
  plugins: [react()],
  root: '.',
  server: {
    port: 5173,
    // 允許 ngrok 等外部 host 連入（本機開發 + LINE LIFF 測試用）
    allowedHosts: true,
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
      '/health': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
})
