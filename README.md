# 康九冠軍夥伴系統

> 目前版本：v1.5.3 | 分支：staging（部署架構遷移中）

專為團隊設計的行事曆與成員管理系統，整合 LINE Login、Google Calendar 與 PostgreSQL。

---

## 部署架構

### 目前（main 分支，正式）

| 層級 | 技術 |
|------|------|
| 前端 | 純 HTML + 原生 JS + CSS（`public/`），Vercel Static |
| 後端 | Node.js + Express.js，Vercel Serverless（`api/index.js`） |
| 資料庫 | Supabase（PostgreSQL） |

### 目標（staging 分支，遷移進行中）

| 層級 | 技術 |
|------|------|
| 前端 | React + Vite + PWA（`frontend/`），Cloudflare Pages |
| 後端 | Node.js + Express.js，Zeabur（容器化） |
| 資料庫 | Zeabur PostgreSQL（staging 專用，與 Supabase 隔離） |

---

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | 純 HTML + 原生 JS + CSS（`public/`） |
| 後端 | Node.js + Express.js（`server/`） |
| 身份驗證 | LINE Login OAuth（不依賴 LIFF SDK，自製 `window.LIFF` 介面） |
| 資料庫 | PostgreSQL（Supabase，遷移至 Zeabur 進行中） + Google Calendar API |
| 本機開發 | ngrok（內網穿透，用於 LINE Login 與 LINE BOT Webhook 測試） |

---

## 主要功能

| 功能 | 說明 | 角色限制 |
|------|------|---------|
| 月曆視圖 | 團體行事曆，依類型標色（學員上課／活動／諮詢簽約／紫星行程聊聊） | 所有人 |
| 行程列表 | 清單模式瀏覽行程 | 所有人 |
| 行程管理 | 新增、編輯、刪除行程 | admin / manager |
| 成員管理 | 成員列表、詳情、角色設定 | admin / manager |
| 個人資料 | 查看資訊、同步 LINE 頭像 | 所有人 |
| 財務功能 | 上傳與預覽財務報表 | manager |
| 邀請分享 | 產生邀請字卡並透過 LINE 分享 | admin / manager |
| PWA | 可安裝至手機桌面，支援 Service Worker 快取 | 所有人 |

---

## 角色權限

| 角色 | 可存取功能 |
|------|-----------|
| member | 月曆、列表、行程詳情、個人資料 |
| admin | 以上 + 新增/編輯/刪除行程、成員管理、管理後台 |
| manager | 以上 + 財務上傳與預覽 |

---

## 專案結構

