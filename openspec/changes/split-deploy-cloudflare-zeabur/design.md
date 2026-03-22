# Design: split-deploy-cloudflare-zeabur

## Context

專案目前架構：Express.js 後端 + 純 HTML/JS 前端（`public/`）同部署在 Vercel、資料庫使用 Supabase，系統已上線運作中。

`staging` 分支將引入全新的 React + Vite 前端（`frontend/`），並部署至 Cloudflare Pages，後端同步遷移至 Zeabur。`main` 分支維持現有 Vercel 部署完全不動。

`server/server.js` 已有 CORS middleware，透過 `FRONTEND_URL` 環境變數控制白名單，**後端程式碼無需修改**。

**目前進度（2026-03-22）**：Task 1～2e.5 完成。正式 Vercel 後端已切換至 Zeabur DB 並上線雙寫服務（v1.5.2）。v1.5.3 補入 `staging` 分支遺漏的 `dualWriteService.js`（計畫外，見 tasks 2e.5b）。等待 2e.6 手動驗證後進行 2f（Zeabur 後端部署）。

## Goals / Non-Goals

**Goals:**

- 建立 `staging` 分支作為新技術棧的測試環境
- 正式環境（`main` + Vercel）完全不受影響
- 新前端使用 React + Vite + PWA，支援離線快取與可安裝（Add to Home Screen）
- 前端 API 呼叫透過 `_redirects` proxy 解決跨網域，不硬編碼後端 URL
- 所有 secrets 不進 git，由各平台控制台管理

**Non-Goals:**

- 不修改後端 API 路由或業務邏輯（`dualWriteService` 僅在 service 層包裝 DB 寫入，不改 route）
- 不拆分 GitHub 倉庫
- 本次不切換正式環境的前端平台（第三階段才做）
- staging 資料庫不共用正式 Supabase（staging 用 Zeabur 內建 PostgreSQL 隔離）

## Decisions

### Decision 0：專案統一命名為 KJ-Champion

**選擇**：以 `KJ-Champion`（kebab-case：`kj-champion`）作為新架構的統一識別名稱，取代原本的 `Line_Liff`。

**適用範圍**：

| 對象 | 命名 |
| --- | --- |
| Zeabur 正式專案 | `kj-champion` |
| Zeabur staging 專案 | `kj-champion-staging` |
| Cloudflare Pages 正式 | `kj-champion` |
| Cloudflare Pages staging | `kj-champion-staging` |
| 後端網域（參考） | `kj-champion.zeabur.app` |
| 前端網域（參考） | `kj-champion.pages.dev` |
| React 前端 `frontend/` 內部 | 元件、函式、型別均以 `KjChampion` / `kjChampion` 命名 |
| PWA `name` | `KJ Champion` |
| PWA `short_name` | `康九冠軍夥伴系統` |

**理由**：前後端與資料庫同步重構，是引入正式命名的最佳時機；舊名 `Line_Liff` 只描述技術實作（LIFF），不代表業務意義。`public/` 舊前端與 `server/` 後端在本階段不強制重命名（避免影響正式環境），待第三階段 Vercel 退場後再清理。

---

### Decision 1：雙分支環境隔離，正式環境零風險

**選擇**：建立 `staging` 分支，各平台分別監聽自己的分支。

```text
main    →  Vercel 前端 (public/) + Vercel 後端（正式，現有不動）
staging →  Cloudflare Pages (frontend/dist) + Zeabur 後端 + Zeabur PostgreSQL DB
```

**理由**：專案已上線，`staging` 分支失敗不影響正式服務，成功後再合併。

### Decision 1b：Zeabur PostgreSQL 為最終正式資料庫，初始資料從 Supabase 單向同步，驗證後 Supabase 退場

**選擇**：在 Zeabur 建立 PostgreSQL 服務，**從 Supabase 做一次性單向資料複製作為初始化**，驗證通過後此 Zeabur PostgreSQL 即成為正式資料庫；Supabase 在後端切換完成後停用。

**切換順序**（三步驟，各自可獨立回退）：

