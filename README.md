# 康九冠軍夥伴系統

> **版本 v2.7.0** | 分支：`main` | 部署：[kj-champion-system.pages.dev](https://kj-champion-system.pages.dev) | 更新：2026-06-21

專為團隊設計的行事曆與成員管理系統，整合 LINE Login、LINE Bot、Google Calendar 與 PostgreSQL。

> **舊 Vercel 網址已全站 301 轉址至 Cloudflare Pages**，團隊成員無需更改書籤。

---

## 部署架構（v2.7.0：Zeabur 三 DB 架構）

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

→ **跨專案內網不通**：dev 任何錯誤 / 寫入都不會觸碰 prod DB。

### 請求流程

```
瀏覽器（React SPA）
  └─ /api/* → Cloudflare Worker (_worker.js) → Zeabur 後端（內網連線 PostgreSQL）
  └─ 靜態資源 → Cloudflare Pages（Vite build output）
```

### 前端路由分流（_worker.js）

`_worker.js` 的 `resolveBackend(hostname)`：

- `kjcs-dev.pages.dev`（含 preview 子網域）→ dev 後端
- 其他（含 `kj-champion-system.pages.dev` 與自訂網域）→ 正式後端

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
| **側邊欄導覽**（v2.5.0） | 左側抽屜式 SidebarNav；底部用戶頭像 + 姓名（進用戶資料）；role=開發者 顯示開發設定 | 所有人 |
| **每日行程推播**（v2.2.0） | node-cron 每日定時推送隔日行程 Flex 字卡到 LINE | 後台自動 |
| **開發者設定** `/agenda-settings` | 推播啟用 / 時間 / 對象 / 立即推播；Eruda 除錯面板開關 | 僅開發者 |
| **定時同步 Calendar**（v2.4.0） | node-cron 每分鐘自動同步 Google Calendar → 本地 DB；raw https.request 繞過 gaxios | 後台自動 |
| **備份 DB 定時同步**（v2.7.0） | node-cron 每 8 小時全量覆蓋 prod → backup DB（0/8/16 點台北時間） | 後台自動 |
| **Admin API**（v2.7.0） | `POST /api/admin/sync-prod-to-backup`（手動觸發）/ `POST /api/admin/sync-backup-to-dev`（備份→dev）/ `GET /api/admin/backup-status`（查筆數），Bearer token 保護 | ADMIN_SECRET |
| PWA | 可安裝至手機桌面（Chrome / iOS Safari） | 所有人 |

---

## 環境變數

| 變數名稱 | 說明 | 必填 |
|---------|------|------|
| `LINE_CHANNEL_ID` | LINE Channel ID | 是 |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret | 是 |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE BOT Access Token | 是 |
| `DATABASE_URL` | prod DB 內網連線字串（`postgresql.zeabur.internal:5432`） | 是 |
| `BACKUP_DATABASE_URL` | 備份 DB 內網連線字串（`postgresql-backup.zeabur.internal:5432`） | prod only |
| `DEV_DATABASE_URL` | dev DB 公網連線字串（admin sync-backup-to-dev API 用） | prod only |
| `ADMIN_SECRET` | Admin API Bearer token（32 字元以上） | prod only |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google Service Account JSON（含 `token_uri`） | 是 |
| `GROUP_CALENDAR_ID` | 團體 Google Calendar ID | 是 |
| `FRONTEND_URL` | 前端公開網址 | 是 |
| `APP_URL` | 後端公開網址 | 是 |
| `NODE_ENV` | 環境（`production` / `development`） | 是 |

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

### DB Schema 初始化腳本

```powershell
# 新 DB 初始化（需先開公網）
$env:TARGET_DB_URL="postgresql://root:<password>@<host>:<port>/zeabur"; node scripts/init-db.js
```

---

## 專案結構

```text
├── frontend/                    # 前端（React 19 + Vite 8 + Tailwind CSS 4 + PWA）
│   ├── public/
│   │   ├── _worker.js           # Cloudflare Worker（/api/* proxy + dev/prod 分流）
│   │   ├── favicon.svg
│   │   └── icons/               # PWA 圖示
│   ├── src/
│   │   ├── App.jsx              # React Router + ProtectedRoute + Layout 三層巢狀
│   │   ├── pages/               # 15 個活躍頁面
│   │   ├── components/
│   │   │   ├── SidebarNav.jsx   # 左側抽屜導覽（v2.5.0）
│   │   │   ├── Layout.jsx       # Outlet 包裹器
│   │   │   └── FabAction.jsx    # 浮動操作按鈕
│   │   ├── contexts/AuthContext.jsx
│   │   ├── services/api.js
│   │   └── utils/shareEvent.js
│   └── vite.config.js
├── server/                      # 後端（Express + Node.js）
│   ├── server.js                # 主入口 + migration + schedulers 啟停
│   ├── routes/
│   │   ├── auth.js              # LINE OAuth
│   │   ├── calendar.js          # 行事曆 CRUD
│   │   ├── member.js            # 成員管理
│   │   ├── profile.js           # 個人資料 + sync-avatar
│   │   ├── line.js              # LINE BOT + 每日推播 API
│   │   ├── financial.js         # 財務（限 manager）
│   │   ├── debug.js             # GET /api/debug/health 自檢
│   │   └── admin.js             # Admin API（Bearer token，v2.7.0）
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
│   ├── init-db.js               # DB schema 初始化（v2.7.0）
│   └── diagnose-google-auth.js
├── openspec/                    # OpenSpec 功能規格
├── jest.config.js
├── .claude/                     # Claude Code 規則 + context
├── CHANGELOG.md
├── CLAUDE.md
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

---

## UI 風格（Warm Minimal）

| 屬性 | 值 |
|------|------|
| 背景色 | `#F7F5F2` |
| 強調色 | `#4A7C59` |
| 文字色 | `#2C2C2C` |
| Pill tab | container `#EFEDE9` / active `#4A7C59` 白字 / inactive `#8A8680` 透明底 |
| 漢堡 FAB | 左上固定黑（開側邊欄）；FabAction 右側綠（編輯模式紅） |

---

## 版本記錄

詳見 [CHANGELOG.md](./CHANGELOG.md)。每版詳細上下文：[.claude/context/](./.claude/context/)。
