# 康九冠軍夥伴系統

> **版本 v2.5.0** | 分支：`main` | 部署：[kj-champion-system.pages.dev](https://kj-champion-system.pages.dev) | 更新：2026-06-21

專為團隊設計的行事曆與成員管理系統，整合 LINE Login、LINE Bot、Google Calendar 與 PostgreSQL。

> **舊 Vercel 網址已全站 301 轉址至 Cloudflare Pages**，團隊成員無需更改書籤。

---

## 部署架構（v2.1.0 起：Zeabur 雙專案物理隔離）

| 層級 | prod 環境 | dev 環境 |
|---|---|---|
| **前端** | Cloudflare Pages `kj-champion-system.pages.dev` | Cloudflare Pages `kjcs-dev.pages.dev`（preview） |
| **API Proxy** | `_worker.js` `resolveBackend()` 依 hostname 分流 | 同左 |
| **後端** | Zeabur `kj-champion` 專案 → `kj-champion-system.zeabur.app` | Zeabur `kj-champion-dev` 專案 → `kj-champion-dev.zeabur.app` |
| **DB** | `postgresql.zeabur.internal:5432`（**公網關閉**） | `postgresql.zeabur.internal:5432`（不同專案）+ 公網開放給 PC 維護 |
| **DB 連線** | 後端走內網 only | 後端走內網、PC 走公網（schema dump 等） |

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
| 行程管理 | 新增 / 編輯 / 刪除（同步 Google Calendar）— 詳情頁 FAB 含紅色刪除按鈕（v2.2.1） | admin / manager |
| 行程儲存 UX | FAB「確認/儲存」明確按鈕語意，必填欄位驗證，離開守衛防誤操作 | — |
| 成員管理 | 成員列表、詳情、角色設定 | admin / manager |
| 個人資料 | 查看與編輯個人資訊、同步 LINE 頭像 | 所有人 |
| 首次登入流程 | LINE OAuth 登入後強制 onboarding：用戶資料（4 欄全必填）→ 用戶數據（課程紀錄 ≥ 1 筆）→ 主應用 | 所有人 |
| 財務功能 | 上傳財務報表、選取/編輯模式（多選刪除/下載）、網頁預覽試算表 | manager |
| LINE Login | OAuth 2.0，後端動態偵測前端 origin 編入 OAuth state，callback 後 redirect 回原前端 | 所有人 |
| **側邊欄導覽**（v2.5.0） | 左側抽屜式 SidebarNav 整合舊 Header + FabNav；漢堡 FAB 左上固定，點擊展開 220px 寬抽屜；底部顯示用戶頭像 + 姓名（點擊進個人資料）；role=開發者 額外顯示開發者設定入口 | 所有人 |
| **每日行程推播 LINE Bot**（v2.2.0 後端 / v2.3.0 前端） | node-cron 每日定時（預設 21:00 Asia/Taipei）讀取隔日行程 → 依對象篩選 → 推送 Flex 字卡 | 推播：依 `daily_agenda_target` 設定 |
| **開發者設定頁** `/agenda-settings`（v2.3.0） | 推播啟用 toggle / 時間 picker / 對象下拉 / 立即推播按鈕；同頁含 Eruda 手機除錯面板開關 | 僅開發者 |
| **定時同步 Calendar**（v2.4.0） | node-cron 每分鐘自動同步 Google Calendar → 本地 DB，無須手動觸發；所有 Google API 改用 raw https.request（繞過 gaxios） | 後台自動 |
| PWA | 可安裝至手機桌面（Chrome / iOS Safari） | 所有人 |

---

## 環境變數

| 變數名稱 | 說明 | 必填 |
|---------|------|------|
| `LINE_CHANNEL_ID` | LINE Channel ID | 是 |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret | 是 |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE BOT Access Token（push messages 權限） | 是 |
| `DATABASE_URL` | Zeabur PostgreSQL 連線字串（後端走內網 `postgresql.zeabur.internal:5432`） | 是 |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google Service Account JSON（含 `token_uri`） | 是 |
| `GROUP_CALENDAR_ID` | 團體 Google Calendar ID | 是 |
| `FRONTEND_URL` | 前端公開網址（OAuth redirect fallback + Flex 字卡按鈕） | 是 |
| `APP_URL` | 後端公開網址 | 是 |
| `NODE_ENV` | 環境（`production` / `development`） | 是 |
| `CRON_SECRET` | 排程 API 驗證密鑰（保留給日後外部 trigger，目前 node-cron 不需） | 否 |

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

---

## 專案結構

```text
├── frontend/                    # 前端（React 19 + Vite 8 + Tailwind CSS 4 + PWA）
│   ├── public/
│   │   ├── _worker.js           # Cloudflare Worker（/api/* proxy + dev/prod 分流）
│   │   ├── favicon.svg
│   │   └── icons/               # PWA 圖示
│   ├── index.html               # Eruda inline loader + PWA meta
│   ├── src/
│   │   ├── App.jsx              # React Router 主入口 + ProtectedRoute + Layout 三層巢狀
│   │   ├── pages/               # 16 個頁面（Home / Calendar / AddEvent / EventDetail / Members / Profile / Financial / UserStats / Management / AgendaSettings 等）
│   │   ├── components/
│   │   │   ├── SidebarNav.jsx   # 左側抽屜導覽（v2.5.0，取代 Header + FabNav）
│   │   │   ├── Layout.jsx       # Outlet 包裹器，自動帶入 SidebarNav
│   │   │   ├── FabAction.jsx    # 右側浮動操作按鈕（各頁面獨立宣告）
│   │   │   └── ConfirmLeaveDialog.jsx
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
│   │   └── debug.js             # GET /api/debug/health 自檢端點（v2.4.0）
│   ├── services/
│   │   ├── calendarService.js   # Google Calendar CRUD（raw https.request）
│   │   ├── calendarSyncService.js
│   │   ├── eventDbService.js
│   │   ├── memberDbService.js
│   │   ├── lineService.js
│   │   └── agendaService.js
│   ├── scheduler/
│   │   ├── calendarSync.js      # node-cron 每分鐘同步（v2.4.0）
│   │   └── dailyAgenda.js       # node-cron 每日推播
│   ├── config/
│   │   ├── googleAuth.js        # JWT 自簽 + calendarApiRequest
│   │   ├── db.js
│   │   └── __tests__/           # Jest 後端單元測試
│   ├── middleware/
│   └── migrations/
├── scripts/
│   ├── diagnose-google-auth.js  # 6 步驟 Google Auth CLI 診斷
│   └── ...
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

### 後端（Zeabur）

- 連接 GitHub `main` branch，自動部署 Node.js 容器
- 設定環境變數（見上方環境變數表）
- 啟動時自動建 `system_settings` 表 + 啟動 calendar sync scheduler + 每日推播 scheduler

---

## UI 風格（Warm Minimal）

| 屬性 | 值 |
|------|------|
| 背景色 | `#F7F5F2` |
| 強調色 | `#4A7C59` |
| 文字色 | `#2C2C2C` |
| 圓角 | `rounded-xl` |
| 漢堡 FAB | 左上固定 `#2C2C2C` 黑（開啟側邊欄）；FabAction 右側 `#4A7C59` 綠（編輯模式紅 `#dc2626`） |

---

## 版本記錄

詳見 [CHANGELOG.md](./CHANGELOG.md)。

每版詳細上下文：[.claude/context/](./.claude/context/)。
