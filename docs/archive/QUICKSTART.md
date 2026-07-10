# 快速開始指南

> 康九冠軍夥伴系統 v1.5.0

---

## 前置需求

- Node.js 18+
- ngrok CLI（用於測試 LINE Login 與 Webhook）
- LINE Developers 帳號（測試真實登入時需要）
- Supabase 帳號 + Google Cloud 服務帳號（詳見環境變數說明）

---

## 步驟一：安裝依賴

```bash
npm install
```

這會安裝所有依賴，包含 `concurrently`（同時啟動伺服器與 ngrok 用）。

---

## 步驟二：設定環境變數

```bash
cp .env.example .env
```

至少填入以下變數才能啟動：

```env
# LINE Login（OAuth 登入必填）
LINE_LOGIN_CHANNEL_ID=你的Channel_ID
LINE_LOGIN_CHANNEL_SECRET=你的Channel_Secret

# Supabase（成員資料庫必填）
DATABASE_URL=postgresql://postgres:密碼@主機:5432/postgres

# Google Calendar（行事曆必填）
GOOGLE_SERVICE_ACCOUNT_EMAIL=你的service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GROUP_CALENDAR_ID=你的calendar_id@group.calendar.google.com

# 應用程式網址（LINE OAuth 回調必填）
APP_URL=http://localhost:8080
```

完整環境變數說明：[README.md 的環境變數章節](../README.md#環境變數)

---

## 步驟三：啟動伺服器

### 模式 A：本機測試（不需真實 LINE 帳號）

```bash
npm run dev
```

開啟瀏覽器：`http://localhost:8080?dev=1`

`?dev=1` 會自動模擬 LINE 登入，無需真實帳號，適合快速開發測試。

---

### 模式 B：測試真實 LINE Login / LINE BOT（需要 ngrok）

#### 1. 安裝並設定 ngrok

```bash
# 方法 A：全域安裝 ngrok CLI
npm install -g ngrok

# 方法 B：從官網下載 https://ngrok.com/download

# 設定 Auth Token（免費帳號即可）
ngrok config add-authtoken 你的TOKEN
# 取得 Token：https://dashboard.ngrok.com/get-started/your-authtoken
```

#### 2. 同時啟動伺服器 + ngrok

```bash
npm run dev:ngrok
```

終端機會顯示類似：

```text
Forwarding  https://abc123.ngrok-free.app -> http://localhost:8080
```

#### 3. 更新 LINE Developers Console

複製 ngrok HTTPS URL，填入 LINE Developers Console：

- **LINE Login Channel** → Callback URL：
  `https://你的ngrok網址/api/auth/line-callback`

- **LINE Messaging API Channel** → Webhook URL（若需測試 BOT）：
  `https://你的ngrok網址/api/line/webhook`

#### 4. 更新 .env 的 APP_URL

```env
APP_URL=https://你的ngrok網址
```

> 注意：免費版 ngrok 每次重啟會換 URL，需重複以上步驟 3 和 4。

---

## 測試確認清單

| 測試項目 | 方法 | 說明 |
|---------|------|------|
| 畫面能載入 | 瀏覽器開 `localhost:8080?dev=1` | 看到月曆主頁 |
| 模擬登入 | URL 帶 `?dev=1` | 自動填入測試 LINE ID |
| 真實登入 | ngrok URL + LINE App | 走完 LINE OAuth 流程 |
| 未登入狀態 | 清除 localStorage 的 `lineUserId` | 應導向登入頁 |
| API 健康 | GET `http://localhost:8080/health` | 回傳 `{"status":"ok"}` |

---

## 常見問題

### Q：Google Private Key 格式錯誤

確保換行符號用 `\n` 表示，完整格式：

```env
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
```

### Q：LINE Login 失敗，回調出錯

- 確認 `APP_URL` 與 ngrok URL 一致
- 確認 LINE Developers Console 的 Callback URL 已更新
- 確認 `LINE_LOGIN_CHANNEL_ID` 和 `LINE_LOGIN_CHANNEL_SECRET` 填的是 **LINE Login Channel**，不是 Messaging API Channel

### Q：資料庫連線失敗

- 確認 `DATABASE_URL` 格式正確
- 確認 Supabase Project 已建立，且 `database/schema.sql` 已執行

---

## 下一步

- 部署到 Vercel：[docs/DEPLOYMENT.md](./DEPLOYMENT.md)
- ngrok 詳細用法：[docs/ngrok測試LINE功能步驟.md](./ngrok測試LINE功能步驟.md)
- 完整專案說明：[README.md](../README.md)