```text
Line_Liff/
├── public/                   # 前端（正式版，純 HTML/JS/CSS）
│   ├── index.html            # 月曆主頁（進入點）
│   ├── list.html             # 行程列表
│   ├── add-event.html        # 新增行程
│   ├── event-detail.html     # 行程詳情
│   ├── members.html          # 成員列表
│   ├── member-detail.html    # 成員詳情
│   ├── profile.html          # 個人資料
│   ├── management.html       # 管理後台
│   ├── financial-upload.html # 財務上傳
│   ├── financial-preview.html
│   ├── invite-share.html     # 邀請字卡
│   ├── open-external.html    # 外部連結中介頁
│   ├── manifest.json         # PWA 設定
│   ├── sw.js                 # Service Worker
│   ├── js/
│   │   ├── liff.js           # ⭐ 核心：LINE Login OAuth + window.LIFF 介面
│   │   ├── calendar.js       # 月曆邏輯
│   │   ├── list.js           # 列表邏輯
│   │   ├── add-event.js      # 新增行程邏輯
│   │   ├── event-detail.js   # 行程詳情邏輯
│   │   ├── members.js        # 成員列表邏輯
│   │   ├── member-detail.js  # 成員詳情邏輯
│   │   ├── profile.js        # 個人資料邏輯
│   │   ├── management.js     # 管理後台邏輯
│   │   ├── financial-upload.js
│   │   ├── share-dialog.js   # 分享對話框
│   │   ├── cacheService.js   # 前端快取服務
│   │   ├── datePicker.js     # 日期選擇器
│   │   ├── timePicker.js     # 時間選擇器
│   │   └── scroll-restore.js # 捲軸位置恢復
│   └── css/style.css
├── server/                   # 後端
│   ├── server.js             # Express 主入口（含 CORS 白名單）
│   ├── routes/
│   │   ├── auth.js           # LINE OAuth 回調（/api/auth/*）
│   │   ├── calendar.js       # 行事曆 CRUD（/api/calendar/*）
│   │   ├── member.js         # 成員管理（/api/members/*）
│   │   ├── profile.js        # 個人資料（/api/profile/*）
│   │   ├── line.js           # LINE BOT 整合（/api/line/*）
│   │   └── financial.js      # 財務（/api/financial/*，限 manager）
│   ├── services/
│   │   ├── calendarService.js
│   │   ├── calendarSyncService.js
│   │   ├── calendarWatchService.js
│   │   ├── eventDbService.js
│   │   ├── lineService.js
│   │   ├── memberDbService.js
│   │   ├── sheetService.js
│   │   └── versionService.js
│   ├── config/
│   │   ├── db.js             # PostgreSQL 連線池（Serverless/容器模式自動切換）
│   │   └── lineConfig.js     # LINE API 設定驗證
│   └── middleware/
│       └── auth.js           # LINE User ID 驗證
├── api/
│   └── index.js              # Vercel Serverless 入口（main 分支用）
├── zbpack.json               # Zeabur 部署設定（staging 分支用）
├── .github/
│   └── workflows/
│       ├── keep-supabase-alive.yml  # 定期 ping Supabase 防休眠
│       └── monthly-backup.yml       # 每月自動備份資料庫
├── scripts/                  # 維護指令稿
│   ├── backup-db.js          # 手動資料庫備份
│   ├── restore-db.js         # 資料庫還原
│   ├── migrate-sheet-to-supabase.js
│   ├── sync-calendar-to-supabase.js
│   ├── register-calendar-watch.js
│   ├── renew-calendar-watch.js
│   └── seed-members.js
├── database/
│   ├── schema.sql            # 初始資料庫結構
│   ├── rls-policies.sql      # Row-Level Security 策略
│   └── *.sql                 # 遷移腳本
├── docs/                     # 詳細說明文件
├── openspec/                 # 功能變更規格文件（AI 輔助開發）
│   └── changes/
│       └── split-deploy-cloudflare-zeabur/  # 部署架構拆分計畫
├── ngrok.yml                 # ngrok 設定檔（本機開發）
├── vercel.json               # Vercel 部署設定（main 分支）
├── CLAUDE.md                 # AI 助理規則
├── CHANGELOG.md              # 版本索引
├── .claude/context/          # 各版本詳細上下文
└── package.json
```

---

## 身份驗證機制

本系統使用自製的 LINE Login OAuth，**不依賴 LIFF SDK**。

- **正式環境**：LINE Login OAuth → 導向 `/api/auth/line-login` → 回調後將 `userId`、`displayName`、`pictureUrl` 存入 `localStorage`
- **自製介面**：`public/js/liff.js` 提供 `window.LIFF` 介面與 `window.liff` 相容層
- **開發模式**：URL 帶 `?dev=1` 使用模擬 LINE ID，無需真實帳號

---

## 本機開發

### 前置需求

- Node.js 18+
- ngrok（用於 LINE Login 與 LINE BOT Webhook 測試）

### 安裝

```bash
# 安裝專案依賴（含 concurrently）
npm install

# 設定 ngrok Auth Token（一次性，免費帳號即可）
ngrok config add-authtoken 你的TOKEN
```

### 設定環境變數

```bash
cp .env.example .env
# 填入 LINE_CHANNEL_ID、LINE_CHANNEL_SECRET、DATABASE_URL 等
```

### 啟動方式

#### 方式一：純本機測試（不需 LINE Login）

```bash
npm run dev
# 開啟 http://localhost:8080?dev=1  ← 自動模擬登入
```

#### 方式二：同時啟動伺服器 + ngrok（測試真實 LINE Login 或 Webhook）

```bash
npm run dev:ngrok
# 終端機會顯示 ngrok 公開 URL
```

啟動後，將 ngrok URL 填入 LINE Developers Console：
- **LINE Login** → Callback URL：`https://你的ngrok網址/api/auth/line-callback`
- **LINE BOT** → Webhook URL：`https://你的ngrok網址/api/line/webhook`

> 注意：免費版 ngrok 每次重啟都會換網址，需重新更新設定。

### 測試未登入狀態

清除瀏覽器 localStorage 中的 `lineUserId` 再重整。

---

## 可用 NPM 指令

