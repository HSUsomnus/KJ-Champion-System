# 康九冠軍夥伴系統 — `m_b_dev_test_database`

> **分支**：`m_b_dev_test_database` | **基底**：`main` v2.0.4 | **OpenSpec**：[08-dev-test-database](./openspec/changes/08-dev-test-database/tasks.md)

此分支用於規劃並執行 **dev 後端切換到獨立測試 PostgreSQL** 的工作。完成後 dev 站任何寫入都不會影響正式資料。

---

## 此分支正在做什麼

**問題**：dev 後端（`kj-champion-system-dev.zeabur.app`）目前的 `DATABASE_URL` 與正式後端共用同一個 Zeabur PostgreSQL 實例，導致：

- dev 上跑 migration / 寫入測試會污染正式資料
- 違反 `.claude/rules/database.md` 第一閘門（寫入操作必須先確認使用測試 DB）
- QA 無法安全跑「刪除 / 批次更新」這類破壞性測試

**目標**：dev 後端只連測試 DB，正式後端只連正式 DB，兩者完全隔離。

**做法**：

1. 在 Zeabur dev 專案新增獨立 PostgreSQL（`postgresql-test`）
2. 把正式 DB 的 schema dump 套到測試 DB
3. 灌入手寫假資料（5 個假成員、5 個假行程，無真實資料 anonymize）
4. 修改 dev 後端 Zeabur 服務的 `DATABASE_URL` 指向測試 DB
5. 驗證 dev 寫入不影響正式資料

詳細步驟見 [`openspec/changes/08-dev-test-database/tasks.md`](./openspec/changes/08-dev-test-database/tasks.md)。

---

## 與 `main` 的差異

| 項目 | `main` | `m_b_dev_test_database` |
|------|--------|-------------------------|
| 程式碼 | — | **不變**（`server/config/db.js` 不動） |
| OpenSpec | 無 change 08 | 新增 `08-dev-test-database/`（proposal + design + tasks） |
| STATUS.md | 無 #08 | 列入 #08 OPEN |
| 文件 | — | 本 README 改寫為 m_b_ 分支說明 |
| Zeabur 部署 | 不影響 | dev 後端環境變數待 08.5 切換 |

> 本 change **不修改任何 `server/` 程式碼**。所有變更發生在部署層（Zeabur 環境變數）與文件，因此可由使用者在 Zeabur Dashboard 手動執行，Claude 負責文件與假資料 seed 腳本。

---

## 如何在本機推進此 change

依 `tasks.md` 順序執行。Claude 端會做的事：

- **08.4** 建立 `scripts/seed-test-db.sql`（假資料）
- **08.7** 更新 NOW.md / dev README / `.claude/rules/database.md`

使用者端會做的事（皆在 Zeabur Dashboard / 本機 terminal）：

- **08.1** Zeabur 新增 PostgreSQL 服務
- **08.2** 本機 `pg_dump` 取得正式 DB schema
- **08.3** 本機 `psql` 套用 schema 到測試 DB
- **08.5** Zeabur 改 dev 後端的 `DATABASE_URL`
- **08.6** dev 站功能驗證

---

## 完成定義

當以下三件事都成立時，本 change 可標 DONE 並 merge：

1. `kjcs-dev.pages.dev` 寫入完全不影響 `kj-champion-system.pages.dev`（08.6 驗證通過）
2. NOW.md「設計決策」記錄「dev 後端使用獨立測試 DB」
3. `.claude/rules/database.md` 第一閘門狀態更新為「測試 DB 已建立」

---

## 預設指令

| 你說 | Claude 做 |
|------|-----------|
| 「執行計畫」 | 從 `tasks.md` 找下一個未完成的 `[ ]` task 推進 |
| 「修改計畫」 | 確認在此分支 → 動 `proposal.md` → `design.md` → `tasks.md` |
| 「測試功能」 | 此 change 不適用（沒程式碼變更，直接在 Zeabur 切換） |
| 「功能上線」 | 確認 08.6 通過後，merge 此分支到 main |

---

> 完整正式版部署架構、環境變數、本機開發流程請見 `main` 分支的 README。
