# Tasks — 10 Zeabur 專案分離

> ✅ **本 change 全部完成於 v2.1.0（2026-04-25）**

## 進度

`█████████████` 100% — 完成 14 / 14 個子任務

---

## ✅ 已完成（14/14）

### 階段一：建立新 Zeabur 環境

- [x] **10.1 新建 Zeabur 專案 `kj-champion-dev`**（使用者手動 — Zeabur Dashboard）
  - 完成時間：2026-04-25
  - 建立於 sin1 region（與 kj-champion 同區）

- [x] **10.2 在新專案建立 `postgresql-dev` PostgreSQL 服務**（使用者手動 — Zeabur Dashboard）
  - 完成時間：2026-04-25
  - 公網 IP / port：`43.163.196.8:30967`
  - 內網主機：`postgresql.zeabur.internal:5432`（單一 PG 服務在新專案內，Zeabur 簡化命名）
  - 本機 `.env` 變數命名為 `DEV_DATABASE_URL`

- [x] **10.3 PC 跑 schema dump → 套到新 dev DB**（Claude 程式碼）
  - 完成時間：2026-04-25
  - `pg_dump --schema-only --no-owner --no-privileges` prod → `/tmp/schema.sql`（8689 bytes）
  - `psql "$DEV_DATABASE_URL" -f /tmp/schema.sql` exit 0、無 ERROR
  - 驗證：prod 5 tables ↔ new dev 5 tables ✅
  - Tables：`calendar_watches` / `events` / `financial_documents` / `members` / `system_settings`

### 階段二：建立新 dev 後端

- [x] **10.4 在新專案建立 `kj-champion-system-dev` 後端服務**（使用者手動 — Zeabur Dashboard）
  - 完成時間：2026-04-25
  - 連 GitHub repo `HSUsomnus/line-LIFF-calendar`，Branch = `dev`
  - 新公網 URL：`kj-champion-dev.zeabur.app`

- [x] **10.5 設定新 dev 後端環境變數**（使用者手動 — Zeabur Dashboard）
  - 完成時間：2026-04-25
  - `DATABASE_URL` = `postgresql://root:****@postgresql.zeabur.internal:5432/zeabur`（內網）
  - `APP_URL` = `https://kj-champion-dev.zeabur.app`
  - `FRONTEND_URL` = `https://kjcs-dev.pages.dev`（不變）
  - 其他變數從舊 dev 後端複製過去

- [x] **10.6 取得新 dev 後端公網 URL**（使用者手動）
  - 完成時間：2026-04-25
  - URL：`kj-champion-dev.zeabur.app`

### 階段三：前端與外部設定

- [x] **10.7 修改 `_worker.js` 的 `resolveBackend()`**（Claude 程式碼）
  - 完成時間：2026-04-25
  - `ZEABUR_BACKEND_DEV` 從 `kj-champion-system-dev.zeabur.app` 改為 `kj-champion-dev.zeabur.app`
  - commit `2d7b08b`

- [x] **10.8 LINE Console 加新 dev callback URL**（使用者手動 — LINE Developers Console）
  - 完成時間：2026-04-25
  - 新增：`https://kj-champion-dev.zeabur.app/api/auth/line-callback`
  - 保留舊 URL（暫不刪，全部驗證後一併清）

- [x] **10.9 Cloudflare Pages preview build 確認**（使用者驗證）
  - 完成時間：2026-04-25
  - dev branch push 後 Cloudflare Pages 自動 build 成功（31s build time）
  - commit `29b8752`（含 README 更新）

### 階段四：驗證與切換

- [x] **10.10 dev 全鏈路驗證**（使用者驗證）
  - 完成時間：2026-04-25
  - LINE OAuth redirect_uri 正確指向新後端 ✅
  - `/api/calendar/events` 回 200 ✅
  - 「首次登入，請建立用戶資料」UI 顯示 ✅（證明 dev DB 與 prod DB 隔離 — prod 24 members vs dev 0 members）
  - 寫入測試：在 dev 站建立 profile → PC psql 確認資料只在新 dev DB ✅
  - 觸發後續 v2.0.5 ~ v2.0.8 hotfix 連鎖修補

