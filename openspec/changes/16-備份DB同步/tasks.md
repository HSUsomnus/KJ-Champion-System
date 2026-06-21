# Change 16 — 備份 DB 同步 Tasks

> 分支：`m_b_備份DB同步`
> 執行原則：蓋一層測一層，全綠才勾 [x]
>
> ⚠️ **架構變更紀錄（2026-06-21）**：Section 2 原計畫「write-through queue」已廢棄，
> 改為「定時全量覆蓋」架構（Section 2 重寫）。
> 理由：queue 只抓新寫入，既有 members/financial 資料無法備份；全量覆蓋更簡單可靠。

---

## Section 1：Zeabur 基礎建設（使用者手動）

> 所有 Section 1 操作均在 **Zeabur Dashboard** 手動完成，Claude 負責提供指引

- [x] **1.1 在 `kj-champion` 新建備份 PostgreSQL 服務**（使用者手動 — Zeabur Dashboard）
  1. Zeabur → Projects → `kj-champion` → 建立服務 → Marketplace → PostgreSQL
  2. 服務名稱：`postgresql-backup`
  3. 網路頁籤：確認**不開啟**連線埠轉送（保持私有）

- [x] **1.2 在 `kj-champion` 新建 dev PostgreSQL 服務**（使用者手動 — Zeabur Dashboard）
  1. Zeabur → Projects → `kj-champion` → 建立服務 → Marketplace → PostgreSQL
  2. 服務名稱：`postgresql-dev-new`（後更名確認為 `postgresql-dev`）
  3. 網路頁籤：**開啟**連線埠轉送（公有網路）

- [x] **1.3 準備 schema 初始化腳本**（Claude — 已完成）
  - `scripts/init-db.js`：按順序套用所有 migration SQL

- [x] **1.4 套用 schema 到新 dev DB**（使用者本機 PC 執行）
  - 已完成，dev DB `43.163.196.8:32216` schema 初始化成功

- [x] **1.5 套用 schema 到備份 DB**（使用者手動開公網 + PC 執行）
  - 已完成，schema 套用後已關閉公網

- [x] **1.6 更新 dev 後端環境變數**（使用者手動 — Zeabur Dashboard）
  - `kj-champion-dev` → `kj-champion-dev` 服務 → `DATABASE_URL` 已更新
  - `/api/debug/health` 確認正常

- [x] **1.7 更新 prod 後端環境變數（新增 3 個）**（使用者手動 — Zeabur Dashboard）
  - `BACKUP_DATABASE_URL`、`DEV_DATABASE_URL`、`ADMIN_SECRET` 已設定

---

## Section 2：後端 — 定時全量備份（架構重寫）

> 原 write-through queue 方案已廢棄，改為 8 小時排程全量覆蓋

- [x] **2.1 建立 `server/services/backupSyncService.js`**（Claude）
  - `syncProdToBackup()`：從 prod DB 全量讀取 → TRUNCATE backup → INSERT 全部
  - 涵蓋 3 張表：`members`、`events`、`financial_documents`
  - `BACKUP_DATABASE_URL` 未設定時自動 no-op

- [x] **2.2 建立 `server/scheduler/backupSync.js`**（Claude）
  - `cron.schedule('0 */8 * * *', ...)` 台北時間 0/8/16 點整執行
  - `start()` / `stop()` 介面與 calendarSync 一致

- [x] **2.3 在 `server/server.js` 掛載 backupSync 排程器**（Claude）
  - `backupSyncScheduler.start()` 在伺服器啟動時呼叫
  - `backupSyncScheduler.stop()` 在 SIGTERM/SIGINT 時呼叫

- [x] **2.4 清除舊 write-through 代碼**（Claude）
  - 刪除 `server/services/backupQueue.js`
  - 刪除 `server/config/backupDb.js`
  - 移除 `server/config/db.js` 中的 backupQueue 引用
  - 移除 `server/services/eventDbService.js` 中的 backupQueue 引用

---

## Section 3：後端 — Admin Sync API

- [x] **3.1 建立 `server/routes/admin.js`**（Claude）
  - Bearer token 驗證（`ADMIN_SECRET`）
  - `GET /api/admin/backup-status`：查詢備份 DB 各 table 筆數

- [x] **3.2 實作 `POST /api/admin/sync-backup-to-dev`**（Claude）
  - 備份 DB → dev DB 全量覆蓋

- [x] **3.3 實作 `POST /api/admin/sync-prod-to-backup`**（Claude）
  - 手動觸發 prod → backup 全量同步（不等 8 小時排程）

- [x] **3.4 在 `server/server.js` 掛載 admin routes**（Claude）
  - `app.use('/api/admin', adminRoutes)` 已掛載

- [x] **3.5 部署並測試 API**（使用者 PC curl 測試）
  - `POST /api/admin/sync-backup-to-dev` 回傳 `{ success: true }` ✅

---

## Section 4：收尾

- [ ] **4.1 停用舊 `kj-champion-dev` 的 `postgresql-dev` 服務**（使用者手動 — Zeabur Dashboard）
  - 確認 dev 後端已連到新 dev DB 且正常運作後，再刪除舊服務

- [x] **4.2 更新 `.env.example`**（Claude）
  - 新增 `BACKUP_DATABASE_URL`、`DEV_DATABASE_URL`、`ADMIN_SECRET` 說明

- [ ] **4.3 完整回歸測試**（使用者 PC 執行）
  ```bash
  npm --prefix frontend run test:run
  ```

- [ ] **4.4 部署並驗證定時備份**（使用者觀察 Zeabur log）
  - `git push origin m_b_備份DB同步` → Zeabur 部署 prod 後端
  - 確認 log 出現「⏰ 備份排程已啟動」
  - 手動觸發 `POST /api/admin/sync-prod-to-backup` 確認備份 DB 有資料

---

## 驗收條件

- [ ] `POST /api/admin/sync-prod-to-backup` 成功同步，backup DB 內有 members/events/financial_documents 資料
- [x] `POST /api/admin/sync-backup-to-dev` 能成功把備份 DB 資料複製到 dev DB
- [ ] Zeabur prod log 顯示「⏰ 備份排程已啟動」
- [ ] 備份 DB 無公網（Zeabur Dashboard 確認連線埠轉送關閉）
- [x] dev 後端連線新 dev DB 正常
- [x] prod 正式用戶請求不受備份影響（備份失敗只寫 log，前台仍正常）
