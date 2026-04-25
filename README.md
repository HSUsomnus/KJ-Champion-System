# 康九冠軍夥伴系統

> **版本 v2.0.8** | 分支：`main` | 部署：[kj-champion-system.pages.dev](https://kj-champion-system.pages.dev) | 更新：2026-04-25

專為團隊設計的行事曆與成員管理系統，整合 LINE Login、Google Calendar 與 PostgreSQL。

> **舊 Vercel 網址已全站 301 轉址至 Cloudflare Pages**，團隊成員無需更改書籤。

---

## 部署架構

| 層級 | 技術 | 服務 |
|------|------|------|
| 前端 | React 18 + Vite 5 + Tailwind CSS（`frontend/`） | Cloudflare Pages（`kj-champion-system.pages.dev`） |
| API Proxy | Cloudflare Worker（`frontend/public/_worker.js`） | 攔截 `/api/*` 依 Pages hostname 自動 proxy 至 prod / dev 後端 |
| 後端 | Node.js + Express.js（`server/`） | Zeabur（`kj-champion-system.zeabur.app`） |
| 資料庫 | PostgreSQL | Zeabur PostgreSQL |

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
| 行程管理 | 新增 / 編輯 / 刪除（同步 Google Calendar） | admin / manager |
| 行程儲存 UX | FAB「確認/儲存」明確按鈕語意，必填欄位 alert 提示，離開守衛使用 ref 避免時序競態（v2.0.4） | — |
| 成員管理 | 成員列表、詳情、角色設定 | admin / manager |
| 個人資料 | 查看與編輯個人資訊、同步 LINE 頭像 | 所有人 |
| 首次登入流程 | LINE OAuth 登入後強制 onboarding：用戶資料（4 欄全必填）→ 用戶數據（課程紀錄 ≥ 1 筆）→ 主應用，未完成不得進其他頁（v2.0.5 / v2.0.6 / v2.0.7 / v2.0.8 四修補完成） | 所有人 |
| 財務功能 | 上傳財務報表、選取/編輯模式（多選刪除/下載）、網頁預覽試算表 | manager |
| LINE Login | OAuth 2.0，後端動態偵測前端 origin 編入 OAuth state，callback 後 redirect 回原前端 | 所有人 |
| PWA | 可安裝至手機桌面（Vite PWA Plugin） | 所有人 |

---

## 環境變數

| 變數名稱 | 說明 | 必填 |
|---------|------|------|
| `LINE_CHANNEL_ID` | LINE Channel ID | 是 |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret | 是 |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE BOT Access Token | 是 |
| `DATABASE_URL` | Zeabur PostgreSQL 連線字串（後端走內網 `postgresql.zeabur.internal:5432`） | 是 |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google Service Account JSON | 是 |
| `GROUP_CALENDAR_ID` | 團體 Google Calendar ID | 是 |
| `FRONTEND_URL` | 前端公開網址（OAuth redirect fallback） | 是 |
| `APP_URL` | 後端公開網址 | 是 |
| `NODE_ENV` | 環境（`production` / `development`） | 是 |
| `CRON_SECRET` | 排程 API 驗證密鑰 | 是 |

---

## 本機開發

### 後端

```bash
npm install
npm run dev
# 後端啟動於 http://localhost:8080
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
│   ├── src/
│   │   ├── App.jsx              # React Router 主入口（含 ProtectedRoute auth guard）
│   │   ├── main.jsx             # Vite 進入點
│   │   ├── pages/               # 頁面元件
│   │   │   ├── Home.jsx
│   │   │   ├── Calendar.jsx
│   │   │   ├── AddEvent.jsx
│   │   │   ├── EventDetail.jsx
│   │   │   ├── Members.jsx
│   │   │   ├── MemberDetail.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── ProfileEdit.jsx
│   │   │   ├── Management.jsx
│   │   │   ├── Financial.jsx           # 財力主頁（選取 / 編輯模式 + 離開守衛）
│   │   │   ├── FinancialEdit.jsx       # 財力編輯（單筆）
│   │   │   ├── FinancialUpload.jsx     # 財力上傳
│   │   │   ├── FinancialPreview.jsx    # 試算表網頁預覽
│   │   │   ├── Login.jsx               # 登入頁（含首次登入引導）
│   │   │   ├── UserStats.jsx
│   │   │   └── UserStatsEdit.jsx
│   │   ├── components/          # 共用元件
│   │   │   ├── Header.jsx
│   │   │   ├── FabNav.jsx              # 左下黑色導覽 FAB
│   │   │   ├── FabAction.jsx           # 右下綠色行動 FAB（編輯模式紅色）
│   │   │   └── ConfirmLeaveDialog.jsx  # 離開守衛 + useLeaveGuard hook（useRef 版本）
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   └── utils/
│   │       └── shareEvent.js
│   ├── vite.config.js           # Vite + PWA 設定
│   └── package.json
├── server/                      # 後端
│   ├── server.js                # Express 主入口
│   ├── routes/
│   │   ├── auth.js              # LINE OAuth（含動態 origin 偵測 + 白名單）
│   │   ├── calendar.js          # 行事曆 CRUD（同步 Google Calendar）
│   │   ├── member.js            # 成員管理
│   │   ├── profile.js           # 個人資料 + sync-avatar
│   │   ├── line.js              # LINE BOT 整合
│   │   └── financial.js         # 財務（限 manager）
│   ├── services/                # 業務邏輯（calendarService、memberDbService 等）
│   ├── config/                  # DB（pg pool）、Google Auth、LINE 設定
│   ├── middleware/              # auth middleware
│   └── migrations/              # SQL migrations
├── openspec/                    # OpenSpec 功能規格文件（含 STATUS.md 路線圖）
├── scripts/                     # 工具腳本（seed、sync、backup、migration、smoke test）
├── api/                         # （legacy）Vercel serverless 入口（已轉址，保留供回滾）
├── database/                    # （legacy）Supabase 時期 SQL 腳本
├── .claude/                     # Claude Code 規則 + context
├── CHANGELOG.md                 # 版本記錄
├── CLAUDE.md                    # Claude Code 對話啟動規則 + 工作流摘要
└── package.json                 # 後端 dependencies
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
- 設定環境變數（`DATABASE_URL` 走 Zeabur 內網、`LINE_*`、`GOOGLE_SERVICE_ACCOUNT_JSON` 等）

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
