# Tasks: 01-zeabur-infra-and-db

> ✅ **ARCHIVED** — 全部完成（v1.5.4）

---

## Task 1. staging 分支與後端設定檔

- [x] 1.1 建立 `staging` 分支
- [x] 1.2 建立 `zbpack.json`（Zeabur Node.js 部署設定）
- [x] 1.3 更新 `env.example`
- [x] 1.4 `.gitignore` 加入 `!zbpack.json`
- [x] 1.5 push `staging` 分支到 GitHub

## Task 2a–2c. Zeabur PostgreSQL 建立與資料同步

- [x] 2a Zeabur 建立 PostgreSQL 服務（`kj-champion-staging` 專案）
- [x] 2b Supabase → Zeabur 單向資料同步（schema + data）
- [x] 2c 驗證 Zeabur DB 正確性（row count、欄位抽查、foreign key）

## Task 2d. 正式後端切換至 Zeabur DB

- [x] 2d Vercel `DATABASE_URL` 改指向 Zeabur PostgreSQL，真人驗證 1–2 天通過

## Task 2e. 雙寫實作與移除（已結束）

- [x] 2e.1–2e.5 雙寫服務實作（v1.5.2）
- [x] 2e.8 移除雙寫服務（v1.5.4）；所有寫入直接走 Zeabur 主庫
- [x] 2e.9 清理 Google Sheets 死碼與變數命名
- [x] 2e.10 清理 `.env` 死碼，補齊 `FRONTEND_URL`、`CRON_SECRET`

## Task 2f. Zeabur 後端部署（staging）

- [x] 2f.1 Zeabur 新增 Node.js 服務，監聽 `staging` 分支
- [x] 2f.2 設定環境變數（`DATABASE_URL`、`LINE_*`、`GOOGLE_*`、`APP_URL`、`FRONTEND_URL`）
- [x] 2f.3 後端啟動成功，網域：`https://kj-champion.zeabur.app`
- [x] 2f.4 LINE Developer Console Callback URL 新增 Zeabur 網域
- [x] 2f.5 API 驗證：`/api/members` 回傳正確資料
- [x] 2f.6 LINE Login OAuth 完整流程驗證通過
