# Tasks: split-deploy-cloudflare-zeabur

## 1. 建立 staging 分支與後端設定檔

- [x] 1.1 從 `main` 建立 `staging` 分支：`git checkout -b staging`
- [x] 1.2 在專案根目錄建立 `zbpack.json`，設定 `nodejs_version: "18"` 與 `start_command: "node server/server.js"`
- [x] 1.3 更新 `env.example`：`APP_URL` 改為 Zeabur 格式、`FRONTEND_URL` 改為 Cloudflare Pages 格式、新增 `DATABASE_URL`（Zeabur PostgreSQL）說明
- [x] 1.4 在 `.gitignore` 加入 `!zbpack.json` 例外（因現有 `*.json` 規則會擋住）
- [x] 1.5 commit 並 push `staging` 分支到 GitHub

## 2. Zeabur 資料庫建立與資料同步（優先跑完再動後端）

> **DB 先行**：資料庫確認 OK 才部署後端，避免後端指向空庫

### 2a. 建立 Zeabur PostgreSQL

- [x] 2a.1 在 Zeabur 建立新專案，命名 `kj-champion-staging`
- [x] 2a.2 在該專案內新增 **PostgreSQL 服務**（staging 專用，與 Supabase 正式庫隔離）
- [x] 2a.3 記錄 Zeabur PostgreSQL 連線資訊（host、port、user、password、database name）
- [x] 2a.4 確認可從本機連線至 Zeabur PostgreSQL（用 `psql` 或 TablePlus 測試）

### 2b. 從 Supabase 單向同步資料到 Zeabur（只做一次）

> Supabase → Zeabur，單向複製，staging 測試完畢後資料以 Zeabur 為主

- [x] 2b.1 從 Supabase 匯出 schema（`pg_dump --schema-only`）：所有 table、index、constraint、enum
- [x] 2b.2 將 schema SQL 匯入 Zeabur PostgreSQL，確認所有 table 建立成功
- [x] 2b.3 從 Supabase 匯出正式資料（`pg_dump --data-only`，排除 auth、storage 等系統表）
- [x] 2b.4 將資料 SQL 匯入 Zeabur PostgreSQL
- [x] 2b.5 核對資料筆數：對每張主要 table 比較 Supabase vs Zeabur 的 `COUNT(*)`，確認一致

### 2c. 驗證 Zeabur 資料庫正確性（通過後才切換後端）

- [x] 2c.1 檢查所有 table 的 row count 與 Supabase 相符
- [x] 2c.2 抽查至少 3 筆 event 記錄，確認欄位值與 Supabase 一致
- [x] 2c.3 確認 foreign key、index 等 constraint 均有效（無 orphan 資料）
- [x] 2c.4 ✅ **通過後，才進行步驟 2d**

### 2d. 正式後端（Vercel）切換至 Zeabur DB — 真人驗證

> 資料庫先換，後端平台暫時不動。讓真實使用者在熟悉的正式環境驗證 Zeabur DB 是否穩定。

- [x] 2d.1 在 Vercel 控制台（正式後端），將 `DATABASE_URL` 環境變數從 Supabase 連線字串改為 **Zeabur PostgreSQL 外網連線字串**（`postgresql://root:<pw>@43.163.196.8:30756/zeabur`）
- [x] 2d.2 在 Vercel 重新部署（Redeploy）正式後端，確認啟動成功、無連線錯誤
- [x] 2d.3 在正式環境執行基本 API 冒煙測試：`/api/members`、`/api/calendar/events` 回傳正確資料
- [x] 2d.4 **真人測試**：讓實際使用者在正式 APP 操作 1–2 天，確認新增行程、成員、LINE Login 均正常
- [x] 2d.5 觀察期間同步監控 Zeabur PostgreSQL 連線數、查詢延遲，確認無異常
- [x] 2d.6 ⚠️ **Supabase 此時仍保留，不停用**；若 Zeabur DB 異常，將 `DATABASE_URL` 切回 Supabase 即可立即回退
- [x] ✅ **真人驗證通過後，才進行 2e（雙寫實作）**

### 2e. 實作 Supabase 雙寫備份（只寫不讀）

> 切換至 Zeabur DB 後，所有寫入同時複製到 Supabase 作為 live 熱備份。讀取只從 Zeabur，Supabase 僅接收寫入備份。

- [x] 2e.1 在 `server/services/` 新增 `dualWriteService.js`：
  - 實作 `dualWrite(primaryFn, backupFn)` — 主庫失敗直接拋錯，備份庫失敗 `console.warn` 後靜默（fire-and-forget）
  - 讀取 `DUAL_WRITE_ENABLED` 環境變數，若為 `false` 則直接執行 `primaryFn` 不觸發備份
  - ⚠️ **注意**：程式碼應 commit 至 `main` 分支（正式 Vercel 監聽 `main`），非 `staging`
