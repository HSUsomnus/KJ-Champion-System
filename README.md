# 康九冠軍夥伴系統

> **分支：`main`（正式上線）** | 版本：v1.6.0 | 更新：2026-03-28
>
> 正式前端：`kj-champion-system.pages.dev` | 後端：`kj-champion-system.zeabur.app`

專為團隊設計的行事曆與成員管理系統，整合 LINE Login、Google Calendar 與 PostgreSQL。

---

## 部署架構

| 層級 | 技術 | 服務 |
|------|------|------|
| 前端 | 純 HTML + 原生 JS + CSS（`public/`） | Cloudflare Pages（`kj-champion-system.pages.dev`） |
| API Proxy | Cloudflare Worker（`public/_worker.js`） | 攔截 `/api/*` 轉發至 Zeabur 後端 |
| 後端 | Node.js + Express.js（`server/`） | Zeabur（`kj-champion-system.zeabur.app`） |
| 資料庫 | PostgreSQL | Zeabur PostgreSQL |

### 請求流程

```
瀏覽器
  └─ /api/* → Cloudflare Worker (_worker.js) → Zeabur 後端
  └─ 靜態資源 → Cloudflare Pages (env.ASSETS)
```

---

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | 純 HTML + 原生 JS + CSS（`public/`） |
| 後端 | Node.js + Express.js（`server/`） |
| 身份驗證 | LINE Login OAuth（不依賴 LIFF SDK，自製 `window.LIFF` 介面） |
| 資料庫 | PostgreSQL（Zeabur）+ Google Calendar API |
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
├── public/                   # 前端（純 HTML/JS/CSS）
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
│   ├── _worker.js            # Cloudflare Worker（/api/* proxy）
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
│   │   └── versionService.js
│   ├── config/
│   │   ├── db.js             # PostgreSQL 連線池
│   │   └── lineConfig.js     # LINE API 設定驗證
│   └── middleware/
│       └── auth.js           # LINE User ID 驗證
├── zbpack.json               # Zeabur 部署設定
├── openspec/                 # 功能變更規格文件（AI 輔助開發）
│   ├── STATUS.md             # 當前進度儀表板
│   └── changes/              # 各 change 的規格與任務
├── .github/
│   └── workflows/
│       └── monthly-backup.yml  # 每月自動備份資料庫
├── scripts/                  # 維護指令稿
├── database/                 # SQL schema 與遷移腳本
├── CLAUDE.md                 # AI 助理規則
├── CHANGELOG.md              # 版本索引
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
npm install
ngrok config add-authtoken 你的TOKEN
```

### 設定環境變數

```bash
cp .env.example .env
# 填入 LINE_CHANNEL_ID、LINE_CHANNEL_SECRET、DATABASE_URL 等
```

### 啟動方式

```bash
# 純本機測試（不需 LINE Login）
npm run dev
# 開啟 http://localhost:8080?dev=1

# 同時啟動伺服器 + ngrok（測試真實 LINE Login 或 Webhook）
npm run dev:ngrok
```

啟動後，將 ngrok URL 填入 LINE Developers Console：
- **LINE Login** → Callback URL：`https://你的ngrok網址/api/auth/line-callback`
- **LINE BOT** → Webhook URL：`https://你的ngrok網址/api/line/webhook`

---

## 可用 NPM 指令

| 指令 | 說明 |
|------|------|
| `npm start` | 生產模式啟動伺服器 |
| `npm run dev` | 開發模式（nodemon 自動重啟） |
| `npm run ngrok` | 啟動 ngrok 通道（port 8080） |
| `npm run dev:ngrok` | 同時啟動伺服器 + ngrok |
| `npm test` | 執行測試 |

---

## 環境變數

| 變數名稱 | 說明 | 必填 |
|---------|------|------|
| `LINE_CHANNEL_ID` | LINE Channel ID | 是 |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret | 是 |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE BOT Access Token | 是 |
| `DATABASE_URL` | PostgreSQL 連線字串（Zeabur，建議用 `${POSTGRES_CONNECTION_STRING}`） | 是 |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google Service Account 完整 JSON | 是 |
| `GROUP_CALENDAR_ID` | 團體 Google Calendar ID | 是 |
| `FRONTEND_URL` | 前端公開網址（CORS 用，Cloudflare Pages） | 是 |
| `APP_URL` | 後端公開網址（Zeabur） | 是 |
| `NODE_ENV` | 環境（development / production） | 是 |
| `LIFF_ID` | LINE LIFF ID（備用） | 否 |
| `FINANCIAL_SHEET_ID` | 財務試算表 Google Sheets ID | 否 |
| `CRON_SECRET` | Cron 認證 | 否 |

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
| `/health` | GET | 健康檢查 |

---

## 部署

### 前端（Cloudflare Pages）

- 連接 GitHub `main` branch，自動部署
- Build command：不需要（純靜態，直接發佈 `public/`）
- Root directory：`public`

### 後端（Zeabur）

- 連接 GitHub `main` branch，自動部署 Node.js 容器
- 設定環境變數（`DATABASE_URL`、`LINE_*`、`GOOGLE_SERVICE_ACCOUNT_JSON` 等）

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

詳見 [CHANGELOG.md](./CHANGELOG.md)。

---

## 安全性注意事項

- `.env`、`.env.backup`、`Key/` 目錄**永遠不推上 GitHub**
- CORS 已設白名單，僅允許 `FRONTEND_URL` 及本機開發網址
