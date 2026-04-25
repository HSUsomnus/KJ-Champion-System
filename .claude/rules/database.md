# Database Rules — 觸碰 server/services/* 時注入

## 架構說明

- 資料庫由後端工程師管理，前端**不直接操作 DB**
- 前端透過 API 與後端溝通，後端負責所有 DB 操作

## 當前資料庫（v2.1.0 起 — Zeabur 雙專案分離）

| 環境 | Zeabur 專案 | DB 服務 | 內網主機 | 公網 |
|---|---|---|---|---|
| **prod**（正式） | `kj-champion` | `postgresql` | `postgresql.zeabur.internal:5432` | **預設關閉**（PC 維護需暫時開）|
| **dev**（測試） | `kj-champion-dev` | `postgresql-dev` | `postgresql.zeabur.internal:5432`（同 hostname，但跨專案內網不通） | 開啟（PC 可連） |

- **Supabase**：已廢棄，禁止直接操作
- **雙寫服務**：已移除（v1.5.4），所有寫入直接走 Zeabur

## ⛔ 寫入操作安全規則（第一閘門）— v2.1.0 起可實際執行

任何新增 / 修改 / 刪除操作前，**強制停止**：

1. 確認當前使用的是**測試資料庫**（dev 環境的 `postgresql-dev`，在 `kj-champion-dev` 專案內）
2. ✅ **dev 測試 DB 已建立**（v2.1.0 完成 OpenSpec change 10）
3. 本機 `.env` 內變數命名：
   - `DATABASE_URL` = prod 公網（**v2.1.0 起公網預設關閉，此字串日常無效，僅作回滾備份**）
   - `DEV_DATABASE_URL` = dev 公網（PC 可連，做 schema dump / 維護用）

## ⛔⛔ 測試正式資料庫（第二閘門）

若使用者提出需要測試正式資料庫：

1. **強制再次警告**：「正式 DB 包含真實用戶資料，寫入操作無法自動復原」
2. 使用者必須明確回覆「確認測試正式 DB」
3. **prod 公網預設關閉**：必須先在 Zeabur Dashboard `kj-champion` → `postgresql` → 網路 → 連線埠轉送 toggle 暫時開啟
4. 確認後才可繼續
5. 測試完成後**必須清除測試資料 + 立刻關回公網**

## ⛔⛔ 測試正式資料庫（第二閘門）

若使用者提出需要測試正式資料庫：

1. **強制再次警告**：「正式 DB 包含真實用戶資料，寫入操作無法自動復原」
2. 使用者必須明確回覆「確認測試正式 DB」
3. 確認後才可繼續
4. 測試完成後**必須清除測試資料**
