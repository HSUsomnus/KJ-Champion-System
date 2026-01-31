# LINE LIFF 行事曆系統 - 專案規劃書

## 📋 專案概述
開發一個支援 200 人的 LINE LIFF 應用程式，主要功能為團體行事曆管理與成員資料管理。

## 🏗️ 技術架構

### 後端技術棧
- **Runtime**: Node.js 18+ (LTS)
- **框架**: Express.js (輕量、快速)
- **部署**: Google Cloud Run (自動擴展、快速響應)
- **API 整合**:
  - Google Calendar API v3
  - Google Sheets API v4
  - LINE LIFF SDK

### 前端技術棧
- **框架**: 原生 HTML/CSS/JavaScript (輕量、快速載入)
- **UI 庫**: 自訂 CSS (手機優先設計)
- **SDK**: LINE LIFF SDK v2

### 資料儲存
- **團體行事曆**: Google Calendar (共用日曆)
- **個人行事曆**: 每個使用者的 Google Calendar
- **成員資料**: Google Sheets (包含：LINE ID、姓名、email、電話、星等、課程紀錄)

## 📁 專案結構

```
Line_Liff/
├── server/                 # 後端伺服器
│   ├── config/            # 設定檔
│   │   ├── googleAuth.js  # Google API 認證
│   │   └── lineConfig.js  # LINE LIFF 設定
│   ├── routes/            # API 路由
│   │   ├── calendar.js    # 行事曆相關 API
│   │   ├── member.js      # 成員相關 API
│   │   └── profile.js     # 個人資料 API
│   ├── services/          # 業務邏輯層
│   │   ├── calendarService.js
│   │   ├── sheetService.js
│   │   └── lineService.js
│   ├── middleware/        # 中介層
│   │   └── auth.js        # LINE 使用者驗證
│   └── server.js          # Express 伺服器主程式
├── public/                # 前端靜態檔案
│   ├── index.html         # 主頁（行事曆）
│   ├── list.html          # 列表模式
│   ├── profile.html       # 個人資料頁
│   ├── register.html      # 註冊頁面
│   ├── members.html       # 成員列表頁
│   ├── css/
│   │   └── style.css      # 主要樣式檔
│   └── js/
│       ├── liff.js        # LINE LIFF 初始化
│       ├── calendar.js    # 行事曆邏輯
│       ├── profile.js     # 個人資料邏輯
│       └── members.js     # 成員列表邏輯
├── .env.example           # 環境變數範例
├── .gitignore
├── Dockerfile             # Cloud Run 部署用
├── package.json
└── README.md

```

## 🎯 功能模組規劃

### 1. 主頁行事曆模組
- **顯示方式**: 月曆視圖 + 當日行程字卡
- **功能**:
  - 讀取團體 Google Calendar
  - 讀取個人 Google Calendar
  - 新增/編輯/刪除行程
  - 行程類型選擇（學員上課、活動、諮詢簽約）
  - 分享功能（LINE 好友/群組）

### 2. 列表模式模組
- **顯示方式**: 三個分頁（學員上課、活動、諮詢簽約）
- **功能**:
  - 以月為單位顯示該類型所有行程
  - 無限滾動載入下個月資料
  - 每個字卡可分享

### 3. 個人資料模組
- **功能**:
  - 讀寫 Google Sheets
  - 顯示 LINE 頭像、真實姓名
  - 編輯個人資料
  - 自動偵測註冊狀態

### 4. 成員管理模組
- **功能**:
  - 顯示所有成員（從 Google Sheets 讀取）
  - 成員卡片（頭像、姓名、星等）
  - 查看成員詳細資訊
  - 邀請新夥伴功能

### 5. 分享與邀請模組
- **分享功能**: 使用 LINE LIFF 的 `shareTargetPicker`
- **邀請功能**: 發送邀請字卡（包含多步驟按鈕）

## 🔐 認證與授權流程

### Google API 認證
1. 使用 Service Account 存取團體 Calendar 和 Sheets
2. 使用者透過 OAuth 2.0 授權個人 Calendar
3. 儲存 refresh token 供後續使用

### LINE LIFF 認證
1. 透過 LIFF ID 驗證使用者
2. 取得 LINE User ID 作為唯一識別
3. 與 Google Sheets 中的 LINE ID 比對

## 📊 資料流程

### 行程資料流程
```
使用者操作 → LINE LIFF 前端 → Express API → Google Calendar API → 更新日曆
```

### 成員資料流程
```
使用者操作 → LINE LIFF 前端 → Express API → Google Sheets API → 讀寫資料表
```

## 🚀 效能優化策略

1. **快取機制**: 
   - Redis 快取常用資料（成員列表、當日行程）
   - 快取時間：5-10 分鐘

2. **批次處理**:
   - Google Sheets 批次讀寫
   - Calendar 批次查詢

3. **前端優化**:
   - 圖片懶載入
   - 虛擬滾動（列表模式）
   - 防抖處理（搜尋、篩選）

4. **Cloud Run 設定**:
   - 最小實例數：1（降低成本）
   - 最大實例數：10（應付峰值）
   - CPU：1 vCPU
   - 記憶體：512MB

## 🧪 測試策略

1. **單元測試**: 使用 Jest 測試服務層邏輯
2. **整合測試**: 測試 API 端點
3. **E2E 測試**: 使用 Puppeteer 模擬使用者操作
4. **負載測試**: 使用 Artillery 測試 200 人同時使用

## 📦 部署流程

1. **本地開發**: 使用 nodemon 熱重載
2. **Docker 建置**: 建立 Docker 映像檔
3. **Google Cloud Build**: 自動建置與部署
4. **Cloud Run 部署**: 設定環境變數、網域綁定

## 🔄 開發階段

### Phase 1: 基礎架構（1-2 天）
- 專案初始化
- Google API 設定
- LINE LIFF 整合
- 基礎路由設定

### Phase 2: 核心功能（3-5 天）
- 行事曆 CRUD
- 個人資料管理
- 成員列表

### Phase 3: 進階功能（2-3 天）
- 分享功能
- 邀請功能
- 列表模式

### Phase 4: 優化與測試（2-3 天）
- 效能優化
- 錯誤處理
- 測試與除錯

### Phase 5: 部署與上線（1 天）
- Cloud Run 部署
- 環境設定
- 監控設定

## 📝 注意事項

1. **Google API 配額**: 
   - Calendar API: 1,000,000 requests/day
   - Sheets API: 300 requests/min/user
   - 需要監控使用量

2. **LINE LIFF 限制**:
   - 單一訊息分享最多 100 個目標
   - LIFF 應用大小限制 10MB

3. **安全性**:
   - 環境變數管理（不要 commit .env）
   - API 金鑰保護
   - 使用者輸入驗證與清理

4. **錯誤處理**:
   - 友善的錯誤訊息
   - 自動重試機制
   - 日誌記錄
