# 康九冠軍夥伴系統

目前版本：v1.5.0 | [CHANGELOG](./CHANGELOG.md)

團體行事曆與成員管理系統，透過 LINE Login 驗證身份，提供行程管理、成員管理、財務上傳等功能。支援 PWA 安裝。

## 技術架構

| 層級 | 技術 |
|------|------|
| 後端 | Node.js + Express.js |
| 前端 | 純 HTML + 原生 JavaScript + CSS（無框架） |
| 資料庫 | Supabase（PostgreSQL） |
| 行事曆 | Google Calendar API |
| 試算表 | Google Sheets API |
| 身份驗證 | LINE Login OAuth（不使用 LIFF SDK） |
| 部署 | Google Cloud Run（後端）|
| PWA | Service Worker + Web App Manifest |

## 主要功能

- **行事曆**：月曆檢視、列表檢視、行程新增／編輯／刪除
- **行程分類**：學員上課、活動、諮詢簽約
- **成員管理**：成員列表、詳情、星等評分、備註
- **分享**：LINE URL Scheme 分享行程（手機）、Web Share API（電腦）
- **財務管理**：Excel 上傳、試算表預覽（限 manager 角色）
- **PWA**：可安裝至主畫面，靜態資源離線快取

## 專案結構

```
Line_Liff/
├── server/
│   ├── server.js              # Express 主程式
│   ├── routes/
│   │   ├── auth.js            # LINE Login OAuth 回調
│   │   ├── calendar.js        # 行事曆 CRUD
│   │   ├── member.js          # 成員管理
│   │   ├── profile.js         # 個人資料
│   │   ├── line.js            # LINE BOT 整合
│   │   └── financial.js       # 財務（限 manager）
│   └── services/              # 業務邏輯層
├── public/                    # 前端（正式使用）
│   ├── index.html             # 月曆主頁
│   ├── list.html              # 行程列表
│   ├── add-event.html         # 新增行程
│   ├── event-detail.html      # 行程詳情
│   ├── members.html           # 成員列表
│   ├── member-detail.html     # 成員詳情
│   ├── profile.html           # 個人資料
│   ├── management.html        # 管理中心
│   ├── financial-upload.html  # 財務上傳
│   ├── financial-preview.html # 財務預覽
│   ├── invite-share.html      # 邀請分享
│   ├── open-external.html     # 外部連結中介
│   ├── manifest.json          # PWA 設定
│   ├── sw.js                  # Service Worker
│   ├── js/
│   │   ├── liff.js            # LINE Login + window.LIFF 介面
│   │   ├── calendar.js
│   │   ├── cacheService.js    # localStorage 快取管理
│   │   └── ...
│   ├── css/
│   │   └── style.css
│   └── images/
│       └── logo.png
├── .env.example
├── Dockerfile
└── package.json
```

## 本地開發

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

```bash
cp .env.example .env
```

填入以下設定值：

```
# LINE Login
LINE_CHANNEL_ID=
LINE_CHANNEL_SECRET=
LINE_REDIRECT_URI=

# LINE BOT
LINE_CHANNEL_ACCESS_TOKEN=

# Supabase
SUPABASE_URL=
SUPABASE_KEY=

# Google API（Service Account JSON）
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_CALENDAR_ID=
GOOGLE_SHEETS_ID=

# 應用程式
APP_URL=http://localhost:8080
```

### 3. 啟動伺服器

```bash
npm start
```

開啟 `http://localhost:8080`

開發模式（模擬登入，無需 LINE 帳號）：`http://localhost:8080?dev=1`

## 身份驗證流程

本專案**不使用 LIFF SDK**，改用 LINE Login OAuth：

1. 前端呼叫 `/api/auth/line-login`
2. 導向 LINE 授權頁面
3. 使用者同意後，LINE 回調到後端
4. 後端取得 `userId`、`displayName`、`pictureUrl`，導回前端
5. 前端將資料存入 `localStorage`
6. `public/js/liff.js` 提供 `window.LIFF` 介面（相容舊呼叫）

## PWA 安裝

- **Android Chrome**：瀏覽網站後，網址列出現安裝圖示，點擊安裝
- **iOS Safari**：點選分享 → 「加入主畫面」
- **電腦 Chrome**：網址列右側出現安裝圖示

Service Worker 快取所有靜態資源（HTML、CSS、JS、圖片），更新快取版本請修改 `public/sw.js` 中的 `CACHE_NAME`。

## 部署（Google Cloud Run）

```bash
# 建置並推送 Docker 映像
docker build -t gcr.io/YOUR_PROJECT_ID/kj-system .
docker push gcr.io/YOUR_PROJECT_ID/kj-system

# 部署
gcloud run deploy kj-system \
  --image gcr.io/YOUR_PROJECT_ID/kj-system \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated
```

部署後需在 LINE Developers Console 更新回調 URL 為正式網址。

## 角色權限

| 角色 | 可用功能 |
|------|---------|
| 一般成員 | 行事曆、列表、個人資料 |
| admin | 以上 + 管理中心（成員管理、數據） |
| manager | 以上 + 財務上傳、財務預覽 |

## 授權

ISC License
