# Proposal: split-deploy-cloudflare-zeabur

## Why

專案目前以 `Line_Liff` 為名，前後端同部署在 Vercel、資料庫在 Supabase，系統已上線正常運作。本次重構同步引入正式專案名稱 **KJ-Champion**，取代只描述技術實作的舊名。為了在不影響正式環境的前提下，逐步遷移至更彈性的部署架構，採用「雙分支環境」策略：

- `main` 分支：現有 Vercel 正式環境完全不動
- `staging` 分支：全新 React + Vite + PWA 前端 + Zeabur 後端，作為測試與技術升級的沙盒

遷移分三個階段進行，每個階段獨立驗證、各自切換，確保正式環境隨時可回退。

## What Changes

### 第一階段：建立 staging 測試環境（進行中）

> **執行順序：DB 同步驗證 → 正式後端換 DB（真人驗證）→ 雙寫實作 → staging 後端部署 → 前端部署**

- **✅ 完成** `staging` 分支：從 `main` 建立，含 `zbpack.json`（Zeabur 部署設定）
- **✅ 完成** Zeabur PostgreSQL 建立 + Supabase → Zeabur 單向資料同步（schema + 業務資料，已核對筆數）
- **✅ 完成** 正式後端（Vercel）`DATABASE_URL` 切換至 Zeabur DB → 真人驗證通過
- **✅ 完成（v1.5.2 / main）** `server/services/dualWriteService.js`：雙寫服務，所有 DB 寫入同時 fire-and-forget 複製到 Supabase 作為備份，讀取只從 Zeabur。以 `DUAL_WRITE_ENABLED` 環境變數控制開關
  - ⚠️ **實作說明**：雙寫程式碼提交至 `main` 分支（v1.5.2），非 `staging`，因正式 Vercel 後端監聽 `main`
  - 🐛 **SSL 修正**：`backupPool` 需設定 `ssl: { rejectUnauthorized: false }` 才能連線 Supabase（Supabase 要求 SSL），初次實作遺漏導致備份靜默失敗，已於 v1.5.2 修正
- **✅ 完成** `memberDbService`、`eventDbService` 所有寫入改用 `dualWrite()` 包裝
- **✅ 完成** Vercel 控制台設定 `DUAL_WRITE_ENABLED=true`、`SUPABASE_BACKUP_URL`，已重新部署
- **⏳ 待驗證** 手動寫入測試，確認 Zeabur 與 Supabase 兩邊均收到資料（2e.6）
- **⏳ 待驗證** 雙寫失敗容錯測試（2e.7）
- **⬜ 待執行** Zeabur 後端部署（staging 分支，Task 2f）
- **新增** `frontend/`（僅 `staging` 分支）：全新 React + Vite + TypeScript 前端應用，整合 shadcn/ui 元件庫（Radix UI + Tailwind CSS），取代舊版 `public/` 純 HTML 版本
- **新增** `frontend/vite.config.ts`：Vite 設定，含 `vite-plugin-pwa` PWA 支援
- **新增** `frontend/public/_redirects`：Cloudflare Pages API proxy，`/api/*` 轉發至 Zeabur 後端

### 第二階段：正式後端切換至 Zeabur

- 前提：**Zeabur PostgreSQL 已由真人在正式環境驗證穩定**（Task 2d 通過），雙寫已上線
- 將 `main` 正式環境的**後端**從 Vercel 切換至 Zeabur，`DATABASE_URL` 指向 Zeabur PostgreSQL 內網 URL
- 雙寫持續運作（Supabase 仍接收備份寫入）
- 前端仍保留在 Vercel（`public/` 純 HTML），正式使用者無感知
- ⚠️ **Supabase 此階段保留，不停用**

### 第三階段：正式前端切換至 Cloudflare Pages

- 前提：`staging` 前端（Cloudflare Pages + React + Vite + PWA）所有頁面功能完全驗證 OK
- 將 `main` 正式環境的**前端**從 Vercel 切換至 Cloudflare Pages
- 更新 `_redirects` 指向第二階段已切換的正式 Zeabur 後端
- Vercel 正式服務完全退場
- **關閉雙寫**（`DUAL_WRITE_ENABLED=false`）→ 確認 Supabase 不再收到新寫入 → **正式停用並刪除 Supabase**

## 部署分支架構

```text
GitHub Monorepo（單一倉庫，新名稱：KJ-Champion）
│
├── main 分支（正式，現有不動）
│   ├── public/     →  Vercel 前端（純 HTML/JS，正式）
│   └── server/     →  Vercel 後端（正式）
│                       ├── DATABASE_URL → Zeabur PostgreSQL（已切換）
│                       ├── DUAL_WRITE_ENABLED=true（雙寫備份至 Supabase，v1.5.2）
│                       └── SUPABASE_BACKUP_URL → Supabase（fire-and-forget 備份）
│
└── staging 分支（測試新平台）
    ├── frontend/   →  Cloudflare Pages kj-champion-staging（React + Vite + PWA）
    ├── public/     →  保留（後端 fallback 用，不對外部署）
    └── server/     →  Zeabur kj-champion-staging（測試後端）
                        └── PostgreSQL kj-champion-staging（Supabase 單向同步初始化）
```

各平台只監聽自己的分支，環境變數各自獨立，互不干擾。

## Capabilities

### New Capabilities

- `kj-champion-react-frontend`：全新 React + Vite 前端（`frontend/`），元件與函式以 `KjChampion` / `kjChampion` 命名，含 PWA（Service Worker、離線快取、可安裝）與 shadcn/ui 元件庫（Radix UI + Tailwind CSS），部署至 Cloudflare Pages `kj-champion-staging`
- `cloudflare-pages-deploy`：Cloudflare Pages 部署設定，含 build pipeline 與 `_redirects` API proxy
- `zeabur-backend-deploy`：後端 Express.js 部署至 Zeabur `kj-champion-staging`，含 `zbpack.json` 部署設定與 Zeabur PostgreSQL 服務
- `dual-write-service`：`server/services/dualWriteService.js`，封裝雙寫邏輯（主庫寫入 + Supabase fire-and-forget 備份），以環境變數 `DUAL_WRITE_ENABLED` 控制開關，重構完成後關閉。SSL 連線需設定 `ssl: { rejectUnauthorized: false }`

### Modified Capabilities

- `server/services/memberDbService.js`、`eventDbService.js`：DB 寫入改用 `dualWrite()` 包裝（讀取路徑不動）
- `env.example`：新增 `DUAL_WRITE_ENABLED`、`SUPABASE_BACKUP_URL`、`DATABASE_URL`（Zeabur 格式）說明

## Impact

- **正式環境（`main` 分支）**：`DATABASE_URL` 已切至 Zeabur PostgreSQL，雙寫服務已部署（v1.5.2），其餘完全不動
- **新前端** (`frontend/`)：僅存在於 `staging` 分支，React + Vite + PWA 全新實作
- **舊前端** (`public/`)：`staging` 分支保留但不對外部署；`main` 分支繼續用於正式環境直到第三階段
- **後端** (`server/`)：新增 `dualWriteService.js`（main 分支 v1.5.2）；寫入型 services 加 `dualWrite()` 包裝；其餘業務邏輯與 API 路由不動
- **資料庫**：Supabase 資料已單向同步至 Zeabur PostgreSQL；切換後持續雙寫備份；**Supabase 保留至第三階段確認完成後才停用**
- **切換順序**：DB 先切（✅）→ 雙寫備份上線（✅）→ 後端平台切換（第二階段）→ 前端切換（第三階段），每步可獨立回退