- [x] 2e.2 在 `server/services/` 中涉及寫入的 service（`memberDbService`、`eventDbService`）將 DB 寫入改用 `dualWrite()` 包裝
- [x] 2e.3 在 `env.example` 新增雙寫相關說明：`DUAL_WRITE_ENABLED=true`、`SUPABASE_BACKUP_URL=<supabase-direct-url>`
- [x] 2e.4 在 Vercel 控制台新增環境變數：`DUAL_WRITE_ENABLED=true`、`SUPABASE_BACKUP_URL`（Supabase Direct 連線字串）
- [x] 2e.5 Redeploy 正式後端：v1.5.2 已推送 `main`，Vercel 自動重新部署（含 SSL 修正）
  - 🐛 **根本原因**：初次實作程式碼只在 staging 本地未 commit，且 backupPool 缺少 `ssl: { rejectUnauthorized: false }` 導致 Supabase 連線被拒、靜默失敗
  - ✅ **修正**：補上 SSL 設定，程式碼正確 commit 至 `main`（v1.5.2）
- [x] 2e.5b ⚠️ **計畫外修補（2026-03-22，v1.5.3）**：AI 誤將 `dualWriteService.js` 加入 `staging` 分支並推送
  - **原因**：使用者詢問診斷問題時，AI 未查 tasks 順序直接動手（違反規則）
  - **影響**：staging 現在也有 `dualWriteService.js`；對 2f 部署無害，但屬計畫外行為
  - **結論**：此修改本身不影響 2f 進行，但已記錄以防混淆
- [x] ~~2e.6 手動執行一筆寫入（新增測試行程），確認 Zeabur 與 Supabase 兩邊都有收到該筆資料~~
  - ❌ **跳過並取消（2026-03-22，v1.5.4）**：雙寫驗證問題無法解決，決定直接移除雙寫機制
- [x] ~~2e.7 模擬 Supabase 備份失敗驗證~~
  - ❌ **跳過並取消（同上）**
- [x] 2e.8 **計畫外（v1.5.4）移除雙寫服務**：
  - 刪除 `server/services/dualWriteService.js`（main + staging）
  - `eventDbService.js`：3 處 `dualWrite()` 改回直接 `db.query`（upsertEvents、deleteEventsNotIn、deleteEventById）
  - `memberDbService.js`：4 處 `dualWrite()` 改回直接 `db.query`（createMember、updateMember、updateMemberRole、updateFinancialAmount）
  - 結果：所有寫入現在只走 Zeabur PostgreSQL，Supabase 不再接收任何寫入
  - ✅ main + staging 均已推送，Vercel 已自動重新部署

### 2f. Zeabur 後端部署（staging）

> DB 已驗證、雙寫已上線，後端平台才有意義搬移。

- [ ] 2f.1 在 Zeabur 同一專案內新增 **Node.js 服務**，連接 GitHub repo，**指定監聽 `staging` 分支**
- [ ] 2f.2 設定後端環境變數：`DATABASE_URL`（Zeabur **內網** PostgreSQL URL）、`LINE_*`、`GOOGLE_*`、`LIFF_ID`、`NODE_ENV=production`（雙寫已移除，不需 `DUAL_WRITE_ENABLED` / `SUPABASE_BACKUP_URL`）
- [ ] 2f.3 部署後確認後端啟動成功，**記錄 Zeabur 分配的網域**（e.g. `https://kj-champion.zeabur.app`）
- [ ] 2f.4 在 LINE Developer Console → LINE Login Channel → Callback URL 加入 `https://<zeabur-backend>/api/auth/callback`
- [ ] 2f.5 用現有 `public/` 前端（`?dev=1` 暫指 Zeabur staging 後端）驗證：API 回應正常、DB CRUD 讀寫正確
- [ ] 2f.6 確認 LINE Login OAuth 完整流程可走通（登入 → Zeabur 回調 → 取得使用者資訊）

## 3. 建立 React + Vite + PWA 前端專案骨架

- [ ] 3.1 在 `staging` 分支執行 `npm create vite@latest frontend -- --template react-ts`
- [ ] 3.2 進入 `frontend/`，安裝依賴：`npm install -D vite-plugin-pwa workbox-window`
- [ ] 3.3 設定 `frontend/vite.config.ts`：加入 `@vitejs/plugin-react` 與 `vite-plugin-pwa`，設定 `registerType: 'autoUpdate'`、`/api/*` NetworkOnly 策略
- [ ] 3.4 在 `vite.config.ts` 的 `manifest` 填入：`name: "KJ Champion"`、`short_name: "康九冠軍夥伴系統"`、`theme_color: "#D4AF37"`、`display: "standalone"`、`icons`
- [ ] 3.5 建立 `frontend/public/_redirects`（佔位符）：

  ```text
  /api/*  https://PLACEHOLDER_ZEABUR_URL/api/:splat  200
  /*      /index.html                                 200
  ```
