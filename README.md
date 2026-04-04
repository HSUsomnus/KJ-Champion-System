# 康九冠軍夥伴系統

> **版本 v1.6.0** | 分支：`main` | 部署：[kj-champion-system.pages.dev](https://kj-champion-system.pages.dev) | 更新：2026-04-04

---

## 部署架構

| 層級 | 技術 | 服務 |
|------|------|------|
| 前端 | 純 HTML + 原生 JS + CSS（`public/`） | Cloudflare Pages（`kj-champion-system.pages.dev`） |
| API Proxy | Cloudflare Worker（`public/_worker.js`） | 攔截 `/api/*` 轉發至 Zeabur 後端 |
| 後端 | Node.js + Express.js（`server/`） | Zeabur（`kj-champion-system.zeabur.app`） |
| 資料庫 | PostgreSQL | Zeabur PostgreSQL |

---

## 主要功能

| 功能 | 說明 | 角色限制 |
|------|------|---------|
| 月曆視圖 | 團體行事曆，依類型標色 | 所有人 |
| 行程列表 | 清單模式瀏覽行程 | 所有人 |
| 行程管理 | 新增、編輯、刪除行程（同步 Google Calendar） | admin / manager |
| 成員管理 | 成員列表、詳情、角色設定 | admin / manager |
| 個人資料 | 查看資訊、同步 LINE 頭像 | 所有人 |
| 財務功能 | 上傳與預覽財務報表 | manager |
| LINE Login | OAuth 2.0 登入，動態偵測前端 origin 自動 redirect | 所有人 |
| PWA | 可安裝至手機桌面 | 所有人 |
| 行程分享 | 手機 LINE URL Scheme / 電腦 Web Share API 或剪貼簿 | 所有人 |

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

```bash
npm install
npm run dev
# 開啟 http://localhost:8080?dev=1（自動模擬登入）
```

清除 localStorage 的 `lineUserId` 再重整可測試未登入狀態。

---

## 專案結構

```text
├── public/                   # 前端（純 HTML/JS/CSS）
│   ├── _worker.js            # Cloudflare Worker（/api/* proxy）
│   ├── index.html            # 月曆主頁
│   ├── list.html             # 行程列表
│   ├── add-event.html        # 新增/編輯行程
│   ├── members.html          # 成員列表
│   ├── member-detail.html    # 成員詳情
│   ├── profile.html          # 個人資料
│   ├── management.html       # 管理頁面
│   ├── invite-share.html     # 邀請字卡
│   └── js/liff.js            # LINE Login OAuth + window.LIFF 介面
├── server/                   # 後端
│   ├── server.js             # Express 主入口
│   ├── routes/
│   │   ├── auth.js           # LINE OAuth（含動態 origin 偵測 + 白名單驗證）
│   │   ├── calendar.js       # 行事曆 CRUD
│   │   ├── member.js         # 成員管理
│   │   ├── profile.js        # 個人資料
│   │   ├── line.js           # LINE BOT
│   │   └── financial.js      # 財務（限 manager）
│   ├── services/             # 業務邏輯
│   └── config/               # DB、LINE 設定
├── openspec/                 # 功能規格文件
├── CHANGELOG.md              # 版本記錄
└── package.json
```
