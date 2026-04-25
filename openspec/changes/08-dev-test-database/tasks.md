# Tasks — 08 dev 測試資料庫獨立化

## 進度

`██░░░░░░░░░░░` 14% — 完成 1 / 7 個子任務

---

## ✅ 已完成

- [x] **08.1 Zeabur 建立測試 PostgreSQL 服務**（使用者手動 — Zeabur Dashboard）
  - ✅ 服務名稱：`postgresql-test`
  - ✅ 位於 `kj-champion` 專案內（與 `postgresql`、`kj-champion-system`、`kj-champion-system-dev` 同專案）
  - ✅ 服務狀態正常運作
  - 完成時間：2026-04-25

---

## ⬜ 待完成

- [ ] **08.2 取得正式 DB schema dump**（使用者本機執行）
  1. 至 Zeabur → `postgresql` 服務（**正式 DB**）→ 環境變數 / 連線資訊，複製**公網**連線字串
  2. 在本機執行（替換 `$PROD_DATABASE_URL`）：
     ```bash
     pg_dump --schema-only --no-owner --no-privileges \
       "$PROD_DATABASE_URL" > schema.sql
     ```
  3. 檢查 `schema.sql` 開頭幾行 `CREATE TABLE`，確認**沒有 INSERT 語句**（schema-only 不應有資料）
  4. 暫存於本機，**勿 commit**（含 DB 結構資訊）

- [ ] **08.3 套用 schema 到測試 DB**（使用者本機執行）
  1. 至 Zeabur → `postgresql-test` 服務 → 連線資訊，複製**公網**連線字串
  2. 執行：
     ```bash
     psql "$TEST_DATABASE_URL" -f schema.sql
     ```
  3. 確認所有 table 建立成功：
     ```bash
     psql "$TEST_DATABASE_URL" -c "\dt"
     ```
     比對 table 數量應與正式 DB 相同

- [ ] **08.4 建立假資料 seed**（Claude 程式碼 + 使用者執行）
  1. Claude 建立 `scripts/seed-test-db.sql`（手寫假資料）：
     - 5 個假成員（含 manager / member 角色）
     - 5 個假行程（過去 / 現在 / 未來）
     - 0 筆財務、0 筆 LINE 推播
  2. 使用者執行：`psql "$TEST_DATABASE_URL" -f scripts/seed-test-db.sql`
  3. 驗證資料寫入成功

- [ ] **08.5 切換 dev 後端 DATABASE_URL**（使用者手動 — Zeabur Dashboard）
  1. 進入 `kj-champion-system-dev` 服務 → Variables
  2. 將 `DATABASE_URL` 改為 08.1 的測試 DB 內網連線字串
  3. 儲存後 Zeabur 自動重啟
  4. 確認 logs 無 DB 連線錯誤

- [ ] **08.6 驗證隔離**（使用者驗證）
  1. 開啟 `https://kjcs-dev.pages.dev`
  2. 登入：用假成員的 LINE userId（08.4 假資料中的 ID）
  3. 確認看到的是假行程，不是正式資料
  4. 在 dev 新增一筆行程
  5. 切到正式站 `https://kj-champion-system.pages.dev`，確認**不會看到** dev 新增的那筆

- [ ] **08.7 更新文件**（Claude 程式碼）
  - 更新 `NOW.md`「設計決策」：新增「dev 後端使用獨立測試 DB」紀錄
  - 更新 dev 分支 README：標明測試 DB 連線位址（不含密碼）與假資料說明
  - 更新 `.claude/rules/database.md`：標註「dev 已建立測試 DB」狀態，第一閘門可實際執行

---

## 切分支備註

本 change 屬於後端 + 基礎建設變更，但實質只動：
- Zeabur 環境變數（不算程式碼）
- `scripts/seed-test-db.sql`（新增）
- 文件（NOW / README / 規則）

**分支策略**：單一分支 `m_b_dev_test_database`，不需拆 backend / frontend。

---

> **下一步**：08.1（使用者去 Zeabur Dashboard 建立 PostgreSQL 服務）。完成後告知 Claude。

最後更新：2026-04-25
