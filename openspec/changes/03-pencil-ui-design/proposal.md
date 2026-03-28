# Proposal: 03-pencil-ui-design

> ⬜ **待開始** — 前提：02-cloudflare-pages-validate 通過

## Why

React 重寫工程量大，若沒有確定的設計稿就開始寫程式碼，容易在做到一半時發現 UX 問題，導致大量返工。設計先行可以：

- 確認所有頁面的跳轉關係，避免遺漏頁面
- 與後端 API 對齊，確認資料欄位與互動流程一致
- 讓使用者在「畫面」層確認，而不是在「程式碼」層確認

## What Changes

- 盤點 `public/` 所有頁面與跳轉關係（共約 15 頁）
- 使用 Pencil 設計各頁面 UI 佈局與互動流程
- 確認設計稿與後端 API 對齊（欄位、狀態、錯誤處理）
- 使用者確認設計稿，無重大異議後鎖定

## 進入下一階段條件

設計稿確認鎖定 → 進入 [04-react-vite-pwa-frontend](../04-react-vite-pwa-frontend/proposal.md)
