import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// change 20 診斷報告：LINE OAuth callback 是頂層 navigation，若 /survey-api/*
// 沒有排除在 PWA navigateFallbackDenylist 之外，Service Worker 會把它當成
// SPA 路由回傳 index.html，callback 就到不了 Cloudflare Pages Worker proxy。
// 這支測試只防止未來不小心把這條 denylist 規則移除，不驗證 Workbox 實際行為。
describe('vite.config.js PWA navigateFallbackDenylist', () => {
  const source = fs.readFileSync(path.resolve(__dirname, 'vite.config.js'), 'utf8')

  it('排除 /api/ 不進 SPA navigation fallback', () => {
    expect(source).toMatch(/navigateFallbackDenylist:\s*\[[^\]]*\/\^\\\/api\\\//)
  })

  it('排除 /survey-api/ 不進 SPA navigation fallback', () => {
    expect(source).toMatch(/navigateFallbackDenylist:\s*\[[^\]]*\/\^\\\/survey-api\\\//)
  })
})
