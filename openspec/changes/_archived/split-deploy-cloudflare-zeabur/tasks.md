# Tasks: split-deploy-cloudflare-zeabur

> 📍 **目前進度：2g 驗證中（Cloudflare Pages + Zeabur 前後端串接）**
>
> 下一個里程碑：2g.12 通過 → 進入 2h（設計）→ Task 3（React 重構）

## Meta：開發流程調整（計畫外，2026-03-24）

- [x] M.1 簡化 CLAUDE.md OpenSpec 規則為「修改計畫 / 執行計畫」兩關鍵字工作流
- [x] M.2 新建 `openspec/STATUS.md` 作為每次對話的導航起點

---

## ✅ 第一階段：環境建立（全部完成）

### 1. staging 分支與後端設定檔

- [x] 1.1 建立 `staging` 分支
- [x] 1.2 建立 `zbpack.json`（Zeabur Node.js 部署設定）
- [x] 1.3 更新 `env.example`
- [x] 1.4 `.gitignore` 加入 `!zbpack.json`
- [x] 1.5 push `staging` 分支到 GitHub

### 2a–2c. Zeabur PostgreSQL 建立與資料同步

- [x] 2a Zeabur 建立 PostgreSQL 服務（`kj-champion-staging` 專案）
- [x] 2b Supabase → Zeabur 單向資料同步（schema + data）
- [x] 2c 驗證 Zeabur DB 正確性（row count、欄位抽查、foreign key）

### 2d. 正式後端切換至 Zeabur DB（真人驗證通過）

- [x] 2d Vercel `DATABASE_URL` 改指向 Zeabur PostgreSQL，真人驗證 1–2 天通過

### 2e. 雙寫實作與移除（已結束）

- [x] 2e.1–2e.5 雙寫服務實作（v1.5.2）
- [x] 2e.8 移除雙寫服務（v1.5.4）；所有寫入直接走 Zeabur 主庫
- [x] 2e.9 清理 Google Sheets 死碼與變數命名
- [x] 2e.10 清理 `.env` 死碼，補齊 `FRONTEND_URL`、`CRON_SECRET`

---

## ✅ 2f. Zeabur 後端部署（staging）— 全部完成

- [x] 2f.1 Zeabur 新增 Node.js 服務，監聽 `staging` 分支
- [x] 2f.2 設定環境變數（`DATABASE_URL` 內網、`LINE_*`、`GOOGLE_*`、`APP_URL`、`FRONTEND_URL`）
- [x] 2f.3 後端啟動成功，網域：`https://kj-champion.zeabur.app`
- [x] 2f.4 LINE Developer Console Callback URL 新增 `https://kj-champion.zeabur.app/api/auth/line-callback`
- [x] 2f.5 API 驗證：`/api/members` 回傳正確資料
- [x] 2f.6 LINE Login OAuth 完整流程驗證通過

---

## 🔄 2g. 部署現有前端至 Cloudflare Pages（驗證中）

> **目標**：`public/` 原封不動部署到 Cloudflare Pages，驗證前後端完整串接。通過後才進 Task 3。

### 基礎建設（已完成）

- [x] 2g.1 確認 2f 全部完成
- [x] 2g.2 確認 `staging` 分支 `public/` 與正式版一致
- [x] 2g.3 Cloudflare Pages 建立專案 `kj-champion-system`（監聽 `staging`，Build output: `public`）
- [x] 2g.4 部署完成，網域：`https://kj-champion-system.pages.dev`
- [x] 2g.5 Zeabur 設定 `FRONTEND_URL=https://kj-champion-system.pages.dev`
- [x] 2g.6 LINE Developer Console 新增 Callback URL：`https://kj-champion-system.pages.dev/api/auth/line-callback`

### API Proxy 建立（已完成）

- [x] 2g.7a `public/_redirects` 嘗試失敗：Cloudflare Pages 不支援 proxy 外部 URL
- [x] 2g.7b 改用 `public/_worker.js`（Cloudflare Workers）proxy `/api/*` 至 Zeabur；使用 `redirect: 'manual'` 讓 LINE OAuth redirect 直接透傳瀏覽器

### LINE Login 修正（已完成）

- [x] 2g.8a 修正 `server/routes/auth.js`：callback 後 redirect 改用 `FRONTEND_URL + returnUrl`，登入後跳回 Cloudflare Pages

### 驗證（進行中）