- [x] **10.11 砍舊 dev 服務**（使用者手動 — Zeabur Dashboard）
  - 完成時間：2026-04-25
  - 砍掉舊 `kj-champion` 專案內的 `kj-champion-system-dev`（舊 dev 後端）
  - 砍掉舊 `kj-champion` 專案內的 `postgresql-test`（08 階段建的舊 dev DB）

### 階段五：prod DB 安全強化

- [x] **10.12 prod DB 密碼旋轉**（Claude + 使用者）
  - 完成時間：2026-04-25
  - PC `openssl rand -hex 16` 產生新 32 字元密碼
  - 使用者於 Zeabur `kj-champion` → `postgresql` → 環境變數 `PASSWORD` 與 `POSTGRES_PASSWORD` 同時更新
  - PC `psql` `ALTER USER root WITH PASSWORD '...'` 改 server 端密碼
  - 使用者重啟 `kj-champion-system` 後端服務（讓 connection pool 用新密碼）
  - 驗證：`/api/profile` HTTP 200 + 完整使用者資料

- [x] **10.13 關 prod DB 公網路（兩步驗證）**（使用者手動 — Zeabur Dashboard）
  - 完成時間：2026-04-25
  - Step 1 驗證：確認 `kj-champion-system` 後端的 `DATABASE_URL` host = `postgresql.zeabur.internal`（走內網）
  - Step 2 切換：toggle 關閉 `postgresql` 服務的「連線埠轉送」
  - 驗證：prod 站登入正常、API 5 次連續 200
  - 副作用：本機 `.env` 內 prod 公網 `DATABASE_URL` 日常無效，需要時暫時開公網

### 階段六：收尾

- [x] **10.14 文件更新**（Claude 程式碼）
  - 完成時間：2026-04-25
  - NOW.md：v2.1.0 階段全寫，含設計決策（雙專案隔離、prod 公網關閉、onboarding guard）+ 已知地雷
  - README.md：升 v2.1.0、部署架構表改寫為「prod / dev 雙專案」對照
  - `.claude/rules/database.md`：補雙專案 DB 表、第一閘門可實際執行
  - `.claude/rules/deploy.md`：頂部加「Zeabur 雙專案部署架構」區塊
  - CHANGELOG.md：加 v2.1.0 條目
  - `.claude/context/v2.1.0.md`：新建（完整 14 task 紀錄 + hotfix 串 + 教訓）
  - STATUS.md：10 標 DONE、08 標 SUPERSEDED
  - 08 archive：08 資料夾未進 main（原本只在 `m_b_dev_test_database` 分支上），10 上線後可砍 `m_b_dev_test_database` 分支

---

## 與 08 的關係

08 已暫凍結 → 10 完成後正式 archive 為「superseded by 10」。

08 內 task 與 10 的對應：
- 08.1（建舊 postgresql-test）→ 10.11 砍掉
- 08.2 / 08.3（pg_dump + 套用）→ 10.3 重做，目標 DB 改為新專案的
- 08.4 ~ 08.7（假資料 / 切換 / 驗證 / 文件）→ 併入 10.5 / 10.10 / 10.14
- 08.8（prod 密碼旋轉）→ 10.12

---

## 完成驗證

| 驗證項 | 結果 |
|---|---|
| dev 後端 URL 切到 `kj-champion-dev.zeabur.app` | ✅ |
| dev DB 與 prod DB 物理隔離（跨專案內網不通）| ✅ |
| prod DB 公網路關閉 | ✅ |
| prod DB 密碼旋轉完成 | ✅ |
| dev 站全鏈路順跑（含新用戶 onboarding）| ✅ |
| prod 站不受影響（已驗證 API 200 + 登入正常）| ✅ |

---

最後更新：2026-04-25
