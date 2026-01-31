# ⚡ 快速開始指南

歡迎使用 LINE LIFF 行事曆系統！這份指南會帶你快速上手。

## 🎯 5 分鐘快速設定

### 步驟 1：安裝依賴
```bash
npm install
```

### 步驟 2：設定環境變數
1. 複製 `env.example` 為 `.env`
2. 填入必要的設定值（參考下方說明）

### 步驟 3：啟動開發伺服器
```bash
npm run dev
```

### 步驟 4：測試
開啟瀏覽器訪問 `http://localhost:8080`

## 📝 環境變數快速設定

### Google API 設定（必須）

1. **建立 Google Cloud 專案**
   - 前往 https://console.cloud.google.com/
   - 建立新專案
   - 啟用 Calendar API 和 Sheets API

2. **建立 Service Account**
   ```bash
   # 使用 gcloud CLI（或透過網頁介面）
   gcloud iam service-accounts create line-liff-calendar-sa
   gcloud iam service-accounts keys create service-account-key.json \
     --iam-account=line-liff-calendar-sa@PROJECT-ID.iam.gserviceaccount.com
   ```

3. **取得設定值**
   - 開啟 `service-account-key.json`
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_PRIVATE_KEY`（注意換行符號 `\n`）
   - `project_id` → `GOOGLE_PROJECT_ID`

4. **設定共用日曆**
   - 建立 Google Calendar
   - 將 Service Account Email 加入為編輯者
   - 取得 Calendar ID（在日曆設定的「整合日曆」中）

5. **設定 Google Sheets**
   - 建立新的 Google Sheets
   - 第一列：`LINE ID`、`姓名`、`Email`、`電話`、`星等`、`課程紀錄`
   - 將 Service Account Email 加入為編輯者
   - 從網址取得 Sheet ID

### LINE LIFF 設定（必須）

1. **建立 LINE Channel**
   - 前往 https://developers.line.biz/
   - 建立 Provider 和 Channel（Messaging API）
   - 記錄 Channel ID 和 Channel Secret

2. **建立 LIFF App**
   - 在 Channel 中選擇「LIFF」標籤
   - 點擊「Add」建立新的 LIFF App
   - 設定 Endpoint URL（本地開發可用 ngrok）
   - 記錄 LIFF ID

## 🧪 本地測試 LINE LIFF

由於 LIFF 需要在 LINE 環境中運行，建議使用 ngrok：

```bash
# 1. 安裝 ngrok
# 下載：https://ngrok.com/

# 2. 啟動 ngrok
ngrok http 8080

# 3. 複製 HTTPS URL（例如：https://abc123.ngrok.io）

# 4. 在 LINE Developers Console 更新 LIFF Endpoint URL

# 5. 在 LINE 中開啟 LIFF App 測試
```

## 📚 完整文件

- **開發環境設定**：參考 docs/SETUP.md
- **部署指南**：參考 docs/DEPLOYMENT.md
- **專案架構**：參考 docs/PROJECT_PLAN.md

## 🆘 遇到問題？

### 常見錯誤

1. **`GOOGLE_PRIVATE_KEY` 格式錯誤**
   - 確保私鑰包含換行符號 `\n`
   - 範例：`"-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"`

2. **Google API 權限錯誤**
   - 確認 Service Account 有權限存取 Calendar 和 Sheets
   - 確認已將 Service Account Email 加入共用資源

3. **LIFF 無法開啟**
   - 確認 LIFF Endpoint URL 正確
   - 確認在 LINE 環境中開啟（或使用 ngrok）

### 需要幫助？

- 查看 docs/SETUP.md 了解詳細設定步驟
- 查看 docs/DEPLOYMENT.md 了解部署流程
- 檢查終端機和瀏覽器主控台的錯誤訊息

## 🚀 下一步

設定完成後，你可以：
1. 測試各個功能（行事曆、個人資料、成員列表）
2. 開始開發新功能
3. 部署到 Google Cloud Run

祝開發順利！🎉