1. `pg_dump --schema-only` 匯出 Supabase schema → 匯入 Zeabur（table、index、constraint、enum）
2. `pg_dump --data-only` 匯出 Supabase 業務資料（排除 `auth.*`、`storage.*` 系統表）→ 匯入 Zeabur
3. 核對每張主要 table 的 `COUNT(*)`，確認資料筆數一致
4. **正式後端（Vercel）先換 `DATABASE_URL` 指向 Zeabur DB** → 真人驗證 1–2 天（後端平台暫不動）✅ 已完成
5. 真人驗證通過 → 才部署後端至 Zeabur、移植前端至 Cloudflare Pages
6. **Supabase 保留到第三階段（Cloudflare Pages 前端）完成後才停用**

**理由**：

- 真實資料讓 staging 測試更貼近正式環境（月曆事件、成員資料均存在）
- 資料庫先換、後端平台後換，每步都可快速回退（切回舊 `DATABASE_URL` 即可）
- Supabase 作為備份保留至全部重構完成，降低任何階段出錯的損失
- Zeabur 服務間可直接用內網 `DATABASE_URL` 連線，延遲極低

**Rollback**：

- 任何階段前：將 `DATABASE_URL` 切回 Supabase 連線字串，即時回退，資料無損
- Supabase 在第三階段完成確認後才停用，停用前均可作為回退目標

### Decision 1c：切換 Zeabur DB 後，持續雙寫 Supabase（只寫不讀）直到重構完成

**選擇**：後端切換至 Zeabur PostgreSQL 作為主要讀寫庫後，同時以「非阻塞 fire-and-forget」方式將所有寫入操作（INSERT / UPDATE / DELETE）複製到 Supabase，但所有讀取只從 Zeabur 取得。重構完成（Task 9.10）後停止雙寫、停用 Supabase。

**實作方式**（`server/services/dualWriteService.js`，已完成 v1.5.2 / `main`）：

```js
// 寫入 Zeabur（主庫），成功後 fire-and-forget 寫入 Supabase（備份）
async function dualWrite(primaryFn, backupFn) {
  const result = await primaryFn();          // 主庫寫入，失敗直接拋出
  backupFn().catch(err =>                    // 備份庫失敗不影響主流程
    console.warn('[DualWrite] Supabase backup failed:', err.message)
  );
  return result;
}
```

所有涉及寫入的 service（`memberDbService`、`eventDbService`）在呼叫 DB 寫入時，改用 `dualWrite()` 包裝。

**⚠️ 重要實作細節：**

1. **SSL 連線**：Supabase 備份連線池**必須**設定 `ssl: { rejectUnauthorized: false }`，否則連線被拒且因 fire-and-forget 靜默失敗，難以察覺。初次實作遺漏此設定導致 2e.6 驗證失敗，v1.5.2 已修正。
2. **分支歸屬**：雙寫程式碼必須 commit 至 `main` 分支（正式 Vercel 監聽 `main`）。`staging` 分支因 v1.5.3 計畫外補丁也已包含此檔案（tasks 2e.5b），對 2f 後端部署無害。
3. **`SUPABASE_BACKUP_URL`** 須使用 Supabase **Direct 連線字串**（port 5432），非 Pooler（port 6543）。

**環境變數控制**：

```env
DUAL_WRITE_ENABLED=true               # 開啟雙寫（重構期間）
SUPABASE_BACKUP_URL=postgresql://...  # Supabase 備份庫 Direct URL（port 5432）
```

設 `DUAL_WRITE_ENABLED=false` 即可關閉，不需改程式碼。

**理由**：

- Supabase 作為 live 熱備份，萬一 Zeabur DB 出現問題，資料可從 Supabase 完整還原
- Fire-and-forget 模式：Supabase 寫入失敗不阻塞正式流程，用戶無感知
- 僅需改 service 層，不動 route 或前端
- 重構完成後只需關掉環境變數，不留技術債

**停止條件**：Task 9.8（第三階段確認完成）→ 設 `DUAL_WRITE_ENABLED=false` → 觀察 24 小時確認無異常 → 停用 Supabase。

**Trade-off**：

- 寫入有兩倍 DB 操作，輕微增加延遲（Supabase 為非同步，主流程不等待）
- Supabase 與 Zeabur 的資料可能有微小落差（Supabase 寫入失敗時），但僅用於備份回復，非讀取來源

---

### Decision 2：React + Vite + TypeScript 作為新前端技術棧

**選擇**：`frontend/` 目錄使用 React 18 + Vite + TypeScript，並整合 `vite-plugin-pwa`。

**理由**：

- 原 `public/` 純 HTML/JS 難以維護，缺乏型別安全
- Vite 建置速度快，Cloudflare Pages 對 Vite 有原生支援
- React 生態成熟，方便後續擴充
- `frontend/` 目錄名稱與現有 repo 結構一致（原本就預留了此位置）

