# Proposal: 05-production-cutover

> ⬜ **待開始** — 前提：04-react-vite-pwa-frontend 全部通過
>
> ⚠️ Zeabur 正式後端已在 025-html-production-deploy 建立完成。本 change 聚焦於 **React 版本上線** 與 **Vercel / Supabase 完全退場**。

## Why

React 前端（04）完成後，將 Cloudflare Pages 切換至 React 版本，完成自定義網域 DNS 設定，並停用所有舊服務（Vercel、Supabase）。

## What Changes

### React 版本切換至正式環境

- 確認所有功能頁面在 React 版本驗證完畢
- 更新 Zeabur 正式後端環境變數（若 React 版本有 API 變動）
- 正式網域 DNS 切換至 Cloudflare Pages（自定義網域）
- 觀察穩定性 24 小時後停用 Vercel 前端
- Vercel 完全退場，正式停用 Supabase

## Rollback 策略

| 階段 | 失敗情境 | 回退方式 |
| --- | --- | --- |
| 第二階段 | 正式後端切換後異常 | Vercel 後端仍在，前端 API URL 切回 Vercel；Supabase 此時仍保留 |
| 第三階段 | 正式前端切換後異常 | DNS 切回 Vercel 前端（Vercel 保留至此階段確認完畢） |
