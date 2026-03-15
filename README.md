# 康九冠軍夥伴系統

> 目前版本：v1.4.0

專為團隊設計的行事曆與成員管理系統，整合 LINE Login、Google Calendar、Google Sheets 與 Supabase。

---

## 技術架構

| 層級 | 技術 |
| ---- | ---- |
| 前端 | 純 HTML + 原生 JS + CSS（`public/`） |
| 後端 | Node.js + Express.js（`server/`） |
| 身份驗證 | LINE Login OAuth（不依賴 LIFF SDK） |
| 資料庫 | Supabase（成員）、Google Calendar API、Google Sheets API |
| 部署 | Vercel（前後端一起，Serverless） |

---

## 主要功能

- **月曆視圖**：團體行事曆，依類型（學員上課／活動／諮詢簽約）標色
- **行程管理**：新增、編輯、刪除行程（限 admin/manager）
- **成員管理**：成員列表、詳情、角色管理
- **個人資料**：同步 LINE 頭像、查看個人資訊
- **財務功能**：上傳與預覽財務報表（限 manager）
- **邀請分享**：產生邀請字卡並透過 LINE 分享
- **PWA 支援**：可安裝至手機桌面，支援 Service Worker 快取

---

## 專案結構

```text
Line_Liff/
├── public/                 # 前端（正式版）
│   ├── index.html          # 月曆主頁
│   ├── list.html           # 行程列表
│   ├── add-event.html      # 新增行程
│   ├── event-detail.html   # 行程詳情
│   ├── members.html        # 成員列表
│   ├── member-detail.html  # 成員詳情
│   ├── profile.html        # 個人資料
│   ├── management.html     # 管理後台
│   ├── financial-upload.html
│   ├── financial-preview.html
│   ├── invite-share.html   # 邀請字卡
│   ├── open-external.html  # 外部連結中介
│   ├── manifest.json       # PWA 設定
│   ├── sw.js               # Service Worker
│   ├── js/
│   │   ├── liff.js         # 核心：LINE Login + window.LIFF 介面
│   │   ├── calendar.js
│   │   ├── list.js
│   │   ├── add-event.js
│   │   ├── event-detail.js
│   │   ├── members.js
│   │   ├── member-detail.js
│   │   ├── profile.js
│   │   ├── management.js
│   │   ├── financial-upload.js
│   │   ├── share-dialog.js
│   │   ├── cacheService.js
│   │   ├── datePicker.js
│   │   ├── timePicker.js
│   │   └── scroll-restore.js
│   └── css/style.css
├── server/                 # 後端
│   ├── server.js           # Express 主入口
│   ├── routes/
│   │   ├── auth.js         # LINE OAuth 回調
│   │   ├── calendar.js     # 行事曆 CRUD
│   │   ├── member.js       # 成員管理
│   │   ├── profile.js      # 個人資料
│   │   ├── line.js         # LINE BOT
│   │   └── financial.js    # 財務（限 manager）
│   └── services/
│       ├── calendarService.js
│       ├── calendarSyncService.js
│       ├── calendarWatchService.js
│       ├── eventDbService.js
│       ├── lineService.js
│       ├── memberDbService.js
│       ├── sheetService.js
│       └── versionService.js
├── api/
│   └── index.js            # Vercel Serverless 入口
├── vercel.json             # Vercel 部署設定
├── Dockerfile              # （備用）Cloud Run 容器設定
├── CLAUDE.md               # AI 助理規則
├── CHANGELOG.md            # 版本索引
├── .claude/context/        # 各版本詳細上下文
└── package.json
```

---

## 身份驗證機制

- **正式環境**：LINE Login OAuth，導向 `/api/auth/line-login`，回調後將 `userId`、`displayName`、`pictureUrl` 存入 `localStorage`
- **不依賴 LIFF SDK**：`public/js/liff.js` 提供自製的 `window.LIFF` 介面與 `window.liff` 相容層
- **開發模式**：URL 帶 `?dev=1` 使用模擬 LINE ID，無需真實帳號

---

## 本機開發

### 安裝依賴

```bash
npm install
```

### 設定環境變數

```bash
cp .env.example .env
# 填入 LINE_CHANNEL_ID、LINE_CHANNEL_SECRET、SUPABASE_URL 等
```

### 啟動開發伺服器

```bash
node server/server.js
```

伺服器在 `http://localhost:8080` 啟動。

### 測試（模擬登入，不需真實 LINE 帳號）

```text
http://localhost:8080?dev=1
```

### 測試未登入狀態

清除瀏覽器 localStorage 中的 `lineUserId` 再重整。

---

## 部署（Vercel）

前後端統一部署在 Vercel：

- 後端：Express app 透過 `api/index.js` 包裝成 Serverless Function
- 前端：`public/` 目錄由 Vercel 靜態伺服
- 推送 `main` branch 自動觸發部署
- Cron jobs：每日 02:00 同步行事曆、每日 00:00 更新 Watch

```bash
# 手動部署（需安裝 Vercel CLI）
vercel --prod
```

---

## 角色權限

| 角色 | 可存取功能 |
| ---- | --------- |
| member | 月曆、列表、行程詳情、個人資料 |
| admin | 以上 + 新增/編輯/刪除行程、成員管理、管理後台 |
| manager | 以上 + 財務上傳與預覽 |

---

## 版本記錄

詳見 [CHANGELOG.md](./CHANGELOG.md)。各版本完整上下文：`.claude/context/`。
