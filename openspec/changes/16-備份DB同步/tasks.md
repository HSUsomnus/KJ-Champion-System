# Change 16 — 備份 DB 同步 Tasks

> 分支：`m_b_備份DB同步`
> 執行原則：蓋一層測一層，全綠才勾 [x]

---

## Section 1：Zeabur 基礎建設（使用者手動）

> 所有 Section 1 操作均在 **Zeabur Dashboard** 手動完成，Claude 負責提供指引

- [x] **1.1 在 `kj-champion` 新建備份 PostgreSQL 服務**（使用者手動 — Zeabur Dashboard）
  1. Zeabur → Projects → `kj-champion` → 建立服務 → Marketplace → PostgreSQL
  2. 服務名稱建議：`postgresql-backup`
  3. 網路頁籤：確認**不開啟**連線埠轉送（保持私有）
  4. 環境變數頁籤：記下 `POSTGRES_CONNECTION_STRING`（內網格式，供後續步驟用）

- [x] **1.2 在 `kj-champion` 新建 dev PostgreSQL 服務**（使用者手動 — Zeabur Dashboard）
  1. Zeabur → Projects → `kj-champion` → 建立服務 → Marketplace → PostgreSQL
  2. 服務名稱建議：`postgresql-dev-new`
  3. 網路頁籤：**開啟**連線埠轉送（公有網路），記下公網 IP + Port
  4. 環境變數頁籤：記下 `POSTGRES_CONNECTION_STRING`（公網格式）

- [x] **1.3 準備 schema 初始化腳本**（Claude — 已完成）
  - `scripts/init-db.js`：Node.js 腳本，按順序套用所有 migration SQL
  - 不需要 pg_dump，直接從 codebase 的 SQL 檔重建

- [x] **1.4 套用 schema 到新 dev DB**（使用者本機 PC 執行）
  ```bash
  # 新 dev DB 公網：43.163.196.8:32216
  # 密碼從 Zeabur kj-champion → postgresql-dev → 環境變數 → POSTGRES_PASSWORD
  TARGET_DB_URL="postgresql://root:<PASSWORD>@43.163.196.8:32216/zeabur" node scripts/init-db.js
  ```
  看到「🎉 Schema 初始化完成！」即可

- [x] **1.5 套用 schema 到備份 DB**（使用者手動開公網 + PC 執行）
  1. Zeabur → `kj-champion` → `postgresql-backup` → 網路 → **暫時開啟**連線埠轉送 → 儲存
  2. 記下公網 IP + Port
  3. 執行：
     ```bash
     TARGET_DB_URL="postgresql://root:<PASSWORD>@<公網IP>:<Port>/zeabur" node scripts/init-db.js
     ```
  4. 完成後**立刻關閉**連線埠轉送

- [x] **1.6 更新 dev 後端環境變數**（使用者手動 — Zeabur Dashboard）
  1. Zeabur → Projects → `kj-champion-dev` → `kj-champion-dev` 服務 → 環境變數
  2. `DATABASE_URL` → 更新為新 dev DB 公網連線字串
  3. 重啟服務，確認 `/api/debug/health` 回應正常

- [x] **1.7 更新 prod 後端環境變數（新增 3 個）**（使用者手動 — Zeabur Dashboard）
  1. Zeabur → Projects → `kj-champion` → `kj-champion-system` 服務 → 環境變數
  2. 新增 `BACKUP_DATABASE_URL` = 備份 DB 的 `POSTGRES_CONNECTION_STRING`（內網格式）
  3. 新增 `DEV_DATABASE_URL` = 新 dev DB 公網連線字串
  4. 新增 `ADMIN_SECRET` = 自訂高強度隨機字串（建議 32 字元以上）
  5. 先**不重啟**（等 Section 2 程式碼部署後一起重啟）

---

## Section 2：後端 — 備份 DB 連線與異步 Queue

- [ ] **2.1 建立 `server/config/backupDb.js`**（Claude）
  - 建立獨立 Pool 連接 `BACKUP_DATABASE_URL`
  - 若環境變數不存在（本機開發），Pool 設為 null，query 自動 no-op
  - 匯出 `{ query, pool }` 介面，與 `db.js` 相同

- [ ] **2.2 建立 `server/services/backupQueue.js`**（Claude）
  - In-memory queue（最大 1000 筆）
  - Worker 每 5 秒處理一批（`setTimeout` 驅動）
  - 單筆失敗：最多重試 3 次，超過丟棄並 console.error
  - 匯出：`enqueue(sql, params)`、`enqueueAll(queries)` (for transactions)、`stop()`

