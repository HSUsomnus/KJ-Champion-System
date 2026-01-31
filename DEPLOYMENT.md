# 🚀 部署指南

本文件說明如何將 LINE LIFF 行事曆系統部署到 Google Cloud Run。

## 📋 前置準備

### 1. Google Cloud Platform 設定

#### 1.1 建立專案
```bash
# 安裝 Google Cloud SDK（如果還沒安裝）
# Windows: 下載並安裝 https://cloud.google.com/sdk/docs/install

# 登入 Google Cloud
gcloud auth login

# 建立新專案（或使用現有專案）
gcloud projects create your-project-id --name="LINE LIFF Calendar"

# 設定專案
gcloud config set project your-project-id
```

#### 1.2 啟用必要的 API
```bash
# 啟用 Cloud Run API
gcloud services enable run.googleapis.com

# 啟用 Cloud Build API
gcloud services enable cloudbuild.googleapis.com

# 啟用 Container Registry API
gcloud services enable containerregistry.googleapis.com

# 啟用 Calendar API
gcloud services enable calendar-json.googleapis.com

# 啟用 Sheets API
gcloud services enable sheets.googleapis.com
```

#### 1.3 建立 Service Account
```bash
# 建立 Service Account
gcloud iam service-accounts create line-liff-calendar-sa \
    --display-name="LINE LIFF Calendar Service Account"

# 下載金鑰（會自動下載 JSON 檔案）
gcloud iam service-accounts keys create service-account-key.json \
    --iam-account=line-liff-calendar-sa@your-project-id.iam.gserviceaccount.com
```

