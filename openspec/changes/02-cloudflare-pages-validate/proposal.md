# Proposal: 02-cloudflare-pages-validate

> 🔄 **進行中** — 2g.9～2g.12 驗證中

## Why

Zeabur 後端已部署完成（01-zeabur-infra-and-db），下一步是將現有純 HTML 前端（`public/`）部署到 Cloudflare Pages，驗證前後端完整串接。

**為何要先驗證再重構**：React 重寫工程量大，若直接重寫卻發現部署架構有問題（CORS、LINE OAuth 回調、DB 連線），代價極高。先用現有 `public/` 原封不動部署，快速驗證整個架構可行，才進入 Task 3（React 重構）。

## What Changes

- **✅** Cloudflare Pages 建立專案 `kj-champion-system`，監聽 `staging` 分支，Build output: `public`
- **✅** 部署完成，網域：`https://kj-champion-system.pages.dev`
- **✅** Zeabur 設定 `FRONTEND_URL=https://kj-champion-system.pages.dev`
- **✅** LINE Developer Console 新增 Callback URL
- **✅** `public/_worker.js`：proxy `/api/*` 至 Zeabur（取代 `_redirects`，Cloudflare Pages 不支援外部 proxy）
- **✅** `server/routes/auth.js`：callback redirect 改用 `FRONTEND_URL + returnUrl`
- **⬜** 驗證 API 溝通、DB 連線、LINE Login 完整流程

## 進入下一階段條件

2g.12 通過（API + DB + LINE Login 全部驗證）→ 進入 [03-pencil-ui-design](../03-pencil-ui-design/proposal.md)