- [ ] 2g.9 **API 溝通驗證**（從 `kj-champion-system.pages.dev` 發出）：
  - `/api/members` 回傳成員列表正確
  - `/api/calendar/events` 回傳行事曆資料正確
  - 新增 / 刪除測試行程，DB CRUD 讀寫正確
- [ ] 2g.10 **資料庫連線驗證**：確認 CRUD 資料落在 Zeabur PostgreSQL（非 Supabase）
- [ ] 2g.11 **LINE Login 完整流程**：Cloudflare Pages → LINE 登入 → Zeabur 回調 → 跳回 Cloudflare Pages → 正常使用
- [ ] 2g.12 ✅ **以上全部通過，才進入 2h 與 Task 3**

---

## ⬜ 2h. Pencil 設計（重構前必做）

- [ ] 2h.1 盤點 `public/` 所有頁面與跳轉關係
- [ ] 2h.2 使用 Pencil 設計各頁面 UI 佈局與互動流程
- [ ] 2h.3 確認設計稿與後端 API 對齊
- [ ] 2h.4 使用者確認設計稿，無重大異議後鎖定
- [ ] 2h.5 ✅ **設計確認後，才進入 Task 3**

---

## ⬜ Task 3. 建立 React + Vite + PWA 前端專案骨架

> **前提**：2g + 2h 全部通過

- [ ] 3.1 `staging` 分支執行 `npm create vite@latest frontend -- --template react-ts`
- [ ] 3.2 安裝依賴：`vite-plugin-pwa`、`workbox-window`
- [ ] 3.3 設定 `vite.config.ts`：plugin-react、vite-plugin-pwa、`/api/*` NetworkOnly 策略
- [ ] 3.4 設定 PWA manifest（name: KJ Champion、short_name: 康九冠軍夥伴系統、theme_color: #D4AF37）
- [ ] 3.5 建立 `frontend/public/_worker.js`（同 `public/_worker.js` 架構，proxy `/api/*` 至 Zeabur）
- [ ] 3.6 建立 `frontend/public/_headers`（assets 長快取、html no-cache）
- [ ] 3.7 確認 `npm run build` 正常，`frontend/dist/` 產生含 `sw.js`

## ⬜ Task 4. shadcn/ui 整合

- [ ] 4.1 `npx shadcn@latest init`（Tailwind CSS v3、CSS 變數模式）
- [ ] 4.2 調整 CSS 變數主色調（金色 `#D4AF37` → `--primary`）
- [ ] 4.3 加入初期元件：button、dialog、calendar、input、table、form
- [ ] 4.4 確認 `npm run build` 通過

## ⬜ Task 5. 更新 Cloudflare Pages build 設定

- [ ] 5.1 在 `kj-champion-system` 專案更新 Build command 與 output directory（`frontend/dist`）
- [ ] 5.2 commit & push `staging`，確認部署成功

## ⬜ Task 6. 驗證 React staging 完整環境

- [ ] 6.1 訪問 Cloudflare Pages URL，確認 React 頁面載入
- [ ] 6.2 LINE Login 完整流程
- [ ] 6.3 行事曆 CRUD
- [ ] 6.4 PWA 安裝（手機加入主畫面）
- [ ] 6.5 Service Worker 離線功能
- [ ] 6.6 確認 `main` 分支 Vercel 正式環境不受影響

---

## ⬜ 第二階段：正式後端切換至 Zeabur

> **前提**：Task 6 全部通過

- [ ] 8.1 Zeabur 建立正式服務，監聽 `main` 分支
- [ ] 8.2 設定正式環境變數
- [ ] 8.3 LINE Console 正式 Callback URL 新增 Zeabur 網域
- [ ] 8.4 觀察正式環境 24 小時
- [ ] 8.5 確認穩定後停用 Vercel 後端

## ⬜ 第三階段：正式前端切換至 Cloudflare Pages

> **前提**：第二階段後端穩定，React 前端所有頁面驗證完畢

- [ ] 9.1 完成所有功能頁面移植
- [ ] 9.2 `kj-champion-system` 專案 Production branch 從 `staging` 切換為 `main`
- [ ] 9.3 正式網域 DNS 切換至 Cloudflare Pages
- [ ] 9.4 觀察正式環境 24 小時
- [ ] 9.5 停用 Vercel（前後端全退場）
- [ ] 9.6 正式停用 Supabase 專案
