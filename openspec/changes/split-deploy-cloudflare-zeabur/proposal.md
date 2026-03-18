# Proposal: split-deploy-cloudflare-zeabur

## Why

專案目前前後端同部署在 Vercel、資料庫在 Supabase，系統已上線正常運作。為了在不影響正式環境的前提下，逐步遷移至更彈性的部署架構，採用「雙分支環境」策略：

- `main` 分支：現有 Vercel 正式環境完全不動
- `staging` 分支：全新 React + Vite + PWA 前端 + Zeabur 後端，作為測試與技術升級的沙盒

遷移分三個階段進行，每個階段獨立驗證、各自切換，確保正式環境隨時可回退。

## What Changes

### 第一階段：建立 staging 測試環境（本次實作範圍）

- **新增** `staging` 分支：從 `main` 建立
- **新增** `frontend/`（僅 `staging` 分支）：全新 React + Vite 前端應用，取代舊版 `public/` 純 HTML 版本
- **新增** `frontend/vite.config.ts`：Vite 設定，含 `vite-plugin-pwa` PWA 支援
- **新增** `frontend/public/_redirects`：Cloudflare Pages API proxy，`/api/*` 轉發至 Zeabur 後端
- **新增** `zbpack.json`（僅 `staging` 分支）：定義 Zeabur 後端啟動指令與 Node.js 版本
- **更新** `env.example`：補充 Zeabur 與 Cloudflare 部署所需環境變數說明
- **確認** `server/server.js` CORS 設定：已有 `FRONTEND_URL` 支援，只需在 Zeabur 設定環境變數

### 第二階段：正式後端切換至 Zeabur

- 前提：`staging` 後端（Zeabur）所有 API、LINE OAuth、Supabase 連線完全驗證 OK
- 將 `main` 正式環境的**後端**從 Vercel 切換至 Zeabur
- 前端仍保留在 Vercel（`public/` 純 HTML），正式使用者無感知

### 第三階段：正式前端切換至 Cloudflare Pages

- 前提：`staging` 前端（Cloudflare Pages + React + Vite + PWA）所有頁面功能完全驗證 OK
- 將 `main` 正式環境的**前端**從 Vercel 切換至 Cloudflare Pages
- 更新 `_redirects` 指向第二階段已切換的正式 Zeabur 後端
- Vercel 正式服務完全退場

## 部署分支架構

```text
GitHub Monorepo（單一倉庫）
│
├── main 分支（正式，現有不動）
│   ├── public/     →  Vercel 前端（純 HTML/JS，正式）
│   └── server/     →  Vercel 後端（正式）
│
└── staging 分支（測試新平台）
    ├── frontend/   →  Cloudflare Pages（React + Vite + PWA，測試前端）
    ├── public/     →  保留（後端 fallback 用，不對外部署）
    └── server/     →  Zeabur（測試後端）
```

各平台只監聽自己的分支，環境變數各自獨立，互不干擾。

## Capabilities

### New Capabilities

- `react-vite-pwa-frontend`：全新 React + Vite 前端，含 PWA（Service Worker、離線快取、可安裝），部署至 Cloudflare Pages `staging` 分支
- `cloudflare-pages-deploy`：Cloudflare Pages 部署設定，含 build pipeline 與 `_redirects` API proxy
- `zeabur-backend-deploy`：後端 Express.js 部署至 Zeabur（`staging` 分支），含 `zbpack.json` 部署設定

### Modified Capabilities

（無既有 spec 需要變更需求）

## Impact

- **正式環境（`main` 分支）**：完全不動，Vercel 前後端繼續正常服務
- **新前端** (`frontend/`)：僅存在於 `staging` 分支，React + Vite + PWA 全新實作
- **舊前端** (`public/`)：`staging` 分支保留但不對外部署；`main` 分支繼續用於正式環境
- **後端** (`server/`)：CORS 已支援 `FRONTEND_URL`，無需改程式碼
- **資料庫**：Supabase 連線不變，`staging` 可共用或另建測試 DB
- **開發流程**：feature → `staging`（測試）→ 各階段獨立驗證 → `main`（正式）
- **切換順序**：後端先切（第二階段）→ 前端再切（第三階段），降低同時切換風險
