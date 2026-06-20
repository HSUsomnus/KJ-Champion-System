# Spec: 04-react-vite-pwa-frontend

> ✅ DONE（已整合進 06-新UI前端開發）

## 背景與範圍

現有 `public/` 純 HTML/JS 難以維護、缺乏型別安全、無法安裝為 PWA。以 React + Vite 重寫，並整合 Tailwind CSS，為長期維護建立良好基礎。

### 範圍

- 新增 `frontend/`：React 18 + Vite 5 前端應用
- PWA 支援（`vite-plugin-pwa`、Workbox）
- `frontend/public/_worker.js`：proxy `/api/*` 至 Zeabur
- 更新 Cloudflare Pages build 設定
- 驗證 React staging 完整環境：LINE Login、行事曆 CRUD、PWA 安裝

---

## 技術設計

### 技術棧

| 項目 | 選擇 |
|------|------|
| 框架 | React 18 + Vite 5 |
| 樣式 | Tailwind CSS v3（mobile-first）|
| PWA | vite-plugin-pwa（Workbox GenerateSW）|
| 路由 | React Router v6 |
| 認證 | 沿用後端 LINE OAuth，不用 liff.js |

### PWA 快取策略

| 資源類型 | 策略 |
|---|---|
| HTML | Network First |
| JS/CSS/圖片（Vite hash）| Cache First（長快取）|
| `/api/*` | Network Only（不快取）|

`registerType: 'autoUpdate'`，新版本自動接管。

### Cloudflare Pages build 設定（React 版）

```
Build command:     cd frontend && npm install && npm run build
Build output dir:  frontend/dist
Root directory:    /（repo 根目錄）
```
