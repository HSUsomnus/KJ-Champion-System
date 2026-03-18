# Tasks: split-deploy-cloudflare-zeabur

## 1. 建立 staging 分支與後端設定檔

- [x] 1.1 從 `main` 建立 `staging` 分支：`git checkout -b staging`
- [x] 1.2 在專案根目錄建立 `zbpack.json`，設定 `nodejs_version: "18"` 與 `start_command: "node server/server.js"`
- [x] 1.3 更新 `env.example`：將 `APP_URL` 改為 Zeabur 格式（`https://your-app.zeabur.app`），`FRONTEND_URL` 改為 Cloudflare Pages 格式（`https://your-app.pages.dev`）
- [ ] 1.4 commit 並 push `staging` 分支到 GitHub

## 2. 建立 React + Vite + PWA 前端專案骨架

- [ ] 2.1 在 `staging` 分支執行 `npm create vite@latest frontend -- --template react-ts`，建立 `frontend/` 目錄
- [ ] 2.2 進入 `frontend/`，安裝 PWA 依賴：`npm install -D vite-plugin-pwa workbox-window`
- [ ] 2.3 設定 `frontend/vite.config.ts`：加入 `@vitejs/plugin-react` 與 `vite-plugin-pwa`，設定 `registerType: 'autoUpdate'`、API 路由 NetworkOnly 策略
- [ ] 2.4 設定 `frontend/vite.config.ts` 的 `manifest`：填入 `name`、`short_name`、`theme_color`、`display: 'standalone'`、`icons`
- [ ] 2.5 建立 `frontend/public/_redirects`（佔位符版本）：
  ```
  /api/*  https://PLACEHOLDER_ZEABUR_URL/api/:splat  200
  /*      /index.html                                 200
  ```
- [ ] 2.6 建立 `frontend/public/_headers`：`/assets/*` 設 `Cache-Control: public, max-age=31536000, immutable`；`/*.html` 設 `Cache-Control: no-cache`
- [ ] 2.7 確認 `npm run build` 在 `frontend/` 目錄可正常執行，`dist/` 產生無誤
- [ ] 2.8 commit 並 push 到 `staging`

## 3. Zeabur 後端部署（staging）

- [ ] 3.1 在 Zeabur 建立新專案，連接 GitHub repo，**指定監聽 `staging` 分支**，Root directory 為 `/`
- [ ] 3.2 在 Zeabur 控制台依照 `env.example` 逐一設定環境變數（`DATABASE_URL`、`LINE_*`、`GOOGLE_*`、`LIFF_ID`、`NODE_ENV=production`）
- [ ] 3.3 部署後確認後端啟動成功，**記錄 Zeabur 分配的網域**（e.g. `https://line-liff.zeabur.app`）
- [ ] 3.4 在 LINE Developer Console → LINE Login Channel → Callback URL 加入 `https://<zeabur-backend>/api/auth/callback`

## 4. 更新 _redirects 並部署前端

- [ ] 4.1 將 `frontend/public/_redirects` 的 `PLACEHOLDER_ZEABUR_URL` 替換為步驟 3.3 取得的真實 Zeabur URL
- [ ] 4.2 commit 並 push 到 `staging`
- [ ] 4.3 在 Cloudflare Pages 建立新專案，連接同一個 GitHub repo，**指定監聽 `staging` 分支**
- [ ] 4.4 設定 Cloudflare Pages：Build command = `cd frontend && npm install && npm run build`，Build output directory = `frontend/dist`
- [ ] 4.5 部署完成後，**記錄 Cloudflare Pages 網域**（e.g. `https://line-liff.pages.dev`）

## 5. 完成環境變數設定

- [ ] 5.1 回到 Zeabur 控制台，設定 `FRONTEND_URL` = 步驟 4.5 的 Cloudflare Pages 網域
- [ ] 5.2 設定 `APP_URL` = Zeabur 後端網域
- [ ] 5.3 在 Zeabur 重啟後端服務，確認 CORS 白名單生效

## 6. 驗證 staging 環境

- [ ] 6.1 用 `curl` 測試後端：`curl https://<zeabur-backend>/api/members`
- [ ] 6.2 瀏覽器訪問 Cloudflare Pages URL，確認 React 頁面載入
- [ ] 6.3 確認 PWA：手機瀏覽器顯示「加入主畫面」提示，安裝後可獨立開啟
- [ ] 6.4 測試 LINE Login OAuth 完整流程（登入 → 回調 → 取得使用者資訊）
- [ ] 6.5 測試行事曆 CRUD（新增、讀取、刪除行程）
- [ ] 6.6 確認 `main` 分支 Vercel 正式環境完全不受影響

## 7. （第二階段）正式後端切換至 Zeabur

> **前提**：第 6 節所有後端驗證項目通過

- [ ] 7.1 在 Zeabur 為 `main` 分支建立獨立正式服務（與 staging 服務分開）
- [ ] 7.2 設定正式 Zeabur 環境變數（`FRONTEND_URL` = 現有 Vercel 前端 URL）
- [ ] 7.3 在 LINE Developer Console，正式 Callback URL 新增 Zeabur 正式網域
- [ ] 7.4 將 Vercel 前端（`public/`）的 API base 指向正式 Zeabur 後端（或用 Vercel rewrites proxy）
- [ ] 7.5 觀察正式環境 24 小時，確認 API、LINE Login、Supabase 均正常
- [ ] 7.6 確認穩定後，停用 Vercel 後端服務

## 8. （第三階段）正式前端切換至 Cloudflare Pages

> **前提**：`staging` 前端所有功能頁面驗證完畢，且第二階段後端已穩定

- [ ] 8.1 完成所有功能頁面移植（React 版本對齊 `public/` 所有現有頁面）
- [ ] 8.2 在 Cloudflare Pages 為 `main` 分支建立獨立正式專案（與 staging 分開）
- [ ] 8.3 更新 `main` 分支 `frontend/public/_redirects`，`/api/*` 指向正式 Zeabur 後端
- [ ] 8.4 正式網域 DNS 切換至 Cloudflare Pages
- [ ] 8.5 觀察正式環境 24 小時，確認所有功能正常
- [ ] 8.6 確認穩定後，停用 Vercel 前端服務（Vercel 完全退場）
- [ ] 8.7 LINE Developer Console 正式 Callback URL 移除 Vercel 網域
