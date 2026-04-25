# Design — 08 dev 測試資料庫獨立化

## 技術方案

### 不改程式碼，只改環境變數

`server/config/db.js` 的 `process.env.DATABASE_URL` 設計已足夠 — 環境隔離應由部署層（Zeabur 環境變數）達成，不應在程式碼引入 `NODE_ENV` 分支邏輯（會增加維護成本且容易誤判）。

```
┌─────────────────────────────┐      ┌─────────────────────────────┐
│ kj-champion-system          │      │ kj-champion-system-dev      │
│ (正式後端 Zeabur 服務)       │      │ (dev 後端 Zeabur 服務)       │
│                             │      │                             │
│ DATABASE_URL ───────────┐   │      │ DATABASE_URL ──────────┐    │
└─────────────────────────┼───┘      └────────────────────────┼────┘
                          │                                   │
                          ▼                                   ▼
              ┌────────────────────┐              ┌──────────────────────┐
              │ postgresql (正式)   │              │ postgresql-test      │
              │ Zeabur PostgreSQL  │              │ Zeabur PostgreSQL    │
              │ 真實用戶資料        │              │ 假資料 / 空資料        │
              └────────────────────┘              └──────────────────────┘
```

### Zeabur 服務拓樸

dev 專案內現有：
- `kj-champion-system-dev`（Node.js 後端）
- `postgresql`（目前 dev 後端連的，實際是正式 DB 的同一條 connection string）

調整後 dev 專案內：
- `kj-champion-system-dev`（Node.js 後端）
- `postgresql-test`（**新建**，dev 專屬）
- `kj-champion-system-dev` 的 `DATABASE_URL` 改指向 `postgresql-test`

### Schema 灌入策略

採「schema-only dump，少量假資料」：

```bash
# 1. 從正式 DB 匯出 schema
pg_dump --schema-only --no-owner --no-privileges \
  "$PROD_DATABASE_URL" > /tmp/schema.sql

# 2. 套到測試 DB
psql "$TEST_DATABASE_URL" -f /tmp/schema.sql

# 3. 灌入假資料 seed（手動建立或從正式 DB 匿名化）
psql "$TEST_DATABASE_URL" -f /tmp/seed-fake.sql
```

> 此步驟由使用者在本機執行（連線字串敏感）。Claude 提供腳本但不執行匯出。

### 假資料建議內容

- 5～10 個假成員（涵蓋 manager / member / 各種角色）
- 5～10 個假行程（過去、進行中、未來）
- 0 筆財務資料（QA 自行建立測試）
- 0 筆 LINE 推播紀錄

避免從正式資料 anonymize — 風險高，反而手動建乾淨假資料更安全。

### 切換驗證

切換 `DATABASE_URL` 後，使用者在 dev 站驗證：

| 驗證項目 | 預期結果 |
|---|---|
| 登入 | 用假成員 LINE userId 登入成功 |
| 行事曆 | 看到假行程（不是正式資料的真實行程） |
| 新增行程 | 寫入後在測試 DB 出現，正式 DB 無變動 |
| 個人資料 | 顯示假成員資料 |
| 財務頁 | 空白（沒有測試財務資料） |

### 回退策略

若 dev 後端切換後完全壞掉（連不上 DB / schema 不相容）：
1. 把 `DATABASE_URL` 改回正式 DB connection string
2. 重啟 dev 後端
3. 在 OpenSpec change 內記錄失敗原因，重新規劃

不需要程式碼回退（沒改程式碼）。

## 不改的部分

- `server/config/db.js`：不引入環境分支
- 正式 DB：完全不動
- LINE Console：不需改（OAuth 不依賴 DB）
- Cloudflare Pages：不需改（前端不直接操作 DB）

## 後續延伸（不在本 change 範圍）

- 自動化 schema migration 工具（讓 schema 變動同步到兩個 DB）
- 假資料 seed 腳本入庫（`scripts/seed-test-db.sh`）
- m_b_* 功能分支的 schema migration 流程（什麼時候 apply 到測試 DB / 正式 DB）

這些延伸如有需求，開新 change 處理。

---

*建立日期：2026-04-25*
