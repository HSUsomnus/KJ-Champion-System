# Change 16 — 備份 DB 同步

## 背景

使用者需求：為 KJ Champion System 建立一套 DB 備份機制，確保 prod 資料有異地備份；同時讓 dev 環境可手動拉取 prod 備份資料，方便測試。

痛點：
- prod DB 目前無備份，資料損毀無法復原
- dev 環境無真實資料，測試與實際行為有落差

## 目標

1. **prod DB → 備份 DB（異步雙寫）**：每次 prod 後端寫入後，異步 queue 同步寫入備份 DB
2. **備份 DB → dev DB（手動匯入）**：提供 admin API，開發者按需把備份 DB 資料匯入 dev DB

## 架構決策

### Zeabur 三 DB 架構

```
kj-champion 專案（正式）
├── postgresql          ← prod DB（私有網路，不變）
├── postgresql-backup   ← 備份 DB（私有網路，新建）
└── postgresql-dev-new  ← dev DB（公有網路，從 kj-champion-dev 遷移過來）

kj-champion-dev 專案（測試）
└── kj-champion-dev     ← dev 後端（連新 dev DB 公網）
```

**為什麼把 dev DB 移到 `kj-champion` 專案？**
- 讓備份 DB 可以保持私有網路（安全）
- prod 後端（同專案）可以透過內網連備份 DB，不需要公網暴露
- dev DB 開公網給 dev 後端跨專案連線，影響面最小

**備份 DB 為何保持私有？**
- 備份 DB 只需要 prod 後端（同專案內網）寫入
- admin sync API 在 prod 後端執行，prod 後端讀備份 DB（內網）→ 寫 dev DB（公網）
- 無需對外暴露

### 異步 Queue（Q3-C）

- **為何不用同步雙寫（Q3-A）**：備份 DB 不穩定時，同步雙寫會讓正式用戶請求失敗；異步 queue 讓 prod 完全無感
- **為何不用 Redis / BullMQ**：備份不是關鍵路徑，允許伺服器重啟時丟失 queue 中的少量任務；in-memory queue 夠用且無額外依賴
- **自動偵測寫入**：在 `db.query()` wrapper 層自動偵測 INSERT/UPDATE/DELETE，不需逐一修改各 service；`getClient()` transaction 場景在 COMMIT 後手動 enqueue

### Admin Sync API

- 端點：`POST /api/admin/sync-backup-to-dev`
- 驗證：`Authorization: Bearer <ADMIN_SECRET>`（prod 後端環境變數）
- 邏輯：per-table TRUNCATE + INSERT（全量覆蓋，簡單可靠）
- 資料流：prod 後端 → 備份 DB（內網讀）→ dev DB（公網寫）

## 涉及表格

| Table | 說明 |
|---|---|
| `members` | 會員資料（memberDbService.js） |
| `events` | 行事曆事件（eventDbService.js） |
| `financial_documents` | 財務文件（financial.js routes） |

## 環境變數新增

| 變數名稱 | 加到哪個服務 | 說明 |
|---|---|---|
| `BACKUP_DATABASE_URL` | prod 後端（kj-champion） | 備份 DB 內網連線字串 |
| `DEV_DATABASE_URL` | prod 後端（kj-champion） | dev DB 公網連線字串（供 admin sync 用） |
| `ADMIN_SECRET` | prod 後端（kj-champion） | admin API 驗證 token |
| `DATABASE_URL` | dev 後端（kj-champion-dev）| **更新**為新 dev DB 公網連線字串 |

## 邊界

**此 change 做：**
- 備份 DB 基礎建設（Zeabur 操作）
- dev DB 遷移到 kj-champion 專案
- 後端異步備份 queue
- admin sync-backup-to-dev API

**此 change 不做：**
- 備份 DB 的自動定期排程（不在需求範圍）
- 備份資料的 UI 介面
- 備份版本管理 / 歷史快照
