# Database Rules — 觸碰 server/services/* 時注入

## 架構總覽（v2.7.0 起）

所有 PostgreSQL 服務都在 **`kj-champion` 專案**（prod 專案）內：

| 服務 | 用途 | 公網 |
|---|---|---|
| `postgresql` | **prod DB**（正式） | 預設**關閉**，永遠不開 |
| `postgresql-backup` | **backup DB**（備份，每 8 小時自動從 prod 全量覆蓋） | 預設**關閉**，永遠不開 |
| `postgresql-dev` | **dev DB**（測試） | **開啟**（dev 後端跨專案存取需要） |

Dev 後端（`kj-champion-dev` 專案的 `kj-champion-system-dev`）透過公網 URL 連 `postgresql-dev`。

已廢棄：
- **Supabase**：已廢棄，禁止直接操作
- **雙寫服務**：已移除（v1.5.4），所有寫入直接走 Zeabur

---

## 操作原則（最高優先）

```
❌ 不開 DB 公網連接埠（prod DB / backup DB 公網永遠關閉）
❌ 不從本機執行腳本連接 DB（scripts/*.js 連 DB 的方式已廢棄）
✅ 所有 DB 操作透過 Zeabur 儀表板的終端機執行
```

**兩種終端機入口：**

| 入口 | Zeabur 路徑 | 適用操作 |
|---|---|---|
| **PostgreSQL Console** | `kj-champion` → `[DB服務]` → Console 頁籤 | SQL 查詢、schema 更新、資料讀寫 |
| **後端容器 Terminal** | `kj-champion` → `kj-champion-system` → Terminal 頁籤 | 需要讀取環境變數或跨服務操作時 |

**各 DB 對應的 Console 路徑：**

| DB | Zeabur Console 路徑 |
|---|---|
| prod DB | `kj-champion` → `postgresql` → Console |
| backup DB | `kj-champion` → `postgresql-backup` → Console |
| dev DB | `kj-champion` → `postgresql-dev` → Console |

---

## Claude 產生指令的格式

當需要執行 DB 操作時，Claude 必須輸出以下格式，讓使用者複製貼上：

```
📋 Zeabur 操作：
路徑：kj-champion → postgresql → Console（或 Terminal）

貼上以下指令：
───────────────────────────────
[指令內容]
───────────────────────────────
```

---

## 資料同步流向

```
prod DB ──（每 8 小時，node-cron 自動）──▶ backup DB
                                                │
                                        手動需要同步 dev 時：
                                        GET /api/admin/export-backup-csv
                                        → 下載 CSV
                                        → Zeabur postgresql-dev Console
                                        → 貼上 INSERT/UPSERT SQL
                                                │
                                                ▼
                                           dev DB
```

Admin API（Bearer token 保護）：
- `POST /api/admin/sync-prod-to-backup`：手動觸發全量備份（不等排程）
- `GET /api/admin/export-backup-csv`：從 backup DB 匯出 CSV（後端內網，不需開公網）
- `GET /api/admin/backup-status`：查詢各 table 筆數

`sync-backup-to-dev` API 已移除（v2.8.0），dev DB 寫入只能手動（Console 貼 SQL）。

---

## 本機 .env 變數對照

| 變數 | 指向 | 日常狀態 |
|---|---|---|
| `DATABASE_URL` | prod DB 公網 | 日常**無效**（公網永遠關閉，僅作 fallback 備留） |
| `BACKUP_DATABASE_URL` | backup DB **內網** | 後端自動連，不需人工操作 |
| `DEV_DATABASE_URL` | dev DB 公網 | 有效（dev DB 公網常開） |

> **注意**：Zeabur 環境變數不支援跨服務 `${}` 語法展開，`BACKUP_DATABASE_URL` 必須填完整連線字串。

---

## Schema 更新（新增 migration 時）

新增 migration SQL 後，透過 Zeabur Console 對各 DB 套用：

| DB | 操作步驟 |
|---|---|
| **dev DB** | `kj-champion` → `postgresql-dev` → Console → 貼上 migration SQL |
| **prod DB** | `kj-champion` → `postgresql` → Console → 貼上 migration SQL |
| **backup DB** | `kj-champion` → `postgresql-backup` → Console → 貼上 migration SQL |

**Claude 產生 migration 指令時**，必須同時提供三份（dev / prod / backup 各一），讓使用者逐一貼上。

---

## ⛔ 寫入操作安全規則（第一閘門）

任何新增 / 修改 / 刪除程式碼改動前，**強制確認目標 DB**：

- 後端服務指向 `DEV_DATABASE_URL`（dev DB）→ ✅ 安全，可繼續
- 後端服務指向 prod / backup → 停止，必須走第二閘門

---

## ⛔⛔ 操作 prod / backup DB（第二閘門）

若需透過 Zeabur Console 直接讀寫 prod 或 backup DB：

1. **強制警告**：「正式 DB 包含真實用戶資料，寫入操作無法自動復原」
2. 使用者必須明確回覆：「確認操作正式 DB」
3. 確認後，Claude 產生 SQL 指令（格式如上），使用者到對應 Console 貼上執行
4. 操作完成後必須清除測試資料（若有寫入）
