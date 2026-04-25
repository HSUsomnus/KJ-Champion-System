# Proposal — 08 dev 測試資料庫獨立化

## 問題

目前 dev 後端（`kj-champion-system-dev.zeabur.app`）的 `DATABASE_URL` 與正式後端（`kj-champion-system.zeabur.app`）指向**同一個 Zeabur PostgreSQL 實例**。

證據：
- `server/config/db.js:21` 兩分支程式碼相同，皆讀 `process.env.DATABASE_URL`，無 dev/prod 切換邏輯
- Zeabur dev 服務的環境變數設定（dev 後端建立時使用了同一條 DATABASE_URL）
- dev README 與 NOW.md 均無「獨立測試 DB」紀錄

導致：
- dev 上跑的 migration（如 `m_b_tag_database`）、寫入測試直接污染正式資料
- 違反 `.claude/rules/database.md` 的「第一閘門」：寫入操作前必須確認使用的是測試 DB
- QA 無法安全測試「刪除」「批次更新」這類破壞性流程
- 跑壞的測試資料會出現在正式用戶眼前

## 目標

**dev 後端只連測試 DB，正式後端只連正式 DB，兩者完全隔離。**

完成後：
- dev 站任何寫入都不影響正式資料
- 正式 DB schema 變動經 dev 驗證後才上 main
- `.claude/rules/database.md` 第一閘門可以實際執行

## 解法

1. 在 Zeabur dev 專案新增獨立 PostgreSQL 服務
2. 用正式 DB schema dump（不含資料 / 帶少量假資料）灌進測試 DB
3. 修改 dev 後端 Zeabur 服務的 `DATABASE_URL` 環境變數，指向測試 DB
4. 重啟 dev 後端，驗證 dev 站功能與寫入隔離
5. 更新文件：dev README、NOW.md「設計決策」區塊記錄 DB 隔離

## 影響範圍

- **Zeabur dev 專案**：新增 PostgreSQL 服務、修改 dev 後端環境變數
- **程式碼**：不動 `server/config/db.js`（只動環境變數）
- **正式環境**：完全不影響
- **文件**：dev README、NOW.md

## 不做的事

- ❌ 不改 `server/` 程式碼（不引入 NODE_ENV 切換邏輯）
- ❌ 不改正式 DB
- ❌ 不為 m_b_* 功能分支各自建獨立 DB（dev 共用一個測試 DB 即可）
- ❌ 不做自動 schema 同步（schema 變更走 migration 流程，由開發者手動套用至兩個 DB）

---

*建立日期：2026-04-25*