**關鍵依賴**：

```json
{
  "dependencies": { "react": "^18", "react-dom": "^18" },
  "devDependencies": {
    "vite": "^5",
    "@vitejs/plugin-react": "^4",
    "vite-plugin-pwa": "^0.20",
    "typescript": "^5",
    "workbox-window": "^7",
    "tailwindcss": "^3",
    "class-variance-authority": "^0.7",
    "clsx": "^2",
    "tailwind-merge": "^2",
    "lucide-react": "^0.400"
  }
}
```

### Decision 2b：UI 元件庫使用 shadcn/ui

**選擇**：在 React + Vite 環境整合 shadcn/ui（基於 Radix UI + Tailwind CSS），作為主要 UI 元件來源。

**理由**：

- 元件直接複製進 `src/components/ui/`，不是 npm 套件，完全可自訂、不受版本升級影響
- 基於 Radix UI，內建無障礙支援（ARIA、鍵盤導航）
- Tailwind CSS 樣式系統，透過 CSS 變數統一管理 light/dark mode
- 現有 `public/` 的自製元件均有對應：

| 現有元件 | shadcn/ui 對應 |
| --- | --- |
| `datePicker.js` | `Calendar` + `Popover` |
| `timePicker.js` | `Input`（time type） |
| `share-dialog.js` | `Dialog` |
| 管理後台表格 | `Table` |
| 財務上傳表單 | `Form` + `Input` |

**替代方案：**

- ❌ MUI / Ant Design：套件綁定，客製化成本高，bundle size 大
- ❌ 自己寫 CSS：重複 `public/` 的路，缺乏無障礙支援

### Decision 3：PWA 使用 `vite-plugin-pwa` + Workbox

**選擇**：`vite-plugin-pwa` 自動產生 Service Worker（Workbox GenerateSW 策略），`manifest.webmanifest` 由插件管理。

**PWA 快取策略**：

- HTML：Network First（確保最新內容）
- JS/CSS/圖片：Cache First，版本化（Vite hash filename）
- API (`/api/*`)：Network Only（不快取 API 回應）

**理由**：Workbox GenerateSW 設定最少，適合初期。Service Worker 的 API 路由排除設定可避免快取到動態資料。

### Decision 4：用 Cloudflare `_redirects` 做 API Proxy

**選擇**：`frontend/public/_redirects`（Vite build 時會複製到 `dist/`）設定 `/api/*` → Zeabur 後端 proxy。

```text
/api/*  https://<zeabur-backend-url>/api/:splat  200
```

**理由**：新前端的 API 呼叫仍使用相對路徑 `/api/...`，`_redirects` 在平台層透明轉發，前端程式碼無需感知後端 URL。

### Decision 5：CORS 只需設環境變數

**選擇**：`server.js` CORS 已有 `FRONTEND_URL` 支援，在 Zeabur 設定 `FRONTEND_URL=https://kj-champion-staging.pages.dev` 即可，無需改程式碼。

### Decision 6：Cloudflare Pages build 設定

```text
Build command:     cd frontend && npm install && npm run build
Build output dir:  frontend/dist
Root directory:    /（repo 根目錄）
Branch:            staging
```

**理由**：monorepo 結構下，Cloudflare Pages 需要 cd 進入 `frontend/` 執行 build，輸出目錄同樣需指定完整路徑。

### Decision 7：`zbpack.json` 放在 repo 根目錄（`staging` 分支）

**選擇**：根目錄的 `zbpack.json` 明確指定 Node.js 版本與啟動指令，避免 Zeabur 誤判 monorepo 結構。

```json
{
  "nodejs_version": "18",
  "start_command": "node server/server.js"
}
```

## Risks / Trade-offs

