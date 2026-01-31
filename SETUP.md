# 🛠️ 開發環境設定指南

本文件說明如何在本地設定開發環境。

## 📋 前置需求

- Node.js 18+ (LTS 版本)
- npm 或 yarn
- Google Cloud 帳號
- LINE Developers 帳號

## 🔧 安裝步驟

### 1. 安裝依賴套件

```bash
npm install
```

### 2. 設定環境變數

1. 複製 `env.example` 為 `.env`
2. 填入所有必要的環境變數（參考 `DEPLOYMENT.md`）

### 3. 設定 Google API

#### 3.1 建立 Service Account
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立專案並啟用 Calendar API 和 Sheets API
3. 建立 Service Account 並下載 JSON 金鑰檔
4. 從 JSON 檔案中取得：
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_PRIVATE_KEY`（注意換行符號）
   - `project_id` → `GOOGLE_PROJECT_ID`

#### 3.2 設定共用日曆
1. 建立或選擇一個 Google Calendar
2. 將 Service Account Email 加入為編輯者
3. 取得 Calendar ID（在日曆設定的「整合日曆」中）

#### 3.3 設定 Google Sheets
1. 建立新的 Google Sheets
2. 建立標題列：`LINE ID`、`姓名`、`Email`、`電話`、`星等`、`課程紀錄`
3. 將 Service Account Email 加入為編輯者
4. 從網址取得 Sheet ID（`https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`）

### 4. 設定 LINE LIFF

1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 建立 Channel 和 LIFF App
3. 記錄 LIFF ID、Channel ID、Channel Secret

### 5. 啟動開發伺服器

```bash
npm run dev
```

伺服器會在 `http://localhost:8080` 啟動

### 6. 測試

1. 在瀏覽器中開啟 `http://localhost:8080`
2. 測試 API 端點：
   ```bash
   curl http://localhost:8080/health
   curl http://localhost:8080/api/line/liff-id
   ```

## 🧪 測試 LINE LIFF

由於 LIFF 需要在 LINE 環境中運行，本地測試有兩種方式：

### 方法一：使用 ngrok（推薦）

1. 安裝 ngrok：https://ngrok.com/
2. 啟動 ngrok：
   ```bash
   ngrok http 8080
   ```
3. 複製 HTTPS URL（例如：`https://abc123.ngrok.io`）
4. 在 LINE Developers Console 中更新 LIFF Endpoint URL
5. 在 LINE 中開啟 LIFF App 進行測試

### 方法二：使用 Cloud Run（開發環境）

1. 部署到 Cloud Run（參考 `DEPLOYMENT.md`）
2. 使用 Cloud Run 的 URL 進行測試

## 📁 專案結構說明

```
Line_Liff/
├── server/              # 後端程式碼
│   ├── config/         # 設定檔（Google API、LINE）
│   ├── routes/         # API 路由
│   ├── services/       # 業務邏輯層
│   ├── middleware/     # 中介層（認證等）
│   └── server.js       # Express 伺服器
├── public/             # 前端靜態檔案
│   ├── index.html      # 主頁（行事曆）
│   ├── list.html       # 列表模式
│   ├── profile.html    # 個人資料
│   ├── members.html    # 成員列表
│   ├── css/           # 樣式檔
│   └── js/            # JavaScript 檔案
├── package.json        # 專案設定檔
├── Dockerfile         # Docker 建置檔
└── README.md          # 專案說明
```

## 🔍 除錯技巧

### 查看日誌
- 後端日誌會顯示在終端機
- 前端錯誤會顯示在瀏覽器主控台（F12）

### 常見錯誤

1. **Google API 認證失敗**
   - 檢查 `.env` 中的 `GOOGLE_PRIVATE_KEY` 是否正確（注意換行符號）
   - 確認 Service Account 有權限

2. **LIFF 初始化失敗**
   - 確認 `LIFF_ID` 正確
   - 確認在 LINE 環境中開啟（或使用 ngrok）

3. **無法讀取 Google Sheets**
   - 確認 Sheet ID 正確
   - 確認 Service Account 有編輯權限
   - 確認 Sheet 名稱（`MEMBER_SHEET_NAME`）正確

## 🚀 下一步

- 閱讀 `PROJECT_PLAN.md` 了解專案架構
- 閱讀 `DEPLOYMENT.md` 了解部署流程
- 開始開發新功能！
