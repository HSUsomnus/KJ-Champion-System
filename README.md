# 康九冠軍夥伴系統

> **版本 v2.3.0** | 分支：`main` | 部署：[kj-champion-system.pages.dev](https://kj-champion-system.pages.dev) | 更新：2026-04-26

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
  └─ /api/* → Cloudflare Worker (_worker.js) → Zeabur 後端 (內網連線 PostgreSQL)
  └─ 靜態資源 → Cloudflare Pages (Vite build output)
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
| 行程儲存 UX | FAB「確認/儲存」明確按鈕語意，必填欄位 alert 提示，離開守衛使用 ref 避免時序競態（v2.0.4） | — |
| 成員管理 | 成員列表、詳情、角色設定 | admin / manager |
| 個人資料 | 查看與編輯個人資訊、同步 LINE 頭像 | 所有人 |
| 首次登入流程 | LINE OAuth 登入後強制 onboarding：用戶資料（4 欄全必填）→ 用戶數據（課程紀錄 ≥ 1 筆）→ 主應用，未完成不得進其他頁（v2.0.5 / v2.0.6 / v2.0.7 / v2.0.8 四修補完成） | 所有人 |
| 財務功能 | 上傳財務報表、選取/編輯模式（多選刪除/下載）、網頁預覽試算表 | manager |
| LINE Login | OAuth 2.0，後端動態偵測前端 origin 編入 OAuth state，callback 後 redirect 回原前端 | 所有人 |
| **每日行程推播 LINE Bot**（v2.2.0 後端 / v2.3.0 前端） | node-cron 每日定時（預設 21:00 Asia/Taipei）讀取隔日行程 → 依對象（all / manager_above / developer）篩選 → 推送 Flex 字卡（Warm Minimal 風格、event row 卡片化、可點進前端詳情） | 推播：依 `daily_agenda_target` 設定 |
| **開發者設定頁** `/agenda-settings`（v2.3.0 新增） | 推播啟用 toggle / 時間 picker / 對象下拉 / 立即推播按鈕；同頁含 Eruda 手機除錯面板開關 | 僅開發者 |
| PWA | 可安裝至手機桌面（v2.3.0 補 `mobile-web-app-capable` meta，Chrome / iOS Safari 雙吃） | 所有人 |

---

## 環境變數

| 變數名稱 | 說明 | 必填 |
|---------|------|------|
| `LINE_CHANNEL_ID` | LINE Channel ID | 是 |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret | 是 |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE BOT Access Token（含 push messages 權限，每日推播必需） | 是 |
| `DATABASE_URL` | Zeabur PostgreSQL 連線字串（後端走內網 `postgresql.zeabur.internal:5432`） | 是 |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google Service Account JSON | 是 |
| `GROUP_CALENDAR_ID` | 團體 Google Calendar ID | 是 |
| `FRONTEND_URL` | 前端公開網址（OAuth redirect fallback + Flex 字卡按鈕指回前端） | 是 |
| `APP_URL` | 後端公開網址 | 是 |
| `NODE_ENV` | 環境（`production` / `development`） | 是 |
| `CRON_SECRET` | 排程 API 驗證密鑰（保留給日後外部 trigger 使用，目前 node-cron 內排不需） | 否 |

---

## 每日行程推播（v2.2.0 新增）

### 排程行為

- **時區**：固定 `Asia/Taipei`（由 `node-cron` `timezone` 選項保證，不受容器 TZ 影響）
- **預設時間**：21:00（首次 boot 從 `system_settings` 寫入預設）
- **預設對象**：`developer`（首次 boot 預設值）
- **可調整三個值**：透過 API 或直改 `system_settings` 表（`daily_agenda_time` / `daily_agenda_enabled` / `daily_agenda_target`）

### API（僅開發者，需 LINE userId 認證）

| Method | Path | 說明 |
|---|---|---|
| `GET` | `/api/line/agenda-settings` | 讀取目前設定 |
| `PUT` | `/api/line/agenda-settings` | 更新（body: `{time?, enabled?, target?}`，自動觸發 scheduler 重排） |
| `POST` | `/api/line/push-daily-agenda` | 手動觸發推播（測試用） |

### Flex 字卡設計

- Warm Minimal 風格，無 emoji
- Header `#4A7C59` accent 底白字日期
- Body `#F7F5F2` 米白底，每個 event 為 `#FFFFFF` 白底卡片（邊框 + 圓角 + padding）
- Event row 點擊 → `${FRONTEND_URL}/event/${id}`
- Footer「開啟行事曆」按鈕 → `${FRONTEND_URL}/calendar`

---

## 開發者設定頁（v2.3.0 新增）

路徑：`/agenda-settings` — 僅 `role === '開發者'` 可進入。FabNav 左下黑色按鈕展開後，最上方齒輪 icon 即入口。

### 三大區塊

| 區塊 | 內容 |
|---|---|
| 除錯工具 | Eruda 手機除錯面板 toggle（讀寫 `localStorage.erudaEnabled`，重整後生效） |
| 每日行程推播 | 啟用 toggle / 推播時間 picker（HH:MM）/ 對象下拉（all / manager_above / developer）/「儲存設定」按鈕 |
| 測試 | 「立即推播」按鈕 — 不受時間設定影響，直接以當前對象推播一次（手動驗證用） |

### 權限控制（雙重防護）

- 前端：`AgendaSettings.jsx` 檢查 `user?.role === '開發者'`，否則顯示「無存取權限」+「回首頁」
- 後端：`requireDeveloper` middleware 驗證 LINE userId 對應 member 的 `role` 欄位，非開發者直接 403

### Eruda 載入策略

`frontend/index.html` inline script 在頁面載入時檢查兩條件，**任一**為真即從 `cdn.jsdelivr.net/npm/eruda` 載入：

1. URL `?eruda=1`（急救：手機現場 debug 不用先進設定頁）
2. `localStorage.erudaEnabled === 'true'`（常駐：在設定頁切 toggle 後每次開都載）

---

## 本機開發

### 後端

```bash
npm install
npm run dev
# 後端啟動於 http://localhost:8080
# 啟動時自動建 system_settings 表 + 啟動每日推播 scheduler
```

### 前端

```bash
cd frontend
npm install
npm run dev
# 前端啟動於 http://localhost:5173（Vite dev server）
```

開發模式測試登入：URL 帶 `?dev=1` 自動模擬 LINE 登入。
測試前先清 Service Worker（DevTools → Application → Service Workers → Unregister），避免舊 PWA 快取干擾。

---

## 專案結構

```text
├── frontend/                    # 前端（React 18 + Vite 5 + Tailwind CSS）
│   ├── public/
│   │   ├── _worker.js           # Cloudflare Worker（/api/* proxy + dev/prod 分流）
│   │   ├── favicon.svg
│   │   ├── icons.svg
│   │   └── icons/               # PWA 圖示（icon-192 / icon-512）
│   ├── index.html               # Eruda inline loader（v2.3.0）+ apple-mobile-web-app-capable / mobile-web-app-capable meta
│   ├── src/
│   │   ├── App.jsx              # React Router 主入口（含 ProtectedRoute auth guard）+ /agenda-settings 路由
│   │   ├── main.jsx             # Vite 進入點
│   │   ├── pages/               # 頁面元件（Home / Calendar / AddEvent / EventDetail / Members / Profile / Financial / UserStats / AgendaSettings v2.3.0 等）
│   │   ├── components/          # Header / FabNav（含開發者入口 v2.3.0）/ FabAction / ConfirmLeaveDialog
│   │   ├── contexts/AuthContext.jsx
│   │   ├── services/api.js      # 含 v2.3.0 推播設定 3 個 API 方法
│   │   └── utils/shareEvent.js
│   ├── vite.config.js
│   └── package.json
├── server/                      # 後端
│   ├── server.js                # Express 主入口 + system_settings auto-migration + scheduler 啟停
│   ├── routes/
│   │   ├── auth.js              # LINE OAuth（含動態 origin 偵測 + 白名單）
│   │   ├── calendar.js          # 行事曆 CRUD（同步 Google Calendar）
│   │   ├── member.js            # 成員管理
│   │   ├── profile.js           # 個人資料 + sync-avatar
│   │   ├── line.js              # LINE BOT 整合（含 v2.2.0 每日推播 3 個 API）
│   │   └── financial.js         # 財務（限 manager）
│   ├── services/
│   │   ├── calendarService.js
│   │   ├── eventDbService.js
│   │   ├── memberDbService.js
│   │   ├── lineService.js       # 含 v2.2.0 generateDailyAgendaFlexMessage()
│   │   └── agendaService.js     # v2.2.0 — 推播主流程 + 設定讀寫
│   ├── scheduler/
│   │   └── dailyAgenda.js       # v2.2.0 — node-cron 排程器（Asia/Taipei，動態重排）
│   ├── config/                  # DB（pg pool）、Google Auth、LINE 設定
│   ├── middleware/              # auth middleware
│   └── migrations/              # SQL migrations
├── openspec/                    # OpenSpec 功能規格文件（含 STATUS.md 路線圖）
├── scripts/                     # 工具腳本（seed、sync、backup、migration、smoke test、v2.3.0 dev seed for agenda）
├── api/                         # （legacy）Vercel serverless 入口（已轉址，保留供回滾）
├── database/                    # （legacy）Supabase 時期 SQL 腳本
├── .claude/                     # Claude Code 規則 + context
├── CHANGELOG.md                 # 版本記錄
├── CLAUDE.md                    # Claude Code 對話啟動規則 + 工作流摘要
└── package.json                 # 後端 dependencies（含 node-cron）
```

---

## 部署

### 前端（Cloudflare Pages）

- 連接 GitHub `main` branch，自動部署
- Build command：`cd frontend && npm install && npm run build`
- Output directory：`frontend/dist`
- `_worker.js` 自動被 Cloudflare Pages 載入為 Advanced Mode Worker

### 後端（Zeabur）

- 連接 GitHub `main` branch，自動部署 Node.js 容器
- 設定環境變數（見上方環境變數表）
- 啟動時自動建 `system_settings` 表（idempotent）+ 啟動每日推播 scheduler

---

## UI 風格（Warm Minimal）

| 屬性 | 值 |
|------|------|
| 背景色 | `#F7F5F2` |
| 強調色 | `#4A7C59` |
| 文字色 | `#2C2C2C` |
| 圓角 | `rounded-xl` |
| FAB 顏色 | 左下 `#2C2C2C` 黑、右下 `#4A7C59` 綠（編輯模式紅 `#dc2626`，文字統一「確認/儲存」） |

---

## 版本記錄

詳見 [CHANGELOG.md](./CHANGELOG.md)。

每版詳細上下文：[.claude/context/](./.claude/context/)。
