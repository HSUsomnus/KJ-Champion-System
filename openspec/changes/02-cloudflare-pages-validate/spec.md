# Spec: 02-cloudflare-pages-validate

> ✅ DONE

## 背景與範圍

Zeabur 後端已部署完成（01），下一步是將現有純 HTML 前端（`public/`）部署到 Cloudflare Pages，驗證前後端完整串接。

**為何要先驗證再重構**：React 重寫工程量大，若直接重寫卻發現部署架構有問題（CORS、LINE OAuth 回調、DB 連線），代價極高。先用現有 `public/` 原封不動部署，快速驗證整個架構可行，才進入 Task 3（React 重構）。

### 完成項目

- ✅ Cloudflare Pages 建立專案 `kj-champion-system`，監聽 `staging` 分支，Build output: `public`
- ✅ 部署完成，網域：`https://kj-champion-system.pages.dev`
- ✅ Zeabur 設定 `FRONTEND_URL=https://kj-champion-system.pages.dev`
- ✅ LINE Developer Console 新增 Callback URL
- ✅ `public/_worker.js`：proxy `/api/*` 至 Zeabur
- ✅ `server/routes/auth.js`：callback redirect 改用 `FRONTEND_URL + returnUrl`
- ✅ 驗證 API 溝通、DB 連線、LINE Login 完整流程

---

## 技術設計

### `_worker.js` 做 API Proxy（非 `_redirects`）

Cloudflare Pages 的 `_redirects` 不支援 proxy 到外部 URL，`_worker.js`（Cloudflare Workers）是官方建議方式。

`redirect: 'manual'` 的原因：LINE OAuth 回調會發 302 redirect，若讓 Worker 自動 follow redirect，瀏覽器會看到後端的 redirect target 而非透傳，導致 LINE Login 失敗。

### CORS 設定

`server.js` CORS 已有 `FRONTEND_URL` 支援，在 Zeabur 設定環境變數即可，後端程式碼無需修改。

### LINE Login 修正

`auth.js` callback 原本 redirect 回 `APP_URL`（Zeabur 後端網域），修正為 redirect 回 `FRONTEND_URL + returnUrl`，登入後正確跳回 Cloudflare Pages。

### Cloudflare Pages 設定

```
Build command:      （留空）
Build output dir:   public
Branch:             staging
```
