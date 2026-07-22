# 康九冠軍夥伴系統

> **版本 v2.12.0** | 分支：`main` | 部署：[kj-champion-system.pages.dev](https://kj-champion-system.pages.dev) | 更新：2026-07-10

專為團隊設計的行事曆與成員管理系統，整合 LINE Login、LINE Bot、Google Calendar 與 PostgreSQL。

> **舊 Vercel 網址已全站 301 轉址至 Cloudflare Pages**，團隊成員無需更改書籤。

---

## 部署架構（v2.8.0：Zeabur 三 DB 架構）

| 層級 | prod 環境 | dev 環境 |
|---|---|---|
| **前端** | Cloudflare Pages `kj-champion-system.pages.dev` | Cloudflare Pages `kjcs-dev.pages.dev`（preview） |
| **API Proxy** | `_worker.js` `resolveBackend()` 依 hostname 分流 | 同左 |
| **後端** | Zeabur `kj-champion` 專案 → `kj-champion-system.zeabur.app` | Zeabur `kj-champion-dev` 專案 → `kj-champion-dev.zeabur.app` |
| **prod DB** | `postgresql.zeabur.internal:5432`（**公網關閉**） | — |
| **備份 DB** | `postgresql-backup.zeabur.internal:5432`（**公網關閉**） | — |
| **dev DB** | `postgresql-dev`（kj-champion 專案內，**公網開放**，供 dev 後端跨專案連線） | dev 後端走公網連 dev DB |

### Zeabur DB 分佈

```
kj-champion 專案（prod）
  ├── postgresql          ← prod DB（內網 only）
  ├── postgresql-backup   ← 備份 DB（內網 only，每 8 小時從 prod 全量覆蓋）
  └── postgresql-dev      ← dev DB（公網開放，供 kj-champion-dev 後端連線）

kj-champion-dev 專案（dev 後端）
  └── kj-champion-dev     ← dev 後端（從 dev branch 部署）→ 連 dev DB 公網
```

→ **跨專案內網不通**：dev 任何錯誤 / 寫入都不會物理觸碰 prod DB。

### 請求流程

```
瀏覽器（React SPA）
  └─ /api/* → Cloudflare Worker (_worker.js) → Zeabur 後端（內網連線 PostgreSQL）
  └─ /survey-api/* → Cloudflare Worker (_worker.js) → kj-survey-server（獨立 Zeabur 服務，見下）
  └─ 靜態資源 → Cloudflare Pages（Vite build output），找不到（404）→ SPA fallback 到 index.html
```

### KJ Survey 子系統（change 20）

團隊調查表單系統是**獨立後端服務**（`kj-survey-server/`），與主系統共用 DB 但自成一組 Express app、自己的 LINE OAuth Channel、自己的 `package.json`：

| 層級 | 說明 |
|---|---|
| 前端路由 | `/f/:token`（前台填表，`SurveyFill.jsx`）、`/admin`（後台，`SurveyAdmin.jsx`），皆掛在同一個 Cloudflare Pages 站台 |
| Proxy | `_worker.js` 攔截 `/survey-api/*` → 去除前綴 → 轉發到 `kj-survey-server`（含 `/survey-api/admin-auth/*` 子路徑） |
| 後端服務 | 獨立 Zeabur 服務（prod：`kj-survey.zeabur.app`；dev：`kj-survey-dev.zeabur.app`，實際網址依 Zeabur 服務建立結果為準，見 `_worker.js` 頂部常數） |
| 資料庫 | 沿用主系統既有 DB（不建新 DB），schema 見 `kj-survey-server/migrations/001_init_survey_tables.sql` |
| 後台認證 | 自製 LINE OAuth（獨立 Channel）+ 自簽 JWT（`Authorization: Bearer`，記憶體存，不落地 cookie/localStorage） |

詳細規格見 [`changes/20-團隊調查表單系統/spec.md`](./changes/20-團隊調查表單系統/spec.md)。

---

## 主要功能

| 功能 | 說明 | 角色限制 |
|------|------|---------|
| 月曆視圖 | 團體行事曆，依事件類型標色 | 所有人 |
| 行程列表 | 清單模式瀏覽行程 | 所有人 |
| 行程管理 | 新增 / 編輯 / 刪除（同步 Google Calendar） | admin / manager |
| 成員管理 | 成員列表、詳情（pill tabs：成員資料 / 用戶數據 / 用戶財力）、角色設定 | admin / manager |
| **用戶資料**（v2.6.0） | `/profile` 三 tab 整合頁：個人資料 / 用戶數據 / 用戶財力；pill tab 切換；各 tab FabAction 獨立 | 所有人 |
| 首次登入流程 | LINE OAuth 後強制 onboarding：用戶資料（4 欄全必填）→ 用戶數據（課程紀錄 ≥ 1 筆）→ 主應用 | 所有人 |
| 財務功能 | 上傳財務報表、選取/編輯模式、網頁預覽試算表；`/financial?userId=xxx` 查看他人 | manager |
| LINE Login | OAuth 2.0，不依賴 LIFF SDK | 所有人 |
| **側邊欄導覽**（v2.8.0） | 左側抽屜式 SidebarNav；頂部 logo + 品牌文字「康九冠軍」；管理者後台入口（role ≠ 一般人）；底部用戶頭像 + 姓名；role=開發者 顯示開發設定 | 所有人 |
| **管理者後台**（v2.8.0） | `/management`：成員角色管理（負責人或開發者可操作）、pill tab 介面；SidebarNav 直接導覽 | 負責人 / 開發者 |
| **每日行程推播**（v2.2.0） | node-cron 每日定時推送隔日行程 Flex 字卡到 LINE | 後台自動 |
| **開發者設定** `/agenda-settings` | 推播啟用 / 時間 / 對象 / 立即推播；Eruda 除錯面板開關 | 僅開發者 |
| **定時同步 Calendar**（v2.4.0） | node-cron 每分鐘自動同步 Google Calendar → 本地 DB；raw https.request 繞過 gaxios | 後台自動 |
| **備份 DB 定時同步**（v2.7.0） | node-cron 每 8 小時全量覆蓋 prod → backup DB（0/8/16 點台北時間） | 後台自動 |
| **Admin API**（v2.8.0） | `POST /api/admin/sync-prod-to-backup`（手動觸發）/ `GET /api/admin/export-backup-csv?table=xxx`（backup→CSV 下載）/ `GET /api/admin/backup-status`（查筆數），Bearer token 保護 | ADMIN_SECRET |
| **桌機版面置中**（v2.9.0） | 桌機橫式螢幕以手機直式欄框居中；欄寬依視窗高度從標準比例反推（~430px）；手機直接全寬零回歸 | 所有人 |
| **主頁快捷資訊**（v2.10.0） | 歡迎卡整合財力金額（空值顯示「尚未填寫」）與「上傳財力」按鈕；系統連結區三個圖示方塊（LINE 事業部小幫手、康九冠軍 google 日曆、安裝到手機/PC）；PWA 安裝依狀態彈出 dialog | 所有人 |
| PWA | 可安裝至手機桌面（Chrome / iOS Safari）；安裝按鈕依狀態提示（已安裝 / 不支援瀏覽器） | 所有人 |
| **團隊調查表單系統**（change 20，`kj-survey-server` 獨立後端） | `/f/:token` 前台填表（送出濫用防護 + 欄位驗證）；`/admin` 後台：Table 1 篩選、未填名冊（依推薦人分組）、CSV/xlsx 匯出、表單建立器（欄位編輯 + 預覽 + 發佈 + 分享連結） | 前台：任何人（需連結）；後台：kj-survey-server 自建 LINE OAuth 白名單角色 |

---

## 環境變數

| 變數名稱 | 說明 | 必填 |
|---------|------|------|
| `LINE_CHANNEL_ID` | LINE Channel ID | 是 |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret | 是 |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE BOT Access Token | 是 |
| `DATABASE_URL` | prod DB 內網連線字串（`postgresql.zeabur.internal:5432`） | 是 |
| `BACKUP_DATABASE_URL` | 備份 DB 內網連線字串（`postgresql-backup.zeabur.internal:5432`） | prod only |
| `DEV_DATABASE_URL` | dev DB 公網連線字串（export-backup-csv + init-db 用） | prod only |
| `ADMIN_SECRET` | Admin API Bearer token（32 字元以上） | prod only |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google Service Account JSON（含 `token_uri`） | 是 |
| `GROUP_CALENDAR_ID` | 團體 Google Calendar ID | 是 |
| `FRONTEND_URL` | 前端公開網址 | 是 |
| `APP_URL` | 後端公開網址 | 是 |
| `NODE_ENV` | 環境（`production` / `development`） | 是 |

### `kj-survey-server`（獨立服務，自己的 `.env`，見 `kj-survey-server/.env.example`）

| 變數名稱 | 說明 | 必填 |
|---------|------|------|
| `DATABASE_URL` | 共用主系統既有 DB（不建新 DB）；本機/dev 填 dev DB 公網連線字串，prod 填內網連線字串 | 是 |
| `PORT` | 服務埠（本機預設 8081） | 否 |
| `LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET` | 後台登入用 LINE Channel（獨立於主系統 Channel） | 是 |
| `APP_URL` | 本服務對外網址（組 callback/redirect_uri 用，不含結尾斜線） | 是 |
| `FRONTEND_URL` | 前端網址（OAuth 成功/失敗導轉目的地，不含結尾斜線） | 是 |
| `SESSION_SECRET` | state HMAC 簽章 + JWT 簽發用強隨機密鑰 | 是 |

---

## 本機開發

### 後端

```bash
npm install
npm run dev
# 後端啟動於 http://localhost:8080
npm test            # Jest 後端單元測試（28 個 test）
npm run diagnose    # Google Auth 6 步驟 CLI 診斷
```

### 前端

```bash
npm --prefix frontend install
npm --prefix frontend run dev
# 前端啟動於 http://localhost:5173
```

開發模式測試登入：URL 帶 `?dev=1` 自動模擬 LINE 登入。
測試前先清 Service Worker（DevTools → Application → Service Workers → Unregister）。

```bash
npm --prefix frontend run test:run   # vitest 全部
npm --prefix frontend run test:e2e   # playwright e2e
```

### KJ Survey 獨立後端（`kj-survey-server/`）

```bash
npm --prefix kj-survey-server install
cp kj-survey-server/.env.example kj-survey-server/.env   # 填入實際值
npm --prefix kj-survey-server run dev
# 服務啟動於 http://localhost:8081
npm --prefix kj-survey-server test   # Jest 單元測試
```

前端本機測試 `/f/:token`、`/admin` 時，需另外設定 Vite proxy 或直接打 `http://localhost:8081`，
正式環境則透過 `_worker.js` 的 `/survey-api/*` 轉發，不需前端額外設定。

### DB Schema 初始化腳本

```powershell
# 新 DB 初始化（需先開公網）
$env:TARGET_DB_URL="postgresql://root:<password>@<host>:<port>/zeabur"; node scripts/init-db.js
```

### 手動複製 Backup DB → Dev DB

```
1. GET https://kj-champion-system.zeabur.app/api/admin/export-backup-csv?table=members
   Header: Authorization: Bearer <ADMIN_SECRET>
   → 下載 members-backup-YYYY-MM-DD.csv

2. 放到 scripts/csv-export/members.csv

3. DEV_DATABASE_URL="postgresql://..." node scripts/import-csv-to-dev.js members
```

---

## 專案結構

```text
├── frontend/                    # 前端（React 19 + Vite 8 + Tailwind CSS 4 + PWA）
│   ├── public/
│   │   ├── _worker.js           # Cloudflare Worker（/api/* proxy + /survey-api/* proxy + dev/prod 分流 + SPA fallback）
│   │   ├── favicon.svg
│   │   └── icons/               # PWA 圖示
│   ├── src/
│   │   ├── main.jsx             # pickColWidth() 設定欄寬變數；預攔截 beforeinstallprompt 存 window.__pwaInstallPrompt
│   │   ├── App.jsx              # React Router + ProtectedRoute + Layout 三層巢狀（含 /f/:token、/admin）
│   │   ├── pages/               # 15 個活躍頁面
│   │   │   └── survey/          # KJ Survey 子系統（change 20）
│   │   │       ├── SurveyFill.jsx        # 前台填表（/f/:token）
│   │   │       ├── SurveyAdmin.jsx       # 後台主頁（/admin）
│   │   │       ├── FormFieldsPreview.jsx # 欄位渲染（填表 + 建立器預覽共用，含 readOnly 模式）
│   │   │       └── admin/                # FormsSidebar / SubmissionsTable / AttendanceRoster / ExportButtons / FormBuilder
│   │   ├── components/
│   │   │   ├── SidebarNav.jsx   # 左側抽屜導覽（漢堡按鈕對齊欄左緣）
│   │   │   ├── Layout.jsx       # Outlet 置中欄包裹器（width:100% + maxWidth:--col-max-w）
│   │   │   └── FabAction.jsx    # 浮動操作按鈕（right 對齊欄右緣）
│   │   ├── contexts/AuthContext.jsx
│   │   ├── services/
│   │   │   ├── api.js           # 主系統 API 呼叫層
│   │   │   └── surveyApi.js     # KJ Survey 獨立 API 呼叫層（/survey-api/*）
│   │   └── utils/shareEvent.js
│   └── vite.config.js
├── kj-survey-server/             # KJ Survey 獨立後端（change 20，自己的 package.json + DB 連線設定）
│   ├── server.js                 # 主入口（/health、/forms、/members、/admin-auth、/admin）
│   ├── routes/                   # forms.js（前台）/ members.js / adminAuth.js（LINE OAuth）/ admin.js（後台 CRUD+匯出+建立器）/ health.js
│   ├── services/                 # formService.js / attendanceService.js / exportService.js / adminAuthService.js
│   ├── middleware/                # requireAdminSession.js / asyncHandler.js / errorHandler.js
│   ├── migrations/001_init_survey_tables.sql
│   └── .env.example
├── server/                      # 後端（Express + Node.js）
│   ├── server.js                # 主入口 + migration + schedulers 啟停
│   ├── routes/
│   │   ├── auth.js              # LINE OAuth
│   │   ├── calendar.js          # 行事曆 CRUD
│   │   ├── member.js            # 成員管理（update-roles：負責人或開發者可操作）
│   │   ├── profile.js           # 個人資料 + sync-avatar
│   │   ├── line.js              # LINE BOT + 每日推播 API
│   │   ├── financial.js         # 財務（限 manager）
│   │   ├── debug.js             # GET /api/debug/health 自檢
│   │   └── admin.js             # Admin API（Bearer token，v2.8.0）
│   ├── services/
│   │   ├── calendarService.js
│   │   ├── calendarSyncService.js
│   │   ├── eventDbService.js
│   │   ├── memberDbService.js
│   │   ├── lineService.js
│   │   ├── agendaService.js
│   │   └── backupSyncService.js # prod → backup 全量覆蓋（v2.7.0）
│   ├── scheduler/
│   │   ├── calendarSync.js      # 每分鐘同步（v2.4.0）
│   │   ├── dailyAgenda.js       # 每日推播
│   │   └── backupSync.js        # 每 8 小時備份（v2.7.0）
│   └── config/
│       ├── googleAuth.js
│       └── db.js
├── scripts/
│   ├── init-db.js               # DB schema 初始化
│   ├── import-csv-to-dev.js     # CSV → dev DB UPSERT 工具（v2.8.0）
│   ├── sync-branches.sh         # main → 全 m_b_* 分支同步唯一事實來源（v2.11.0）
│   └── diagnose-google-auth.js
├── changes/                      # 功能規格（spec.md + tasks.md，change 編號遞增）
├── docs/                         # 業務邏輯 / debug 經驗參考文件
│   └── archive/                  # 已淘汰技術棧文件歸檔（Vercel/Supabase/ngrok/LIFF，v2.11.0）
├── jest.config.js
├── .claude/                     # Claude Code 規則體系（v2.11.0 起 Skill 化）
│   ├── skills/                  # uidesign / deploy-release / database / workflow 四個 skill
│   ├── hooks/                   # git-guard（deny 硬攔截）/ post-push-sync / rules-injector
│   ├── commands/                # slash command
│   ├── context/                 # 每版詳細上下文 vX.Y.Z.md
│   ├── now.md                   # 動態狀態（地雷 + 環境特殊狀態）
│   └── CHANGELOG.md             # 版本索引（近 5 版全文，其餘一行索引）
├── CLAUDE.md                    # 對話啟動規則 + 鐵律 + Skill 索引
└── package.json
```

---

## 部署

### 前端（Cloudflare Pages）

- 連接 GitHub `main` branch，自動部署
- Build command：`cd frontend && npm install && npm run build`
- Output directory：`frontend/dist`

### 後端（Zeabur — kj-champion 專案）

- 連接 GitHub `main` branch，自動部署 Node.js 容器
- 啟動時自動執行 migration + 啟動 3 個排程（calendarSync / dailyAgenda / backupSync）
- 必填環境變數：`DATABASE_URL`、`BACKUP_DATABASE_URL`、`DEV_DATABASE_URL`、`ADMIN_SECRET`

### KJ Survey 後端（Zeabur — 獨立服務，`kj-survey-server/`）

- 與主後端**分開的 Zeabur 服務**（不同 Root Directory），Root Directory 設為 `kj-survey-server/`
- Start command：`npm start`（`node server.js`）
- 必填環境變數：見上方「`kj-survey-server`（獨立服務）」環境變數表
- LINE Developers Console 需另外登記此服務專用的 callback URL：`{FRONTEND_URL}/survey-api/admin-auth/line-callback`

---

## UI 風格（Warm Minimal）

| 屬性 | 值 |
|------|------|
| 背景色 | `#F7F5F2` |
| 強調色 | `#4A7C59` |
| 文字色 | `#2C2C2C` |
| Pill tab | container `#EFEDE9` / active `#4A7C59` 白字 / inactive `#2C2C2C` 透明底 |
| 漢堡 FAB | 左上固定黑（開側邊欄）；FabAction 右側綠（編輯模式紅） |
| 桌機版面 | 手機直式欄框（~430px）居中，兩側 `#F7F5F2` 留白 |

---

## 版本記錄

詳見 [.claude/CHANGELOG.md](./.claude/CHANGELOG.md)（近 5 版全文，更早版本一行索引）。每版詳細上下文：[.claude/context/](./.claude/context/)。
