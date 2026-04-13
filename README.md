# 康九冠軍夥伴系統

> **版本 v2.0.3** | 分支：`main` | 部署：[kj-champion-system.pages.dev](https://kj-champion-system.pages.dev) | 更新：2026-04-12

專為團隊設計的行事曆與成員管理系統，整合 LINE Login、Google Calendar 與 PostgreSQL。

> **舊 Vercel 網址已全站 301 轉址至 Cloudflare Pages**，團隊成員無需更改書籤。

---

## 部署架構

| 層級 | 技術 | 服務 |
|------|------|------|
| 前端 | React 18 + Vite 5 + Tailwind CSS（`frontend/`） | Cloudflare Pages（`kj-champion-system.pages.dev`） |
| API Proxy | Cloudflare Worker（`frontend/public/_worker.js`） | 攔截 `/api/*` 轉發至 Zeabur 後端 |
| 後端 | Node.js + Express.js（`server/`） | Zeabur（`kj-champion-system.zeabur.app`） |
| 資料庫 | PostgreSQL | Zeabur PostgreSQL |

### 請求流程

```
瀏覽器（React SPA）
  └─ /api/* → Cloudflare Worker (_worker.js) → Zeabur 後端
  └─ 靜態資源 → Cloudflare Pages (Vite build output)
```

---

## 主要功能

| 功能 | 說明 | 角色限制 |
|------|------|---------|
| 月曆視圖 | 團體行事曆，依類型標色 | 所有人 |
| 行程列表 | 清單模式瀏覽行程 | 所有人 |
| 行程管理 | 新增、編輯、刪除行程（同步 Google Calendar） | admin / manager |
| 成員管理 | 成員列表、詳情、角色設定 | admin / manager |
| 個人資料 | 查看與編輯個人資訊、同步 LINE 頭像 | 所有人 |
| 財務功能 | 上傳財務報表、選取/編輯模式（多選刪除/下載）、網頁預覽試算表 | manager |
| LINE Login | OAuth 2.0 登入，動態偵測前端 origin 自動 redirect | 所有人 |
| PWA | 可安裝至手機桌面（Vite PWA Plugin） | 所有人 |

---

## 環境變數

| 變數名稱 | 說明 | 必填 |
|---------|------|------|
| `LINE_CHANNEL_ID` | LINE Channel ID | 是 |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret | 是 |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE BOT Access Token | 是 |
| `DATABASE_URL` | Zeabur PostgreSQL 連線字串 | 是 |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google Service Account JSON | 是 |
| `GROUP_CALENDAR_ID` | 團體 Google Calendar ID | 是 |
| `FRONTEND_URL` | 前端公開網址（OAuth redirect fallback） | 是 |
| `APP_URL` | 後端公開網址 | 是 |
| `NODE_ENV` | 環境（production / development） | 是 |
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

開發模式下 URL 帶 `?dev=1` 可自動模擬 LINE 登入。

---

## 專案結構

```text
├── frontend/                    # 前端（React 18 + Vite 5 + Tailwind CSS）
│   ├── public/
│   │   └── _worker.js           # Cloudflare Worker（/api/* proxy）
│   ├── src/
│   │   ├── App.jsx              # React Router 主入口
│   │   ├── main.jsx             # Vite 進入點
│   │   ├── pages/               # 頁面元件
│   │   │   ├── Home.jsx         # 首頁
│   │   │   ├── Calendar.jsx     # 月曆
│   │   │   ├── AddEvent.jsx     # 新增/編輯行程
│   │   │   ├── EventDetail.jsx  # 行程詳情
│   │   │   ├── Members.jsx      # 成員列表
│   │   │   ├── MemberDetail.jsx # 成員詳情
│   │   │   ├── Profile.jsx      # 個人資料
│   │   │   ├── Management.jsx   # 管理後台
│   │   │   ├── Financial.jsx    # 財力頁（選取/編輯模式 + 離開守衛）
│   │   │   ├── FinancialUpload.jsx  # 財力上傳
│   │   │   ├── FinancialPreview.jsx # 試算表網頁預覽
│   │   │   ├── Login.jsx        # 登入頁
│   │   │   └── UserStats.jsx    # 使用者統計
│   │   ├── components/          # 共用元件（Header, FabNav, FabAction, ConfirmLeaveDialog）
│   │   ├── contexts/            # React Context（Auth、User）
│   │   ├── services/            # API 呼叫服務
│   │   └── utils/               # 工具函式
│   ├── vite.config.js           # Vite + PWA 設定
│   └── package.json
├── server/                      # 後端
│   ├── server.js                # Express 主入口
│   ├── routes/
│   │   ├── auth.js              # LINE OAuth（含動態 origin 偵測 + 白名單）
│   │   ├── calendar.js          # 行事曆 CRUD
│   │   ├── member.js            # 成員管理
│   │   ├── profile.js           # 個人資料
│   │   ├── line.js              # LINE BOT
│   │   └── financial.js         # 財務（限 manager）
│   ├── services/                # 業務邏輯
│   └── config/                  # DB、LINE 設定
├── openspec/                    # 功能規格文件
├── CHANGELOG.md                 # 版本記錄
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
- 設定環境變數（`DATABASE_URL`、`LINE_*`、`GOOGLE_SERVICE_ACCOUNT_JSON` 等）

---

## UI 風格（Warm Minimal）

| 屬性 | 值 |
|------|------|
| 背景色 | `#F7F5F2` |
| 強調色 | `#4A7C59` |
| 文字色 | `#2C2C2C` |
| 圓角 | `rounded-xl` |

---

## 版本記錄

詳見 [CHANGELOG.md](./CHANGELOG.md)。