| 風險 | 說明 | 緩解方式 |
| --- | --- | --- |
| DB 同步資料遺漏 | `pg_dump` 排除系統表時可能誤排業務表 | 事前列出所有 table 清單，逐一確認在 dump 範圍內 |
| Supabase Auth 相依 | 若後端讀取 `auth.users` 需特別處理 | staging 登入改用 `?dev=1` 模擬，auth 資料不需同步 |
| 雙寫資料落差 | Supabase 備份寫入失敗時，兩庫資料會有微小差異 | 僅備份用，非讀取來源；失敗時 `console.warn` 可監控 |
| **雙寫 SSL 連線失敗** | **Supabase 要求 SSL，backupPool 若未設定 ssl 則靜默失敗，難以察覺** | **backupPool 加入 `ssl: { rejectUnauthorized: false }`（已修正，v1.5.2）** |
| 雙寫忘記關閉 | 重構完成後未關 `DUAL_WRITE_ENABLED`，持續消耗 Supabase quota | Task 9.8 有明確關閉步驟，並驗證 Supabase 不再收到新寫入 |
| React 前端重寫工作量 | 原 `public/` 頁面需逐一移植到 React | 先建立基礎架構，功能頁面可分批移植 |
| `staging` 與 `main` 分支分歧 | 長期維護兩個分支可能出現 merge 衝突 | `staging` 定期從 `main` rebase |
| PWA Service Worker 快取舊版 | SW 更新不及時導致用戶看到舊畫面 | 設定 `registerType: 'autoUpdate'`，新版本自動接管 |
| `_redirects` proxy 延遲 | Cloudflare → Zeabur 多一層跳轉 | 兩者皆為全球節點，延遲通常 < 50ms |
| Zeabur 冷啟動 | 免費方案可能有冷啟動延遲 | 升級方案或接受首次請求較慢 |
| LINE OAuth 回調 URL | LINE Developer Console 需新增 Zeabur 網域 | 部署後在 LINE Console 手動新增 |

## Migration Plan

### 第一階段：建立 staging 測試環境

> **順序原則：DB 最先、後端次之、前端最後**。

1. ✅ 從 `main` checkout `staging` 分支，新增 `zbpack.json`
2. ✅ **Zeabur 建立 PostgreSQL 服務** → 確認可從本機連線
3. ✅ **Supabase → Zeabur 單向資料同步**：匯出 schema + 業務資料 → 匯入 Zeabur → 核對筆數與欄位
4. ✅ **驗證 Zeabur DB 正確性**（COUNT 一致、抽查欄位、foreign key 有效）
5. ✅ **正式後端（Vercel）換 `DATABASE_URL` 指向 Zeabur DB** → 真人驗證通過
6. ✅ **雙寫服務實作**（v1.5.2 / `main`）：`dualWriteService.js` + service 層包裝 + SSL 修正 + Vercel 環境變數設定
7. ⏳ **手動寫入驗證**（Task 2e.6）：確認 Zeabur 與 Supabase 兩邊均收到資料
8. ⬜ **Zeabur 後端部署**（`staging` 分支）→ 設定環境變數 → 取得後端 URL（Task 2f）
9. ⬜ **用 `public/` 前端（`?dev=1`）驗證 staging 後端**（API 回應、LINE Login、DB CRUD 均通過）
10. ⬜ 新增 `frontend/`（Vite + React + PWA 骨架）→ `_redirects` 填入真實 Zeabur URL
11. ⬜ Cloudflare Pages 連接 `staging` 分支 → 部署前端 → 取得前端 URL
12. ⬜ Zeabur 設 `FRONTEND_URL` = Cloudflare Pages URL
13. ⬜ 完整驗證：LINE Login、行事曆 CRUD、PWA 安裝

### 第二階段：正式後端切換至 Zeabur（前端不動）

**前提**：Zeabur PostgreSQL 已由真人在正式環境驗證穩定（Task 2d 通過）✅

1. 在 Zeabur `kj-champion` 專案為正式環境建立獨立服務（監聽 `main` 分支）
2. 設定正式環境變數：`DATABASE_URL` = Zeabur PostgreSQL 內網 URL、`FRONTEND_URL` = 現有 Vercel 前端 URL
3. LINE Developer Console 正式 Callback URL 指向新 Zeabur 網域
4. 將正式前端（Vercel / `public/`）的 API 呼叫切換至新 Zeabur 後端
5. 觀察穩定性，確認無誤
6. 停用 Vercel 後端服務（⚠️ **Supabase 此階段保留，不停用**）

### 第三階段：正式前端切換至 Cloudflare Pages（後端已在 Zeabur）

**前提**：`staging` 前端通過所有功能驗證，第二階段後端穩定

