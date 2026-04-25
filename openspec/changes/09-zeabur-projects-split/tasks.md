# Tasks — 09 Zeabur 專案分離

## 進度

`░░░░░░░░░░░░░` 0% — 完成 0 / 14 個子任務

---

## ⬜ 待完成

### 階段一：建立新 Zeabur 環境

- [ ] **9.1 新建 Zeabur 專案 `kj-champion-dev`**（使用者手動 — Zeabur Dashboard）
  1. Zeabur Dashboard → 右上「+ New Project」
  2. 名稱：`kj-champion-dev`
  3. Region：選與 `kj-champion` 相同（推測為 `sin1` 新加坡）
  4. 確認專案建立後可看到空白 services 列表

- [ ] **9.2 在新專案建立 `postgresql-test` 服務**（使用者手動 — Zeabur Dashboard）
  1. 進入 `kj-champion-dev` 專案 → 「+ Build with Compute」或「Add Service」→ 選 PostgreSQL
  2. 服務名稱：`postgresql-test`
  3. 等待服務狀態轉為 Running
  4. 進入該服務 → 網路 → 開啟「公有網路」→ 取得公網 IP 與 port
  5. 記下：
     - 內網主機名（會是 `postgresql-test.zeabur.internal:5432`）
     - 公網連線字串（從「資料庫」分頁複製）
  6. **更新本機 `.env`**：把 `TEST_DATABASE_URL` 換成新 test DB 公網字串（舊的廢棄）

- [ ] **9.3 PC 跑 schema dump → 套到新 test DB**（Claude 程式碼）
  > 前置：9.2 完成、`.env` 已更新 TEST_DATABASE_URL
  1. PC 端 Claude 直接重跑 `pg_dump --schema-only "$DATABASE_URL"` → `/tmp/schema.sql`
  2. 套用：`psql "$TEST_DATABASE_URL" -f /tmp/schema.sql`
  3. 驗證：`psql "$TEST_DATABASE_URL" -c "\dt"` → 5 個 table（與 prod 一致）

### 階段二：建立新 dev 後端

- [ ] **9.4 在新專案建立 `kj-champion-system-dev` 後端服務**（使用者手動 — Zeabur Dashboard）
  1. `kj-champion-dev` 專案 → 新增 Service → Git
  2. 選擇 repo `HSUsomnus/line-LIFF-calendar`
  3. **Branch 設為 `dev`**（重要：不是 main）
  4. 服務名稱：`kj-champion-system-dev`
  5. 等待初次 build 完成（可能因環境變數未設而跑失敗，正常）
  6. 進入該服務 → 網路 → 取得公網 URL（記下，類似 `kj-champion-system-dev-xxx.zeabur.app`）

- [ ] **9.5 設定新 dev 後端環境變數**（使用者手動 — Zeabur Dashboard）
  > 對照舊 `kj-champion-system-dev` 服務的環境變數，逐一複製過去，但 `DATABASE_URL` 改成新 test DB 內網字串
  1. 進入新 dev 後端 → 環境變數
  2. 從舊 dev 後端服務（`kj-champion` 專案內）複製所有環境變數，貼進新服務
  3. 修改：
     - `DATABASE_URL` → `postgresql://root:<新test密碼>@postgresql-test.zeabur.internal:5432/zeabur`（**內網**字串）
     - `APP_URL` → 9.4 取得的新公網 URL
     - `FRONTEND_URL` → `https://kjcs-dev.pages.dev`（不變）
  4. 儲存後 Zeabur 自動重新部署
  5. 確認 logs 無 DB 連線錯誤

- [ ] **9.6 取得新 dev 後端公網 URL 並記錄**（使用者手動）
  1. 從 9.4 的記錄確認新 URL
  2. 把 URL 貼給 Claude（接 9.7）

### 階段三：前端與外部設定

- [ ] **9.7 修改 `_worker.js` 的 `resolveBackend()`**（Claude 程式碼）
  > 前置：9.6 取得新 dev 後端 URL
  1. 修改 `frontend/public/_worker.js` 的 `ZEABUR_BACKEND_DEV` 常數，指向新 URL
  2. commit：`fix(09): _worker.js 指向新 dev 後端 URL`
  3. push 到 `m_b_zeabur_projects_split` 分支

- [ ] **9.8 LINE Console 加新 dev callback URL**（使用者手動 — LINE Developers Console）
  1. LINE Developers Console → KJ-Champion-System Channel → LINE Login → Callback URL
  2. **加入**新 URL：`https://<9.4 取得的新 URL>/api/auth/line-login/callback`
  3. **保留**舊 URL：`https://kj-champion-system-dev.zeabur.app/api/auth/line-login/callback`（暫不刪，9.11 完成後再清）
  4. 儲存

- [ ] **9.9 Cloudflare Pages preview branch 設定確認**（使用者驗證 — Cloudflare Dashboard）
  1. Cloudflare Pages → kj-champion-system → Settings → Environment variables
  2. 檢查 Preview environment 的環境變數是否需要更新（若有寫死 dev 後端 URL）
  3. 若 9.7 的 PR merge 到 dev branch 後 Cloudflare Pages 自動 build preview → 確認 build 成功

### 階段四：驗證與切換

