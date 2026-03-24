# Proposal: 01-zeabur-infra-and-db

> ✅ **ARCHIVED** — 所有 task 已完成（v1.5.4）

## Why

專案以 `Line_Liff` 為名，前後端同部署在 Vercel、資料庫在 Supabase，系統已上線正常運作。為了在不影響正式環境的前提下，逐步遷移至更彈性的部署架構，採用「雙分支環境」策略：

- `main` 分支：現有 Vercel 正式環境完全不動
- `staging` 分支：Zeabur 後端 + Zeabur PostgreSQL，作為技術升級的沙盒

同步引入正式專案名稱 **KJ-Champion**，取代只描述技術實作的舊名 `Line_Liff`。

## What Changes

- **✅** 建立 `staging` 分支，含 `zbpack.json`（Zeabur 部署設定）
- **✅** Zeabur PostgreSQL 建立 + Supabase → Zeabur 單向資料同步（schema + 業務資料）
- **✅** 正式後端（Vercel）`DATABASE_URL` 切換至 Zeabur DB，真人驗證通過
- **✅ 已移除（v1.5.4）** ~~雙寫服務~~：v1.5.2 實作，驗證失敗，v1.5.4 移除
- **✅** Zeabur 後端部署（`staging` 分支），網域：`https://kj-champion.zeabur.app`
- **✅** LINE Developer Console Callback URL 新增 Zeabur 網域
- **✅** API 驗證與 LINE Login OAuth 完整流程驗證通過

## Impact

- **正式環境**：`DATABASE_URL` 已切至 Zeabur PostgreSQL，其餘完全不動
- **後端**：`dualWriteService.js` 已刪除，所有寫入直接走 Zeabur 主庫
- **資料庫**：Supabase 不再接收任何寫入，可於後續階段停用
