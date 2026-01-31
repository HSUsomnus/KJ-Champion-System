# 📅 LINE LIFF 行事曆系統

一個專為團體設計的 LINE LIFF 應用程式，整合 Google Calendar 和 Google Sheets，提供完整的行程管理與成員管理功能。

## ✨ 主要功能

- 📆 **團體行事曆管理**: 讀寫共用 Google Calendar
- 👤 **個人行事曆**: 管理個人 Google Calendar
- 📋 **行程分類**: 學員上課、活動、諮詢簽約
- 👥 **成員管理**: 透過 Google Sheets 管理成員資料
- 🔗 **分享功能**: 一鍵分享行程給 LINE 好友或群組
- 📱 **手機優先**: 專為手機畫面優化的響應式設計

## 🚀 快速開始

### 1. 安裝依賴套件

```bash
npm install
```

### 2. 設定環境變數

複製 `.env.example` 並重新命名為 `.env`，填入你的設定值：

```bash
cp .env.example .env
```

### 3. 設定 Google API

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立專案並啟用 Calendar API 和 Sheets API
3. 建立 Service Account 並下載 JSON 金鑰檔
4. 將 Service Account Email 加入共用日曆和 Google Sheets 的編輯者

### 4. 設定 LINE LIFF

1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 建立 LIFF 應用程式
3. 取得 LIFF ID 並填入 `.env`

### 5. 本地開發

```bash
npm run dev
```

伺服器會在 `http://localhost:8080` 啟動

### 6. 部署到 Google Cloud Run

```bash
# 建置 Docker 映像檔
docker build -t gcr.io/YOUR_PROJECT_ID/line-liff-calendar .

# 推送到 Google Container Registry
docker push gcr.io/YOUR_PROJECT_ID/line-liff-calendar

# 部署到 Cloud Run
gcloud run deploy line-liff-calendar \
  --image gcr.io/YOUR_PROJECT_ID/line-liff-calendar \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated
```

## 📁 專案結構

```
Line_Liff/
├── server/          # 後端伺服器
├── public/          # 前端靜態檔案
├── .env.example     # 環境變數範例
├── Dockerfile       # Cloud Run 部署用
└── package.json     # 專案設定檔
```

## 🔧 技術棧

- **後端**: Node.js + Express.js
- **前端**: HTML/CSS/JavaScript + LINE LIFF SDK
- **資料庫**: Google Calendar + Google Sheets
- **部署**: Google Cloud Run

## 📝 開發注意事項

- 所有程式碼註解使用繁體中文
- 手機畫面優先設計
- 確保 API 響應時間 < 500ms
- 實作適當的錯誤處理與使用者提示

## 📄 授權

ISC License