- [ ] **9.10 驗證 dev 全鏈路**（使用者驗證）
  > 前置：9.7 已 merge dev 分支、9.8 LINE Console 已加新 URL、Cloudflare Pages preview build 成功
  1. **清除瀏覽器 Service Worker**：DevTools → Application → Service Workers → Unregister（避免舊 SW 快取干擾）
  2. 開 `https://kjcs-dev.pages.dev`
  3. 開 DevTools Network → 確認 `/api/*` 請求 proxy 到**新** dev 後端 URL（不是舊的）
  4. 點「使用 LINE 登入」→ 跳轉應導去新 callback URL → 登入成功
  5. 在 dev 站新增一筆測試事件
  6. 用 PC psql 確認該事件**只在新 test DB**：
     ```bash
     psql "$TEST_DATABASE_URL" -c "SELECT id, title FROM events ORDER BY created_at DESC LIMIT 3;"
     ```
  7. 開 `https://kj-champion-system.pages.dev`（prod）→ 確認看不到那筆 dev 事件

- [ ] **9.11 砍掉舊 dev 服務（kj-champion 專案內）**（使用者手動 — Zeabur Dashboard）
  > 前置：9.10 驗證全部通過
  1. 進入舊 `kj-champion` 專案
  2. 砍掉 `kj-champion-system-dev` 服務（Settings → Delete）
  3. 砍掉舊 `postgresql-test` 服務（08 建立的那個）
  4. 確認剩下兩個服務：`postgresql` + `kj-champion-system`

### 階段五：prod DB 安全強化

- [ ] **9.12 prod DB 密碼旋轉**（Claude + 使用者手動）
  > **回滾預備**：旋轉前先把舊密碼複製存到本機安全位置（記事本或 password manager），失敗時還能從 Zeabur dashboard 用舊密碼直連改回來
  1. PC Claude 產生新密碼：
     ```bash
     openssl rand -base64 24
     ```
  2. PC Claude 從 `.env` 讀現有 prod `DATABASE_URL`（公網），執行：
     ```bash
     psql "$DATABASE_URL" -c "ALTER USER root WITH PASSWORD '<新密碼>';"
     ```
  3. 使用者同步更新 Zeabur `kj-champion` 專案 → `postgresql` 服務 → 環境變數：
     - `PASSWORD` → 新密碼
     - `POSTGRES_PASSWORD` → 新密碼（順便修空白模板 bug）
  4. 使用者重啟 prod 後端 `kj-champion-system` 服務（讓 `${POSTGRES_CONNECTION_STRING}` 重新解析）
  5. 使用者更新本機 `.env` 的 `DATABASE_URL` 為新密碼版
  6. 驗證：
     - PC 用新 `.env` `DATABASE_URL` 跑 `psql ... -c "SELECT 1;"` → 通
     - 開 prod 站 `https://kj-champion-system.pages.dev` 登入 → 通

- [ ] **9.13 關 prod DB 公網路（兩步驗證）**（使用者手動 — Zeabur Dashboard）
  > 前置：9.12 完成
  1. **驗證階段**：
     - Zeabur → `kj-champion-system` 後端 → 環境變數 → 看 `DATABASE_URL`
     - 確認 host 部分是 `postgresql.zeabur.internal`（**不是**公網 IP）
     - 若是公網字串 → 先把它改成內網字串並儲存重啟，等 prod 站恢復正常後再進下一步
  2. **切換階段**：
     - Zeabur → `postgresql` 服務 → 網路 → 「連線埠轉送」toggle → **關閉**
     - **立刻**開 `https://kj-champion-system.pages.dev` 登入測試
     - 若失敗 → toggle 立刻開回去（< 30 秒回復視窗）→ 回 9.13.1 重新驗證
     - 若成功 → 9.13 完成
  3. 同步：本機 `.env` 的 prod `DATABASE_URL` 改成內網字串（PC 從本機已連不到，但保留紀錄）。需要 PC 維護 prod DB 時手動暫時開公網

### 階段六：收尾

- [ ] **9.14 文件更新**（Claude 程式碼）
  - **NOW.md**：
    - 設計決策新增「dev 與 prod 在 Zeabur 不同專案，內網完全隔離」
    - 已知地雷補充「prod DB 公網預設關閉，PC 維護需暫時開」
  - **README.md**：部署架構表加「Zeabur 雙專案」說明
  - **`.claude/rules/database.md`**：標註「dev 已建立獨立測試 DB（在 kj-champion-dev 專案）」、第一閘門可實際執行
  - **`.claude/rules/deploy.md`**：補「Zeabur 專案分離後，dev 後端 URL 為新 URL」
  - 將 08 資料夾移至 `openspec/changes/_archived/08-dev-test-database/`，並在 tasks.md 頂部加 `> Status: Superseded by 09 (2026-04-25)`
  - STATUS.md：09 標 DONE，08 標 ARCHIVED

---

## 路徑相依圖

```
9.1 → 9.2 ─┬→ 9.3 (PC schema dump 套用)
            │
            └→ 9.4 → 9.5 → 9.6 → 9.7 → 9.8 ─┬→ 9.9 → 9.10
                                              │           │
                                              │           └→ 9.11 → 9.12 → 9.13 → 9.14
```

關鍵 critical path：9.1 → 9.2 → 9.4 → 9.5 → 9.7 → 9.10 → 9.11 → 9.12 → 9.13 → 9.14

9.3 可與 9.4 並行（不同人做），9.8 / 9.9 可與 9.7 並行。

---

## 與 08 的合併狀態

- 08.1（建舊 postgresql-test）：09.11 砍掉
- 08.2（pg_dump prod schema）：09.3 重做（同一份 schema.sql，目標換新 DB）
- 08.3（套 schema 到 test DB）：09.3 包含
- 08.4 ~ 08.7（假資料 seed、切換 dev DATABASE_URL、驗證）：併入 09.5/9.10/9.14，不單獨處理
- 08.8（prod 密碼旋轉）：併入 9.12

09 完成後 08 整個 archive。

---

最後更新：2026-04-25
