# 08 PWA 全平台升級

## 問題

使用者在 Android 手機安裝 PWA 時，Google Play Protect 跳出「已封鎖不安全的應用程式」警告。原因是 manifest 不符合現代標準，導致 Chrome 生成的 WebAPK 品質評級低。同時 iOS 和 Desktop 的 PWA 支援也不完整。

## 目標

將 PWA 升級到 2025-2026 全平台最新標準：

1. **Android**：完整 manifest + maskable icons + Digital Asset Links → 解決 Play Protect 封鎖
2. **iOS**：apple-touch-icon 全尺寸 + 透明狀態列 + apple-mobile-web-app-title
3. **Desktop**：Window Controls Overlay + launch_handler

## 範圍

- 修改 `frontend/vite.config.js`（manifest + workbox）
- 修改 `frontend/index.html`（iOS meta tags）
- 新增圖示生成腳本 + 自動生成所有尺寸
- 新增 `.well-known/assetlinks.json`
- 不使用 TWA/Bubblewrap

## 不做

- Screenshots（之後手動補）
- Web Push Notifications（未來獨立 change）
- TWA/Google Play 上架