| 指令 | 說明 |
|------|------|
| `npm start` | 生產模式啟動伺服器 |
| `npm run dev` | 開發模式（nodemon 自動重啟） |
| `npm run ngrok` | 啟動 ngrok 通道（port 8080） |
| `npm run dev:ngrok` | 同時啟動伺服器 + ngrok |
| `npm test` | 執行測試 |
| `npm run migrate:members` | 從 Google Sheets 遷移成員資料到 PostgreSQL |
| `npm run sync:calendar` | 同步 Google Calendar 到 PostgreSQL |
| `npm run watch:register` | 註冊 Google Calendar Watch |
| `npm run watch:renew` | 更新 Google Calendar Watch |
| `npm run seed:members` | 填入測試成員資料 |

---

## 環境變數

| 變數名稱 | 說明 | 必填 |
|---------|------|------|
| `LINE_CHANNEL_ID` | LINE Channel ID | 是 |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret | 是 |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE BOT Access Token | 是 |
| `DATABASE_URL` | PostgreSQL 連線字串（Supabase 或 Zeabur） | 是 |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google Service Account Email | 是 |
| `GOOGLE_PRIVATE_KEY` | Google Service Account 私鑰 | 是 |
| `GROUP_CALENDAR_ID` | 團體 Google Calendar ID | 是 |
| `APP_URL` | 後端公開網址（Zeabur 或 Vercel） | 是 |
| `FRONTEND_URL` | 前端公開網址（Cloudflare Pages 或 Vercel） | 是（CORS 用） |
| `PORT` | 伺服器 Port（預設 8080） | 否 |
| `NODE_ENV` | 環境（development / production） | 否 |
| `LIFF_ID` | LINE LIFF ID | 否 |
| `CRON_SECRET` | Vercel Cron 認證（保護 Cron endpoints） | 否 |

---

## API 路由

| 路由 | 方法 | 說明 |
|------|------|------|
| `/api/auth/line-login` | GET | LINE OAuth 授權導向 |
| `/api/auth/line-callback` | GET | LINE OAuth 回調處理 |
| `/api/calendar/events` | GET | 取得日期範圍行程 |
| `/api/calendar/events/:id` | POST/PUT/DELETE | 行程 CRUD |
| `/api/members` | GET | 取得所有成員 |
| `/api/members/:lineId` | POST/PUT/DELETE | 成員管理 |
| `/api/profile/me` | GET | 個人資料 |
| `/api/profile/sync-avatar` | POST | 同步 LINE 頭像 |
| `/api/financial/upload` | POST | 上傳財務文件（限 manager） |
| `/api/financial/documents` | GET | 財務文件清單（限 manager） |
| `/api/line/webhook` | POST | LINE BOT Webhook |
| `/api/cron/sync` | GET | 每日行事曆同步 |
| `/api/cron/renew-watch` | GET | 每日 Watch 更新 |
| `/health` | GET | 健康檢查 |

---

## 部署

### 現行（Vercel，main 分支）

前後端統一部署在 Vercel：
- **後端**：Express app 透過 `api/index.js` 包裝成 Serverless Function
- **前端**：`public/` 目錄由 Vercel 靜態伺服
- **自動部署**：推送 `main` branch 即自動觸發

```bash
vercel --prod
```

### 目標（Zeabur + Cloudflare Pages，staging 分支）

- **後端**：Zeabur 連接 GitHub `staging` 分支，自動部署 Node.js 容器
- **前端**：Cloudflare Pages 連接 GitHub `staging` 分支，Build command：`cd frontend && npm install && npm run build`
- **設定**：後端環境變數 `FRONTEND_URL` 設為 Cloudflare Pages 網域（CORS 用）

詳細步驟：`openspec/changes/split-deploy-cloudflare-zeabur/tasks.md`

---

## 資料庫結構

### members 表

- LINE User ID（唯一識別）
- 顯示名稱、頭像 URL
- 角色（member / admin / manager）
- 財力金額、生日、星等、電話、Email

### events 表

- Google Calendar Event ID（唯一）
- 類型（學員上課、活動、諮詢簽約、紫星行程聊聊）
- 開始/結束時間、生日行程標記

### calendar_watches 表

- Google Calendar Push Notification 訂閱狀態

---

## 版本記錄

詳見 [CHANGELOG.md](./CHANGELOG.md)。各版本完整上下文：[.claude/context/](./.claude/context/)

---

## 安全性注意事項

- `.env`、`.env.backup`、`Key/` 目錄**永遠不推上 GitHub**
- ngrok 測試完畢後立即關閉
- CORS 已設白名單，僅允許 `APP_URL`、`FRONTEND_URL` 及本機開發網址
