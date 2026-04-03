# Proposal — 07 OAuth 動態 Redirect

## 問題

後端 `server/routes/auth.js` 的 LINE OAuth callback 完成後，redirect 目標硬編碼為環境變數 `FRONTEND_URL`。

這導致：
- DEV 站（`kjcs-dev.pages.dev`）登入完跳回正式站（`kj-champion-system.pages.dev`）
- 未來新增任何前端部署（staging、preview、其他域名），都需要改後端環境變數
- 前後端無法真正分離

## 目標

**後端改一次，永遠不用再動。** 任何前端部署自動跳回自己的 origin。

## 解法

後端自動從 HTTP 請求的 `Origin` / `Referer` header 偵測前端 origin：

1. `/api/auth/line-login`：從 request header 取得前端 origin，編碼進 OAuth state
2. `/api/auth/line-callback`：從 state 取出 origin，redirect 到該 origin
3. 白名單驗證：只允許合法域名，防止 open redirect 攻擊
4. 向下相容：header 沒有 origin 或不在白名單內 → fallback 到 `FRONTEND_URL`

## 影響範圍

- 只動 `server/routes/auth.js`（一個檔案）
- 不動前端、不動資料庫、不動其他 API
- 向下相容，舊版前端行為不變

## 不做的事

- 不改前端程式碼
- 不改 LINE Console 設定
- 不改其他後端路由

---

*建立日期：2026-04-03*