- [ ] **2.3 修改 `server/config/db.js` — 自動攔截寫入**（Claude）
  - 在 `query()` 函式內，偵測 SQL 以 `INSERT`/`UPDATE`/`DELETE` 開頭
  - 主寫入成功後，呼叫 `backupQueue.enqueue(text, params)`（不 await，異步）
  - 讀取操作（SELECT）不 enqueue

- [ ] **2.4 處理 `getClient()` transaction 場景**（Claude）
  - 修改 `server/services/eventDbService.js` 的批次 upsert function
  - 在 `client.query('COMMIT')` 後，收集本次 transaction 的寫入 SQL，呼叫 `backupQueue.enqueueAll(queries)`
  - 在 `ROLLBACK` 時捨棄，不 enqueue

- [ ] **2.5 本機驗證備份 Queue 邏輯（不連真實備份 DB）**（使用者 PC 執行）
  - 本機不設 `BACKUP_DATABASE_URL`，確認 queue 自動 no-op，後端正常啟動
  - 看 console log 確認「BackupQueue: BACKUP_DATABASE_URL 未設定，備份功能停用」

- [ ] **2.6 部署後端到 Zeabur prod，驗證備份寫入**（使用者手動 + 觀察 log）
  - `git push origin m_b_備份DB同步` → Zeabur 自動部署（若有設定 dev branch deploy）
  - 或等 merge 後觀察
  - Zeabur → `kj-champion-system` 服務 → 日誌
  - 確認看到 `BackupQueue: 已寫入備份 DB` 類訊息

---

## Section 3：後端 — Admin Sync API

- [ ] **3.1 建立 `server/routes/admin.js`**（Claude）
  - `POST /api/admin/sync-backup-to-dev`
  - Bearer token 驗證：比對 `Authorization` header 與 `process.env.ADMIN_SECRET`
  - 驗證失敗 → 401

- [ ] **3.2 實作資料複製邏輯**（Claude）
  - 連接 `BACKUP_DATABASE_URL`（讀取端）與 `DEV_DATABASE_URL`（寫入端）
  - 逐 table 執行：`TRUNCATE CASCADE` → `SELECT *` 全量讀取 → `INSERT` 批次寫入
  - Tables：`members`、`events`、`financial_documents`
  - 任一 table 失敗 → rollback dev DB 該 table 操作，回傳 500 + 錯誤訊息
  - 成功回傳：`{ success: true, tables: { members: N, events: N, financial_documents: N } }`

- [ ] **3.3 在 `server/server.js` 掛載 admin routes**（Claude）
  - `app.use('/api/admin', require('./routes/admin'))`

- [ ] **3.4 部署並測試 sync-backup-to-dev**（使用者 PC curl 測試）
  ```bash
  curl -X POST https://kj-champion-system.zeabur.app/api/admin/sync-backup-to-dev \
    -H "Authorization: Bearer <ADMIN_SECRET>"
  ```
  - 確認回傳 `{ success: true, tables: {...} }`
  - 登入 dev 後端，確認資料已更新

---

## Section 4：收尾

- [ ] **4.1 停用舊 `kj-champion-dev` 的 `postgresql-dev` 服務**（使用者手動 — Zeabur Dashboard）
  - 確認 dev 後端已連到新 dev DB 且正常運作後，再刪除舊服務
  - Zeabur → Projects → `kj-champion-dev` → `postgresql-dev` → 設定 → 刪除服務

- [ ] **4.2 更新 `.env` 範例與 `server/` 說明**（Claude）
  - 在 `server/` 或根目錄的 `.env.example` 新增三個環境變數說明
  - 標注哪些是 prod only、哪些本機開發可留空

- [ ] **4.3 完整回歸測試**（使用者 PC 執行）
  ```bash
  npm --prefix frontend run test:run
  npm --prefix frontend run test:e2e
  ```
  - 後端 API 仍正常（profile / member / financial / calendar）
  - dev 後端 `/api/debug/health` 正常

---

## 驗收條件

- [ ] prod 後端寫入 members/events/financial_documents 後，備份 DB 內有相同資料
- [ ] `POST /api/admin/sync-backup-to-dev` 能成功把備份 DB 資料複製到 dev DB
- [ ] 備份 DB 無公網（Zeabur Dashboard 確認連線埠轉送關閉）
- [ ] dev 後端連線新 dev DB 正常，舊服務已停用
- [ ] prod 正式用戶請求不受備份 queue 影響（備份 DB 掛掉時前台仍正常）