- [ ] 3.6 建立 `frontend/public/_headers`：`/assets/*` → `Cache-Control: public, max-age=31536000, immutable`；`/*.html` → `Cache-Control: no-cache`
- [ ] 3.7 確認 `npm run build` 正常，`frontend/dist/` 產生含 `sw.js` 與 `manifest.webmanifest`

## 4. shadcn/ui 整合

- [ ] 4.1 在 `frontend/` 執行 `npx shadcn@latest init`，選擇 Tailwind CSS v3、CSS 變數模式
- [ ] 4.2 在 `frontend/src/index.css`（或 `globals.css`）調整 CSS 變數：主色調對應現有設計語言（金色 `#D4AF37` 對應 `--primary`）
- [ ] 4.3 加入初期需要的元件：`npx shadcn@latest add button dialog calendar input table form`
- [ ] 4.4 確認 `src/components/ui/` 目錄正確建立，`npm run build` 仍通過

## 5. 更新 _redirects 並部署前端

- [ ] 5.1 將 `frontend/public/_redirects` 的 `PLACEHOLDER_ZEABUR_URL` 替換為步驟 2.5 取得的真實 Zeabur URL
- [ ] 5.2 commit 並 push 到 `staging`
- [ ] 5.3 在 Cloudflare Pages 建立新專案，專案命名 `kj-champion-staging`，連接同一個 GitHub repo，**指定監聽 `staging` 分支**
- [ ] 5.4 設定 Cloudflare Pages：Build command = `cd frontend && npm install && npm run build`，Build output directory = `frontend/dist`
- [ ] 5.5 部署完成後，**記錄 Cloudflare Pages 網域**（e.g. `https://kj-champion-staging.pages.dev`）

## 6. 完成環境變數設定

- [ ] 6.1 在 Zeabur 設定 `FRONTEND_URL` = 步驟 5.5 的 Cloudflare Pages 網域
- [ ] 6.2 在 Zeabur 重啟後端服務，確認 CORS 白名單生效

## 7. 驗證 staging 完整環境

- [ ] 7.1 瀏覽器訪問 Cloudflare Pages URL，確認 React 頁面載入
- [ ] 7.2 測試 LINE Login OAuth 完整流程（登入 → 回調 → 取得使用者資訊）
- [ ] 7.3 測試行事曆 CRUD（新增、讀取、刪除行程）
- [ ] 7.4 確認 PWA：手機瀏覽器顯示「加入主畫面」提示，安裝後以獨立視窗開啟
- [ ] 7.5 確認 Service Worker：離線開啟應用程式顯示 App Shell
- [ ] 7.6 確認 `main` 分支 Vercel 正式環境完全不受影響

## 8. （第二階段）正式後端切換至 Zeabur

> **前提**：第 7 節所有驗證項目通過；Zeabur DB 已在第一階段由真人驗證穩定（Task 2d）

- [ ] 8.1 在 Zeabur 建立正式專案 `kj-champion`，為 `main` 分支建立獨立正式服務（與 staging 服務分開）
- [ ] 8.2 設定正式 Zeabur 環境變數：`DATABASE_URL` = Zeabur PostgreSQL 內網 URL、`FRONTEND_URL` = 現有 Vercel 前端 URL
- [ ] 8.3 在 LINE Developer Console，正式 Callback URL 新增正式 Zeabur 網域
- [ ] 8.4 將 Vercel 前端（`public/`）的 API 呼叫透過 Vercel rewrites proxy 至正式 Zeabur 後端
- [ ] 8.5 觀察正式環境 24 小時，確認 API、LINE Login、DB 均正常
- [ ] 8.6 確認穩定後，停用 Vercel 後端服務（⚠️ **Supabase 此時仍保留，不停用**）

## 9. （第三階段）正式前端切換至 Cloudflare Pages

> **前提**：staging 前端所有頁面驗證完畢，且第二階段後端已穩定

- [ ] 9.1 完成所有功能頁面移植（React 版本對齊 `public/` 所有現有頁面）
- [ ] 9.2 在 Cloudflare Pages 建立正式專案 `kj-champion`，監聽 `main` 分支（與 staging 分開）
- [ ] 9.3 更新 `main` 分支 `frontend/public/_redirects`，`/api/*` 指向正式 Zeabur 後端
- [ ] 9.4 正式網域 DNS 切換至 Cloudflare Pages
- [ ] 9.5 觀察正式環境 24 小時，確認所有功能正常
- [ ] 9.6 確認穩定後，停用 Vercel 前端服務（Vercel 完全退場）
- [ ] 9.7 LINE Developer Console 正式 Callback URL 移除 Vercel 網域
- [x] ~~9.8 關閉雙寫~~：❌ 不適用（雙寫已於 v1.5.4 從程式碼移除，無需設定環境變數）
- [x] ~~9.9 確認 Supabase 收不到新寫入~~：✅ v1.5.4 起已確定不再寫入 Supabase
- [ ] 9.10 **正式停用並刪除 Supabase 專案**（待第三階段前端切換完成後執行）
