# Proposal: 04-react-vite-pwa-frontend

> ⬜ **待開始** — 前提：03-pencil-ui-design 設計稿確認鎖定

## Why

現有 `public/` 純 HTML/JS 難以維護、缺乏型別安全、無法安裝為 PWA。以 React + Vite + TypeScript 重寫，並整合 shadcn/ui 元件庫，為長期維護建立良好基礎。

## What Changes

- **新增** `frontend/`：React 18 + Vite + TypeScript 前端應用（僅 `staging` 分支）
- **新增** `frontend/vite.config.ts`：含 `vite-plugin-pwa`，PWA 支援
- **新增** `frontend/public/_worker.js`：proxy `/api/*` 至 Zeabur（與 `public/_worker.js` 同架構）
- **新增** `frontend/public/_headers`：靜態資源長快取、HTML no-cache
- **整合** shadcn/ui（Radix UI + Tailwind CSS）元件庫
- **更新** Cloudflare Pages build 設定：`cd frontend && npm install && npm run build`，output: `frontend/dist`
- **驗證** React staging 完整環境：LINE Login、行事曆 CRUD、PWA 安裝

## 進入下一階段條件

Task 6 全部通過 → 進入 [05-production-cutover](../05-production-cutover/proposal.md)
