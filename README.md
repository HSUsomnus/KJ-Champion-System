# 康九冠軍夥伴系統

> **分支：`m_b_oauth動態redirect`** | 基於 main v1.5.7 | 更新：2026-04-03
>
> 此分支功能：後端 OAuth redirect 自動偵測前端 origin

---

## 此分支正在開發的功能

**OAuth 動態 Redirect** — 讓後端 LINE Login callback 自動偵測前端來源域名，redirect 回發起登入的前端站。

### 問題

後端 `FRONTEND_URL` 環境變數硬編碼指向正式站，導致 DEV 站（`kjcs-dev.pages.dev`）登入完跳回正式站（`kj-champion-system.pages.dev`），前後端無法真正分離。

### 解法

後端從 HTTP `Origin` / `Referer` header 自動偵測前端 origin，編碼進 OAuth state，callback 時取出作為 redirect 目標。白名單驗證防止 open redirect 攻擊。

### 與 main 的差異

| 檔案 | 變更 |
|------|------|
| `server/routes/auth.js` | 新增 `getClientOrigin()`、`isAllowedOrigin()` 函式，state 加入 `frontendOrigin` 欄位 |
| `openspec/STATUS.md` | 新增 change 07 |
| `openspec/changes/07-oauth動態redirect/` | 新增 proposal、design、tasks |

### 如何測試

1. 本機啟動後端：`npm run dev`
2. 從不同 origin 發起 LINE 登入（如 `localhost:5173`、`localhost:8080`）
3. 確認 callback 後 redirect 回原 origin
4. DEV 站測試：merge 到 dev → 在 `kjcs-dev.pages.dev` 驗證

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
| 行程管理 | 新增、編輯、刪除行程 | admin / manager |
| 成員管理 | 成員列表、詳情、角色設定 | admin / manager |
| 個人資料 | 查看資訊、同步 LINE 頭像 | 所有人 |
| 財務功能 | 上傳與預覽財務報表 | manager |
| PWA | 可安裝至手機桌面 | 所有人 |

---

## 環境變數

| 變數名稱 | 說明 | 必填 |
|---------|------|------|
| `LINE_CHANNEL_ID` | LINE Channel ID | 是 |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret | 是 |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE BOT Access Token | 是 |
| `DATABASE_URL` | PostgreSQL 連線字串 | 是 |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google Service Account JSON | 是 |
| `GROUP_CALENDAR_ID` | 團體 Google Calendar ID | 是 |
| `FRONTEND_URL` | 前端公開網址（fallback 用） | 是 |
| `APP_URL` | 後端公開網址 | 是 |
| `NODE_ENV` | 環境 | 是 |

---

## 本機開發

```bash
npm install
npm run dev
# 開啟 http://localhost:8080?dev=1
```

---

## 專案結構

```text
├── public/                   # 前端（純 HTML/JS/CSS）
│   ├── _worker.js            # Cloudflare Worker（/api/* proxy）
│   └── js/liff.js            # LINE Login OAuth + window.LIFF 介面
├── server/                   # 後端
│   ├── server.js             # Express 主入口
│   ├── routes/
│   │   ├── auth.js           # LINE OAuth（含動態 origin 偵測）← 此分支修改
│   │   ├── calendar.js       # 行事曆 CRUD
│   │   ├── member.js         # 成員管理
│   │   ├── profile.js        # 個人資料
│   │   ├── line.js           # LINE BOT
│   │   └── financial.js      # 財務（限 manager）
│   ├── services/             # 業務邏輯
│   └── config/               # DB、LINE 設定
├── openspec/                 # 功能規格文件
└── package.json
```
