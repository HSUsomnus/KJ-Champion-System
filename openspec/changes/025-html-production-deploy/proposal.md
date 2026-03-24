# Proposal: 025-html-production-deploy

> ⬜ **待開始** — 前提：02-cloudflare-pages-validate ✅ 通過

## Why

02 已驗證 staging 前後端串接完整可用（Cloudflare Pages + Zeabur 後端 + Zeabur PostgreSQL）。
在進入設計稿（03）與 React 重寫（04）之前，先將**當前 HTML 版本**正式部署到 main，讓正式用戶用上新架構。
同時清空 staging 的後端與資料庫連線，讓 staging 回到乾淨狀態，專注新前端開發。

## What Changes

### 第一步：staging → main 正式部署

- git: 將 staging 合併至 main（PR + review）
- Zeabur：建立 main 分支正式後端服務，設定正式環境變數
- LINE Console：新增正式環境 Callback URL
- Cloudflare Pages：`kj-champion-system` Production branch 切換為 `main`

### 第二步：驗證 main 正式環境

- API 溝通驗證（Cloudflare Pages → Zeabur 後端）
- 資料庫連線驗證（Zeabur PostgreSQL CRUD）
- LINE Login 完整流程（正式環境）

### 第三步：清空 staging，準備新前端開發

- 停止 Zeabur staging 後端服務
- 清除 staging 環境的後端連線設定
- staging Cloudflare Pages 切回監聽 `staging` 分支（供新前端部署預覽）
- staging 準備好供 React/Vite 新前端開發使用

## 進入下一階段條件

025.12 通過（main 完整驗證 + staging 清空）→ 進入 [03-pencil-ui-design](../03-pencil-ui-design/proposal.md)

## 與 05-production-cutover 的關係

05 維持原計畫，作為 **React 前端完成後**的第二次正式切換（切換至 React 版本 + 自定義網域 DNS）。
