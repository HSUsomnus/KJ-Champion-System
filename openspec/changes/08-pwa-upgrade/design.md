# 08 PWA 全平台升級 — 設計

## 技術方案

### 1. 圖示生成
- 使用 `sharp` (devDependency) 從 `icon-512.png` 自動生成所有尺寸
- 標準圖示：72, 96, 128, 144, 152, 192, 384, 512
- Maskable 圖示：192, 512（縮小到 80% 安全區域 + #F7F5F2 padding）
- Apple 專用：152, 167, 180
- Shortcuts 圖示：96x96
- 腳本位置：`frontend/scripts/generate-icons.js`

### 2. Manifest 升級（vite-plugin-pwa）
在 `frontend/vite.config.js` 的 VitePWA manifest 加入：
- `id: '/'` — Chrome 114+ PWA 唯一識別符
- `description` — WebAPK 品質評級
- `lang: 'zh-TW'`, `dir: 'ltr'`
- `categories: ['business', 'productivity']`
- `display_override: ['window-controls-overlay', 'standalone']` — Desktop
- `launch_handler: { client_mode: 'navigate-existing' }` — Desktop
- 完整 icons 陣列（含 maskable）
- `shortcuts`（行事曆、會員列表）

### 3. iOS Meta Tags
在 `frontend/index.html` 加入：
- `apple-mobile-web-app-status-bar-style: black-translucent`
- `apple-mobile-web-app-title`
- 多尺寸 `apple-touch-icon`

### 4. Digital Asset Links
新增 `frontend/public/.well-known/assetlinks.json`，讓 Google 驗證 WebAPK 與網站所有權。

### 5. Service Worker 優化
- workbox `navigateFallbackDenylist` 排除 `/.well-known/`
