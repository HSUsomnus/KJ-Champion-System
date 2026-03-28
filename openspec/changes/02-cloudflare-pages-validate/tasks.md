# Tasks: 02-cloudflare-pages-validate

> ✅ **完成** — 所有驗證通過

---

## ✅ 基礎建設（已完成）

- [x] 2g.1 確認 01-zeabur-infra-and-db 全部完成
- [x] 2g.2 確認 `staging` 分支 `public/` 與正式版一致
- [x] 2g.3 Cloudflare Pages 建立專案 `kj-champion-system`（監聽 `staging`，Build output: `public`）
- [x] 2g.4 部署完成，網域：`https://kj-champion-system.pages.dev`
- [x] 2g.5 Zeabur 設定 `FRONTEND_URL=https://kj-champion-system.pages.dev`
- [x] 2g.6 LINE Developer Console 新增 Callback URL：`https://kj-champion-system.pages.dev/api/auth/line-callback`

## ✅ API Proxy（已完成）

- [x] 2g.7a `public/_redirects` 嘗試失敗：Cloudflare Pages 不支援 proxy 外部 URL
- [x] 2g.7b 改用 `public/_worker.js`（Cloudflare Workers）proxy `/api/*` 至 Zeabur；`redirect: 'manual'` 讓 LINE OAuth redirect 直接透傳

## ✅ LINE Login 修正（已完成）

- [x] 2g.8a 修正 `server/routes/auth.js`：callback redirect 改用 `FRONTEND_URL + returnUrl`

## ✅ 驗證（已完成）

- [x] 2g.9 **API 溝通驗證**（從 `kj-champion-system.pages.dev` 發出）：
  - `/api/members` 回傳成員列表正確
  - `/api/calendar/events` 回傳行事曆資料正確
  - 新增 / 刪除測試行程，DB CRUD 讀寫正確
- [x] 2g.10 **資料庫連線驗證**：確認 CRUD 資料落在 Zeabur PostgreSQL（非 Supabase）
- [x] 2g.11 **LINE Login 完整流程**：Cloudflare Pages → LINE 登入 → Zeabur 回調 → 跳回 Cloudflare Pages → 正常使用
- [x] 2g.12 ✅ **以上全部通過 → archive 此 change，進入 03-pencil-ui-design**