#### 1.4 設定 Google Calendar
1. 前往 [Google Calendar](https://calendar.google.com/)
2. 建立新的共用日曆（或使用現有日曆）
3. 將 Service Account Email 加入為編輯者：
   - 日曆設定 → 共用對象 → 新增人員
   - 輸入：`line-liff-calendar-sa@your-project-id.iam.gserviceaccount.com`
   - 權限設為「可以變更活動」

#### 1.5 設定 Google Sheets
1. 建立新的 Google Sheets
2. 在第一列建立標題列：`LINE ID`、`姓名`、`Email`、`電話`、`星等`、`課程紀錄`
3. 將 Service Account Email 加入為編輯者：
   - 共用 → 新增人員
   - 輸入：`line-liff-calendar-sa@your-project-id.iam.gserviceaccount.com`
   - 權限設為「編輯者」

### 2. LINE Developers 設定

#### 2.1 建立 LINE Channel
1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 建立新的 Provider（如果還沒有）
3. 建立新的 Channel（選擇 Messaging API）
4. 記錄 Channel ID 和 Channel Secret

#### 2.2 建立 LIFF 應用程式
1. 在 Channel 中選擇「LIFF」標籤
2. 點擊「Add」建立新的 LIFF App
3. 設定：
   - **LIFF app name**: LINE 行事曆
   - **Size**: Full
   - **Endpoint URL**: `https://your-cloud-run-url.run.app`（部署後填入）
   - **Scope**: profile, openid
   - **Bot link feature**: On
4. 記錄 LIFF ID

## 🔧 環境變數設定

### 本地開發
1. 複製 `env.example` 為 `.env`
2. 填入所有必要的環境變數：

```env
# Google API 設定（從 service-account-key.json 取得）
GOOGLE_SERVICE_ACCOUNT_EMAIL=line-liff-calendar-sa@your-project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_PROJECT_ID=your-project-id

# Google Calendar 設定
GROUP_CALENDAR_ID=your-group-calendar-id@group.calendar.google.com

# Google Sheets 設定
MEMBER_SHEET_ID=your-google-sheet-id
MEMBER_SHEET_NAME=成員資料

# LINE 設定（LIFF + 方案 A/B Bot，詳見 docs/LINE變數設定一覽.md）
LIFF_ID=your-liff-id
LINE_CHANNEL_ID=your-channel-id
LINE_CHANNEL_SECRET=your-channel-secret
LINE_CHANNEL_ACCESS_TOKEN=your-channel-access-token-long-lived

# 伺服器設定
PORT=8080
NODE_ENV=production
APP_URL=https://your-cloud-run-url.run.app
```

**⚠️ 重要記憶點：發布前必須設定 `APP_URL`**
- `APP_URL` 是你的應用程式對外網址（用於分享字卡的「詳情」按鈕）
- 部署到 Cloud Run 後，取得正式網址，填入 `APP_URL`
- **不含** 結尾斜線，例如：`https://line-liff-calendar-xxxx-an.a.run.app`
- 如果沒設定，分享字卡時會出現錯誤

### Cloud Run 部署
使用以下命令設定環境變數：

```bash
gcloud run services update line-liff-calendar \
  --region=asia-east1 \
  --set-env-vars="GOOGLE_SERVICE_ACCOUNT_EMAIL=line-liff-calendar-sa@your-project-id.iam.gserviceaccount.com,GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n,GOOGLE_PROJECT_ID=your-project-id,GROUP_CALENDAR_ID=your-group-calendar-id@group.calendar.google.com,MEMBER_SHEET_ID=your-google-sheet-id,MEMBER_SHEET_NAME=成員資料,LIFF_ID=your-liff-id,LINE_CHANNEL_ID=your-channel-id,LINE_CHANNEL_SECRET=your-channel-secret,LINE_CHANNEL_ACCESS_TOKEN=your-channel-access-token,APP_URL=https://your-cloud-run-url.run.app,NODE_ENV=production"
```

**⚠️ 記得將 `APP_URL` 的值改成你的實際 Cloud Run 網址！**

**注意**：由於環境變數較多，建議使用 Secret Manager 管理敏感資訊。

## 🐳 本地測試 Docker

```bash
# 建置 Docker 映像檔
docker build -t line-liff-calendar .

# 執行容器（需要先設定環境變數）
docker run -p 8080:8080 --env-file .env line-liff-calendar

# 測試
curl http://localhost:8080/health
```

## 🚀 部署到 Cloud Run

### ⚠️ 部署前檢查清單（記憶點）

在執行部署前，請確認以下項目已設定：

- [ ] **`APP_URL`** 已設定為 Cloud Run 正式網址（用於分享字卡詳情連結）
- [ ] 所有 Google API 環境變數已填入（`GOOGLE_SERVICE_ACCOUNT_EMAIL`、`GOOGLE_PRIVATE_KEY`、`GROUP_CALENDAR_ID`、`MEMBER_SHEET_ID`）
- [ ] 所有 LINE 環境變數已填入（`LIFF_ID`、`LINE_CHANNEL_ID`、`LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`）
- [ ] Service Account 已加入 Google Calendar 和 Sheets 的編輯權限
- [ ] LIFF Endpoint URL 已更新為 Cloud Run 網址

### 方法一：使用 gcloud 命令（推薦）

```bash
# 建置並推送映像檔
gcloud builds submit --tag gcr.io/your-project-id/line-liff-calendar

# 部署到 Cloud Run
gcloud run deploy line-liff-calendar \
  --image gcr.io/your-project-id/line-liff-calendar \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 10 \
  --set-env-vars="NODE_ENV=production"
```

### 方法二：使用 Cloud Build（自動化）

1. 將 `cloudbuild.yaml` 推送到 Git 儲存庫
2. 在 Google Cloud Console 中設定 Cloud Build 觸發器
3. 每次推送程式碼時自動建置和部署

```bash
# 手動觸發建置
gcloud builds submit --config cloudbuild.yaml
```

## 🔗 更新 LIFF Endpoint URL

部署完成後，取得 Cloud Run 的 URL：

```bash
gcloud run services describe line-liff-calendar --region=asia-east1 --format='value(status.url)'
```

然後更新 LINE Developers Console 中的 LIFF Endpoint URL。

## ✅ 驗證部署

1. **健康檢查**
   ```bash
   curl https://your-cloud-run-url.run.app/health
   ```
   應該回傳：`{"status":"ok","timestamp":"..."}`

2. **測試 API**
   ```bash
   curl https://your-cloud-run-url.run.app/api/line/liff-id
   ```

3. **在 LINE 中測試**
   - 在 LINE 中開啟 LIFF 應用程式
   - 測試各個功能是否正常運作

## 📊 監控與日誌

### 查看日誌
```bash
gcloud run services logs read line-liff-calendar --region=asia-east1
```

### 監控指標
在 Google Cloud Console 中查看：
- Cloud Run → line-liff-calendar → 指標
- 監控 CPU、記憶體、請求數等

## 🔒 安全性建議

1. **使用 Secret Manager** 儲存敏感資訊（私鑰、Channel Secret 等）
2. **啟用 HTTPS**（Cloud Run 預設啟用）
3. **設定 CORS** 限制允許的來源
4. **實作 Rate Limiting**（已包含在程式碼中）
5. **定期更新依賴套件**

## 🐛 常見問題

### 問題：部署後無法連線
- 檢查環境變數是否正確設定
- 確認 Service Account 權限
- 查看 Cloud Run 日誌

### 問題：Google API 認證失敗
- 確認 Service Account Email 和 Private Key 正確
- 確認 Service Account 有權限存取 Calendar 和 Sheets

### 問題：LIFF 無法開啟
- 確認 LIFF Endpoint URL 正確
- 確認 Channel ID 和 Channel Secret 正確
- 檢查瀏覽器主控台錯誤訊息

## 📞 支援

如有問題，請查看：
- [Google Cloud Run 文件](https://cloud.google.com/run/docs)
- [LINE LIFF 文件](https://developers.line.biz/en/docs/liff/)
- [Google Calendar API 文件](https://developers.google.com/calendar)
- [Google Sheets API 文件](https://developers.google.com/sheets/api)
