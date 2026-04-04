# 08 PWA 全平台升級 — Tasks

## 前置

- [x] **08.0** 從 main 切出 `m_b_pwa_upgrade` 分支
- [x] **08.1** 建立 OpenSpec change 文件

## 圖示生成

- [x] **08.2** 安裝 sharp 為 devDependency
- [x] **08.3** 建立 `frontend/scripts/generate-icons.js` 腳本
- [x] **08.4** 執行腳本生成所有圖示（15 個檔案）

## Manifest 升級

- [x] **08.5** 修改 `frontend/vite.config.js` — manifest 全平台欄位升級
- [x] **08.6** 修改 `frontend/vite.config.js` — workbox 排除 `.well-known`

## iOS 支援

- [x] **08.7** 修改 `frontend/index.html` — iOS meta tags + apple-touch-icon

## Android 驗證

- [x] **08.8** 新增 `frontend/public/.well-known/assetlinks.json`

## 驗證

- [x] **08.9** 本機 build 成功（`npm run build`）
- [ ] **08.10** 合併到 dev 分支測試
