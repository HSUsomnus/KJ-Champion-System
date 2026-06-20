# Spec: 01-zeabur-infra-and-db

> ✅ **ARCHIVED** — 所有 task 已完成（v1.5.4）

## 背景與範圍

專案以 `Line_Liff` 為名，前後端同部署在 Vercel、資料庫在 Supabase，系統已上線正常運作。為了在不影響正式環境的前提下，逐步遷移至更彈性的部署架構，採用「雙分支環境」策略：

- `main` 分支：現有 Vercel 正式環境完全不動
- `staging` 分支：Zeabur 後端 + Zeabur PostgreSQL，作為技術升級的沙盒

同步引入正式專案名稱 **KJ-Champion**，取代只描述技術實作的舊名 `Line_Liff`。

### 完成項目

- ✅ 建立 `staging` 分支，含 `zbpack.json`
- ✅ Zeabur PostgreSQL 建立 + Supabase → Zeabur 單向資料同步（schema + 業務資料）
- ✅ 正式後端 `DATABASE_URL` 切換至 Zeabur DB，真人驗證通過
- ✅ 雙寫服務（v1.5.2 實作，v1.5.4 移除）
- ✅ Zeabur 後端部署（`staging` 分支）
- ✅ LINE Developer Console Callback URL 新增 Zeabur 網域
- ✅ API 驗證與 LINE Login OAuth 完整流程驗證通過

### 影響

- **正式環境**：`DATABASE_URL` 已切至 Zeabur PostgreSQL，其餘完全不動
- **後端**：`dualWriteService.js` 已刪除，所有寫入直接走 Zeabur 主庫
- **資料庫**：Supabase 不再接收任何寫入，可於後續階段停用

---

## 技術設計

### 命名規範（KJ-Champion）

| 對象 | 命名 |
| --- | --- |
| Zeabur 正式專案 | `kj-champion` |
| Zeabur staging 專案 | `kj-champion-staging` |
| Cloudflare Pages 專案 | `kj-champion-system` |
| 後端網域 | `kj-champion.zeabur.app` |
| 前端網域 | `kj-champion.pages.dev` |

### 架構決策

**雙分支環境隔離**：建立 `staging` 分支，各平台分別監聽自己的分支。

```
main    → Vercel 前端 (public/) + Vercel 後端（正式，現有不動）
staging → Cloudflare Pages + Zeabur 後端 + Zeabur PostgreSQL DB
```

**Zeabur PostgreSQL 為最終正式資料庫**：從 Supabase 做一次性單向資料複製作為初始化。

**雙寫服務已廢棄（v1.5.4）**：`dualWriteService.js` 已刪除，所有寫入直接 `db.query`（Zeabur 主庫）。

**`zbpack.json` 放 repo 根目錄**：明確指定 Node.js 版本與啟動指令，避免 Zeabur 誤判 monorepo 結構。
