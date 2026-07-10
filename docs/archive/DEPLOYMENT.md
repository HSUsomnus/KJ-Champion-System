# 部署指南（Vercel）

> 康九冠軍夥伴系統 v1.5.0

本系統前後端統一部署在 Vercel，後端以 Serverless Function 形式運行。

---

## 架構說明

```text
Vercel
├── api/index.js        ← Express app 包裝成 Serverless Function
│   └── 處理所有 /api/* 請求
└── public/             ← 靜態前端（HTML/CSS/JS）
    └── 直接由 Vercel CDN 服務
```

Cron Jobs（`vercel.json` 定義）：

| 任務 | 排程 | 說明 |
|------|------|------|
| `/api/cron/sync` | 每日 02:00 UTC | 同步 Google Calendar 到 Supabase |
| `/api/cron/renew-watch` | 每日 00:00 UTC | 更新 Google Calendar Watch |

---

## 前置準備

### 1. Vercel 帳號與 CLI

```bash
npm install -g vercel
vercel login
```

### 2. 必要的外部服務

在部署前確認以下服務已設定完成：

- **Supabase**：建立 Project，執行 `database/schema.sql` 初始化資料表
- **Google Cloud**：建立 Service Account，啟用 Calendar API 與 Sheets API
- **LINE Developers**：建立 LINE Login Channel + Messaging API Channel

---

## 步驟一：設定環境變數

在 Vercel Dashboard → Project → Settings → Environment Variables 填入：

| 變數名稱 | 說明 |
|---------|------|
| `LINE_CHANNEL_ID` | LINE Messaging API Channel ID |
| `LINE_CHANNEL_SECRET` | LINE Messaging API Channel Secret |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE BOT Access Token |
| `LINE_LOGIN_CHANNEL_ID` | LINE Login Channel ID |
| `LINE_LOGIN_CHANNEL_SECRET` | LINE Login Channel Secret |
| `DATABASE_URL` | Supabase PostgreSQL 連線字串 |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google Service Account Email |
| `GOOGLE_PRIVATE_KEY` | Google Service Account 私鑰（含 `\n` 換行） |
| `GROUP_CALENDAR_ID` | 團體 Google Calendar ID |
| `MEMBER_SHEET_ID` | 成員 Google Sheets ID |
| `APP_URL` | Vercel 部署網址（例如 `https://your-app.vercel.app`） |

> `GOOGLE_PRIVATE_KEY` 格式：`"-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"`

---

## 步驟二：設定 LINE Developers Console

部署完成後，取得 Vercel 部署網址，填入 LINE Developers Console：

### LINE Login Channel

- **Callback URL**：`https://你的vercel網址/api/auth/line-callback`

### LINE Messaging API Channel（若使用 LINE BOT）

- **Webhook URL**：`https://你的vercel網址/api/line/webhook`
- 開啟 **Use webhook**

---

## 步驟三：部署

### 自動部署（推薦）

將 GitHub 儲存庫連結到 Vercel Project，推送到 `main` branch 即自動觸發部署：

```bash
git push origin main
```

### 手動部署

```bash
# 預覽部署
vercel

# 正式部署
vercel --prod
```

---

## 步驟四：驗證部署

```bash
# 健康檢查
curl https://你的vercel網址/health
# 預期回傳：{"status":"ok","timestamp":"..."}
```

在瀏覽器開啟 `https://你的vercel網址`，應該看到 LINE Login 頁面。

---

## vercel.json 說明

```json
{
  "builds": [
    { "src": "api/index.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/index.js" },
    { "src": "/(.*)", "dest": "/api/index.js" }
  ],
  "crons": [
    { "path": "/api/cron/sync", "schedule": "0 2 * * *" },
    { "path": "/api/cron/renew-watch", "schedule": "0 0 * * *" }
  ]
}
```

所有請求都經過 `api/index.js`（包含靜態檔案），Express 的 `express.static('public')` 負責服務前端靜態檔案。

---

## 常見問題

### 部署後 API 回傳 500

- 檢查 Vercel Dashboard → Functions → Logs
- 確認所有環境變數已正確填入
- 確認 `GOOGLE_PRIVATE_KEY` 換行符號格式正確

### LINE Login 回調失敗

- 確認 `APP_URL` 設為 Vercel 網址（不含結尾斜線）
- 確認 LINE Developers Console 的 Callback URL 已更新

### Cron Job 沒有執行

- Vercel Cron 需要 Pro 方案或 Hobby 方案（有限制）
- 可在 Dashboard → Cron Jobs 查看執行紀錄

---

## 本機開發

請參考 [docs/QUICKSTART.md](./QUICKSTART.md)，使用 ngrok 進行本機測試。
