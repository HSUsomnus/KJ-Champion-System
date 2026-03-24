# Design: 01-zeabur-infra-and-db

> ✅ **ARCHIVED** — 決策已定案，供後續 change 參考

## Decision 0：專案統一命名為 KJ-Champion

**選擇**：以 `KJ-Champion`（kebab-case：`kj-champion`）作為新架構的統一識別名稱。

| 對象 | 命名 |
| --- | --- |
| Zeabur 正式專案 | `kj-champion` |
| Zeabur staging 專案 | `kj-champion-staging` |
| Cloudflare Pages 專案 | `kj-champion-system` |
| 後端網域 | `kj-champion.zeabur.app` |
| 前端網域 | `kj-champion.pages.dev` |
| React 前端內部 | `KjChampion` / `kjChampion` |
| PWA `name` | `KJ Champion` |
| PWA `short_name` | `康九冠軍夥伴系統` |
| PWA `theme_color` | `#D4AF37` |

## Decision 1：雙分支環境隔離，正式環境零風險

**選擇**：建立 `staging` 分支，各平台分別監聽自己的分支。

```
main    → Vercel 前端 (public/) + Vercel 後端（正式，現有不動）
staging → Cloudflare Pages + Zeabur 後端 + Zeabur PostgreSQL DB
```

**理由**：專案已上線，`staging` 分支失敗不影響正式服務。

## Decision 1b：Zeabur PostgreSQL 為最終正式資料庫

**選擇**：從 Supabase 做一次性單向資料複製作為初始化，驗證通過後 Zeabur PostgreSQL 即成為正式資料庫。

**切換順序**：
1. `pg_dump` 匯出 Supabase schema → 匯入 Zeabur
2. `pg_dump` 匯出業務資料 → 匯入 Zeabur
3. 核對每張主要 table 的 `COUNT(*)`
4. 正式後端換 `DATABASE_URL` 指向 Zeabur → 真人驗證 ✅
5. Supabase 保留到第三階段完成後才停用

## Decision 1c：雙寫服務 ❌ 已廢棄（v1.5.4）

**原計畫**：v1.5.2 實作 `dualWriteService.js`，所有寫入 fire-and-forget 備份至 Supabase。

**廢棄原因**：驗證無法完成，複雜度超過收益，v1.5.4 移除。

**現狀**：`dualWriteService.js` 已刪除，所有寫入直接 `db.query`（Zeabur 主庫）。

## Decision 7：`zbpack.json` 放在 repo 根目錄

```json
{
  "nodejs_version": "18",
  "start_command": "node server/server.js"
}
```

**理由**：明確指定 Node.js 版本與啟動指令，避免 Zeabur 誤判 monorepo 結構。

---

## Infrastructure Values（連線參數）

### Supabase（已不再寫入，保留為備份）

| 項目 | 值 |
| --- | --- |
| Project Ref | `fsrkhmnqmbbhwdsmacnn` |
| Pooler Host | `aws-1-ap-northeast-1.pooler.supabase.com:6543` |
| Direct Host（pg_dump 用） | `db.fsrkhmnqmbbhwdsmacnn.supabase.co:5432` |
| User | `postgres` |
| Database | `postgres` |
| 密碼 | 見 `.env` → `SUPABASE_BACKUP_URL` |

### Zeabur PostgreSQL（正式主庫）

| 項目 | 值 |
| --- | --- |
| 外網 Host | `43.163.196.8` |
| 外網 Port | `30756` |
| User | `root` |
| Database | `zeabur` |
| 密碼 | 見 `.env.staging` 或 Zeabur Dashboard |
| 外網連線字串 | `postgresql://root:<password>@43.163.196.8:30756/zeabur` |

> 內網 URL 由 Zeabur Dashboard 提供，設定為後端服務的 `DATABASE_URL`。

### DB 同步指令（Task 2b 參考，已完成）

```bash
# 1. 匯出 Supabase schema
pg_dump "postgresql://postgres:<pw>@db.fsrkhmnqmbbhwdsmacnn.supabase.co:5432/postgres" \
  --schema-only --schema=public -f supabase_schema.sql

# 2. 匯入 schema 至 Zeabur
psql "postgresql://root:<pw>@43.163.196.8:30756/zeabur" -f supabase_schema.sql

# 3. 匯出 Supabase 業務資料
pg_dump "postgresql://postgres:<pw>@db.fsrkhmnqmbbhwdsmacnn.supabase.co:5432/postgres" \
  --data-only --schema=public -f supabase_data.sql

# 4. 匯入資料至 Zeabur
psql "postgresql://root:<pw>@43.163.196.8:30756/zeabur" -f supabase_data.sql
```