1. 在 Cloudflare Pages 為正式環境建立獨立專案（監聽 `main` 分支）
2. 更新 `main` 分支的 `frontend/public/_redirects`，指向第二階段的正式 Zeabur 後端
3. 正式網域（DNS）切換至 Cloudflare Pages
4. 觀察穩定性，確認無誤
5. 停用 Vercel 前端服務，Vercel 完全退場
6. **確認整個重構完成後，正式停用 Supabase**（這是 Supabase 的最終退場點）

### Rollback 策略

| 階段 | 失敗情境 | 回退方式 |
| --- | --- | --- |
| 第一階段（DB 驗證前） | Zeabur DB 異常 | 刪除重建，重新從 Supabase 同步，Supabase 此時仍是正式庫 |
| 第一階段（staging 整體） | staging 環境異常 | 刪除 Cloudflare / Zeabur staging 服務，`main` 完全不受影響 |
| 第二階段 | 正式後端切換後異常 | Vercel 後端仍在，前端 API URL 切回 Vercel；Supabase 此時仍保留，可直接切回 |
| 第三階段 | 正式前端切換後異常 | DNS 切回 Vercel 前端（Vercel 保留至此階段確認完畢再退場） |

## Infrastructure Values

> 實際部署後記錄的連線參數（密碼存放於 `.env`，不進 git）

### Supabase（雙寫備份庫）

| 項目 | 值 |
| --- | --- |
| Project Ref | `fsrkhmnqmbbhwdsmacnn` |
| Pooler Host（一般使用） | `aws-1-ap-northeast-1.pooler.supabase.com:6543` |
| Direct Host（`SUPABASE_BACKUP_URL` 與 pg_dump 專用） | `db.fsrkhmnqmbbhwdsmacnn.supabase.co:5432` |
| User | `postgres` |
| Database | `postgres` |
| 密碼 | 見 `.env` → `SUPABASE_BACKUP_URL` |

> **注意**：`SUPABASE_BACKUP_URL` 與 `pg_dump` 皆須使用 Direct Host（port 5432）。Pooler URL（port 6543）不支援持久連線與 `pg_dump`。

### Zeabur PostgreSQL（正式主庫）

| 項目 | 值 |
| --- | --- |
| 外網 Host | `43.163.196.8` |
| 外網 Port | `30756` |
| User | `root` |
| Database | `zeabur` |
| 密碼 | 見 `.env.staging`（或 Zeabur Dashboard → PostgreSQL → Connection） |
| 外網 Connection String | `postgresql://root:<password>@43.163.196.8:30756/zeabur` |

> **內網 URL**（Zeabur 後端服務間通訊，延遲最低）：由 Zeabur Dashboard 提供，格式為 `postgresql://root:<password>@<zeabur-internal-host>:5432/zeabur`，設定為後端服務的 `DATABASE_URL` 環境變數。

### DB 同步指令（Task 2b 參考，已完成）

```bash
# 1. 匯出 Supabase schema（public schema only）
pg_dump "postgresql://postgres:<pw>@db.fsrkhmnqmbbhwdsmacnn.supabase.co:5432/postgres" \
  --schema-only --schema=public -f supabase_schema.sql

# 2. 匯入 schema 至 Zeabur
psql "postgresql://root:<pw>@43.163.196.8:30756/zeabur" -f supabase_schema.sql

# 3. 匯出 Supabase 業務資料（public schema only，排除系統表）
pg_dump "postgresql://postgres:<pw>@db.fsrkhmnqmbbhwdsmacnn.supabase.co:5432/postgres" \
  --data-only --schema=public -f supabase_data.sql

# 4. 匯入資料至 Zeabur
psql "postgresql://root:<pw>@43.163.196.8:30756/zeabur" -f supabase_data.sql
```

## Open Questions

> 所有問題已解決，紀錄決策如下。

| 問題 | 決策 |
| --- | --- |
| staging 是否共用正式 Supabase？ | ❌ 不共用，staging 使用 Zeabur 內建 PostgreSQL（見 Decision 1b） |
| PWA `name` | **KJ Champion** |
| PWA `short_name` | **康九冠軍夥伴系統** |
| PWA `theme_color` | **`#D4AF37`**（奢華金） |
| `frontend/` 頁面移植優先順序 | 先移植月曆主頁（`index.html`）做 E2E 驗證，其餘分批 |
| LINE OAuth 回調 URL | 部署 Zeabur 後立即在 LINE Developer Console 新增（blocking 步驟） |
| 雙寫 SSL 問題 | backupPool 必須加 `ssl: { rejectUnauthorized: false }`，已修正（v1.5.2） |
