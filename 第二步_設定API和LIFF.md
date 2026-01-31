# 🎯 第二步：設定 Google API 和 LINE LIFF（詳細步驟）

這份文件會一步一步帶你完成 Google Cloud 和 LINE Developers 的設定，並取得所有需要的環境變數值！

## ✅ 檢查清單

完成後請勾選：
- [ ] Google Cloud 專案已建立
- [ ] Calendar API 和 Sheets API 已啟用
- [ ] Service Account 已建立並下載金鑰
- [ ] Google Calendar 已設定並取得 Calendar ID
- [ ] Google Sheets 已建立並取得 Sheet ID
- [ ] LINE Channel 已建立
- [ ] LIFF App 已建立並取得 LIFF ID
- [ ] 所有環境變數已填入 .env 檔案

---

## 📊 第二部分 A：設定 Google Cloud 專案

### A1：建立 Google Cloud 專案

#### 步驟 1：登入 Google Cloud Console

1. **開啟瀏覽器**，前往：https://console.cloud.google.com/

2. **登入你的 Google 帳號**
   - 如果沒有 Google 帳號，先建立一個
   - 建議使用你常用的 Google 帳號

3. **接受服務條款**（如果是第一次使用）

#### 步驟 2：建立新專案

1. **點擊頂部的專案選擇器**
   - 在頁面最上方，會看到「選取專案」或「Select a project」
   - 點擊它

2. **點擊「新增專案」（New Project）**
   - 會開啟新專案建立頁面

3. **填寫專案資訊**
   - **專案名稱**：`LINE LIFF Calendar`（或你喜歡的名稱）
   - **專案 ID**：會自動產生（例如：`line-liff-calendar-123456`）
   - **位置**：選擇「無組織」（No organization）

4. **點擊「建立」（Create）**
   - 等待幾秒鐘，專案會建立完成
   - 建立完成後，會自動切換到新專案

#### 步驟 3：啟用必要的 API

1. **啟用 Calendar API**
   - 在搜尋欄輸入「Calendar API」
   - 點擊「Google Calendar API」
   - 點擊「啟用」（Enable）
   - 等待啟用完成（約 10-30 秒）

2. **啟用 Sheets API**
   - 在搜尋欄輸入「Sheets API」
   - 點擊「Google Sheets API」
   - 點擊「啟用」（Enable）
   - 等待啟用完成（約 10-30 秒）

3. **確認兩個 API 都已啟用**
   - 前往「API 和服務」→「已啟用的 API」
   - 應該會看到：
     - ✅ Google Calendar API
     - ✅ Google Sheets API

---

### A2：建立 Service Account

#### 步驟 1：建立 Service Account

1. **前往「IAM 和管理」→「服務帳戶」**
   - 在左側選單中找到「IAM 和管理」（IAM & Admin）
   - 點擊「服務帳戶」（Service Accounts）

2. **點擊「建立服務帳戶」（Create Service Account）**

3. **填寫服務帳戶資訊**
   - **服務帳戶名稱**：`line-liff-calendar-sa`
   - **服務帳戶 ID**：會自動產生（例如：`line-liff-calendar-sa`）
   - **說明**：`LINE LIFF Calendar Service Account`
   - 點擊「建立並繼續」（Create and Continue）

4. **設定角色（可選）**
   - 這一步可以跳過，直接點擊「完成」（Done）

#### 步驟 2：建立並下載金鑰

1. **找到剛建立的服務帳戶**
   - 在服務帳戶列表中，點擊你剛建立的服務帳戶（`line-liff-calendar-sa`）

2. **前往「金鑰」（Keys）標籤**
   - 點擊頁面上方的「金鑰」（Keys）標籤

3. **新增金鑰**
   - 點擊「新增金鑰」（Add Key）
   - 選擇「建立新金鑰」（Create new key）
   - 選擇「JSON」格式
   - 點擊「建立」（Create）

4. **下載 JSON 檔案**
   - 瀏覽器會自動下載一個 JSON 檔案
   - 檔案名稱類似：`line-liff-calendar-xxxxx-xxxxx.json`
   - **重要**：這個檔案包含私鑰，請妥善保管！

5. **記錄 Service Account Email**
   - 在服務帳戶詳細頁面，你會看到「電子郵件」（Email）
   - 格式類似：`line-liff-calendar-sa@your-project-id.iam.gserviceaccount.com`
   - **複製這個 Email，稍後會用到**

#### 步驟 3：從 JSON 檔案取得設定值

1. **開啟下載的 JSON 檔案**
   - 用記事本或任何文字編輯器開啟
   - 檔案內容類似這樣：

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "xxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "line-liff-calendar-sa@your-project-id.iam.gserviceaccount.com",
  "client_id": "xxxxx",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

2. **記錄以下三個值**：
   - `project_id` → 這是 `GOOGLE_PROJECT_ID`
   - `client_email` → 這是 `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → 這是 `GOOGLE_PRIVATE_KEY`（注意：要保留完整的格式，包括 `\n`）

3. **準備填入 .env 檔案**
   - 先不要關閉這個檔案，稍後會用到

---

### A3：設定 Google Calendar

#### 步驟 1：建立共用日曆

1. **前往 Google Calendar**：https://calendar.google.com/

2. **建立新日曆**
   - 在左側選單中，點擊「+」旁邊的「其他日曆」（Other calendars）
   - 選擇「建立新日曆」（Create new calendar）

3. **填寫日曆資訊**
   - **名稱**：`LINE LIFF 團體行事曆`（或你喜歡的名稱）
   - **說明**：`LINE LIFF 應用程式使用的共用行事曆`
   - **時區**：選擇「台北時間」（Asia/Taipei）
   - 點擊「建立日曆」（Create calendar）

#### 步驟 2：設定共用權限

1. **前往日曆設定**
   - 在左側選單中找到你剛建立的日曆
   - 點擊日曆名稱旁邊的三個點「⋯」
   - 選擇「設定和共用」（Settings and sharing）

2. **新增 Service Account 為編輯者**
   - 向下滾動到「與特定使用者共用」（Share with specific people）
   - 點擊「新增人員」（Add people）
   - 輸入 Service Account Email（`line-liff-calendar-sa@your-project-id.iam.gserviceaccount.com`）
   - 權限選擇「可以變更活動」（Make changes to events）
   - 點擊「傳送」（Send）

#### 步驟 3：取得 Calendar ID

1. **在日曆設定頁面**
   - 向下滾動到「整合日曆」（Integrate calendar）區塊

2. **複製日曆 ID**
   - 找到「日曆 ID」（Calendar ID）
   - 格式類似：`your-calendar-id@group.calendar.google.com`
   - **複製這個 ID，這是 `GROUP_CALENDAR_ID`**

---

### A4：設定 Google Sheets

#### 步驟 1：建立新的 Google Sheets

1. **前往 Google Sheets**：https://sheets.google.com/

2. **建立新試算表**
   - 點擊「空白」（Blank）建立新的試算表

3. **設定標題列**
   - 在第一列（Row 1）輸入以下標題：
     - A1：`LINE ID`
     - B1：`姓名`
     - C1：`Email`
     - D1：`電話`
     - E1：`星等`
     - F1：`課程紀錄`

4. **儲存檔案**
   - 點擊左上角的「未命名的試算表」（Untitled spreadsheet）
   - 重新命名為：`LINE LIFF 成員資料`（或你喜歡的名稱）

#### 步驟 2：設定共用權限

1. **點擊右上角的「共用」（Share）按鈕**

2. **新增 Service Account**
   - 在「新增人員或群組」欄位中
   - 輸入 Service Account Email（`line-liff-calendar-sa@your-project-id.iam.gserviceaccount.com`）
   - 權限選擇「編輯者」（Editor）
   - **取消勾選「通知人員」（Notify people）**（因為這是 Service Account，不需要通知）
   - 點擊「完成」（Done）

#### 步驟 3：取得 Sheet ID

1. **查看網址列**
   - 你的 Google Sheets 網址應該類似：
     ```
     https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
     ```

2. **找出 Sheet ID**
   - Sheet ID 是網址中 `/d/` 和 `/edit` 之間的那一串字元
   - 例如：`1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`
   - **複製這個 ID，這是 `MEMBER_SHEET_ID`**

3. **確認工作表名稱**
   - 預設的工作表名稱通常是「工作表1」（Sheet1）
   - 如果沒有改名，`MEMBER_SHEET_NAME` 就是 `工作表1`
   - 或者你可以重新命名為「成員資料」，然後 `MEMBER_SHEET_NAME` 就是 `成員資料`

---

## 📱 第二部分 B：設定 LINE LIFF

### B1：建立 LINE Channel

#### 步驟 1：登入 LINE Developers Console

1. **開啟瀏覽器**，前往：https://developers.line.biz/

2. **登入你的 LINE 帳號**
   - 使用你的 LINE 帳號登入
   - 如果沒有 LINE 帳號，先建立一個

#### 步驟 2：建立 Provider

1. **如果還沒有 Provider**
   - 點擊「建立」（Create）
   - 選擇「建立 Provider」（Create Provider）
   - 輸入 Provider 名稱（例如：`我的應用程式`）
   - 點擊「建立」（Create）

#### 步驟 3：建立 Channel

1. **點擊「建立」（Create）**
   - 選擇「建立 Channel」（Create a channel）

2. **選擇 Channel 類型**
   - 選擇「Messaging API」
   - 點擊「下一步」（Next）

3. **填寫 Channel 資訊**
   - **Channel 名稱**：`LINE LIFF Calendar`（或你喜歡的名稱）
   - **Channel 說明**：`LINE LIFF 行事曆應用程式`
   - **類別**：選擇「其他」（Other）
   - **子類別**：選擇「其他」（Other）
   - **電子郵件地址**：輸入你的 Email
   - 勾選同意條款
   - 點擊「建立」（Create）

4. **記錄 Channel 資訊**
   - 建立完成後，會顯示 Channel 詳細資訊
   - **記錄以下兩個值**：
     - **Channel ID** → 這是 `LINE_CHANNEL_ID`
     - **Channel Secret** → 點擊「顯示」（Show）後複製，這是 `LINE_CHANNEL_SECRET`

---

### B2：建立 LIFF App

#### 步驟 1：前往 LIFF 設定頁面

1. **在 Channel 頁面中**
   - 點擊上方的「LIFF」標籤

2. **點擊「新增」（Add）**
   - 會開啟 LIFF App 建立表單

#### 步驟 2：填寫 LIFF App 資訊

1. **LIFF app name**
   - 輸入：`LINE LIFF Calendar`

2. **Size**
   - 選擇：**Full**（全螢幕）

3. **Endpoint URL**
   - **目前先輸入**：`https://localhost:8080`
   - ⚠️ 注意：這是暫時的，稍後部署後會更新為真實的 URL
   - 如果使用 ngrok 測試，可以輸入 ngrok 的 URL

4. **Scope**
   - 勾選：**profile**（取得使用者基本資料）
   - 勾選：**openid**（使用 OpenID Connect）

5. **Bot link feature**
   - 選擇：**On**（開啟）

6. **點擊「新增」（Add）**

#### 步驟 3：記錄 LIFF ID

1. **建立完成後**
   - 會顯示 LIFF App 的詳細資訊
   - **記錄 LIFF ID** → 這是 `LIFF_ID`
   - LIFF ID 格式類似：`1234567890-abcdefgh`

---

## 🔐 第三部分：填入環境變數

### 步驟 1：開啟 .env 檔案

```powershell
notepad .env
```

### 步驟 2：填入 Google API 設定

將以下值替換為你剛才記錄的值：

```env
# Google API 設定
GOOGLE_SERVICE_ACCOUNT_EMAIL=line-liff-calendar-sa@your-project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n你的完整私鑰內容\n-----END PRIVATE KEY-----\n"
GOOGLE_PROJECT_ID=your-project-id

# Google Calendar 設定
GROUP_CALENDAR_ID=your-calendar-id@group.calendar.google.com

# Google Sheets 設定
MEMBER_SHEET_ID=你的SheetID
MEMBER_SHEET_NAME=工作表1
```

**⚠️ 重要提醒：**

1. **GOOGLE_PRIVATE_KEY 格式**
   - 必須保留完整的私鑰格式
   - 必須用雙引號 `"` 包起來
   - 換行符號必須是 `\n`（不要用實際的換行）
   - 範例：
     ```env
     GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
     ```

2. **如何正確複製私鑰**
   - 從 JSON 檔案中複製 `private_key` 的值
   - 確保包含開頭的 `-----BEGIN PRIVATE KEY-----` 和結尾的 `-----END PRIVATE KEY-----`
   - 確保換行符號是 `\n`（JSON 檔案中應該已經是這樣）

### 步驟 3：填入 LINE LIFF 設定

```env
# LINE LIFF 設定
LIFF_ID=1234567890-abcdefgh
LINE_CHANNEL_ID=1234567890
LINE_CHANNEL_SECRET=abcdefghijklmnopqrstuvwxyz123456
```

### 步驟 4：確認伺服器設定

```env
# 伺服器設定
PORT=8080
NODE_ENV=development
```

**注意**：開發環境使用 `development`，部署時才改為 `production`

### 步驟 5：儲存檔案

- 按 `Ctrl + S` 儲存
- 關閉記事本

---

## ✅ 第四部分：驗證設定

### 步驟 1：重新啟動伺服器

1. **如果伺服器還在運行，先停止**
   - 回到 PowerShell 視窗
   - 按 `Ctrl + C`

2. **重新啟動伺服器**
   ```powershell
   npm run dev
   ```

### 步驟 2：檢查是否有錯誤

**成功的標誌：**
```
🚀 伺服器已啟動在 http://localhost:8080
📅 環境: development
```

**如果看到錯誤：**

❌ **錯誤：`Google Service Account 認證失敗`**
- 檢查 `GOOGLE_PRIVATE_KEY` 格式是否正確
- 確認私鑰有正確的換行符號 `\n`
- 確認私鑰有雙引號包起來

❌ **錯誤：`缺少必要的 Google API 環境變數設定`**
- 檢查所有 Google API 相關的環境變數是否都已填入
- 確認沒有拼寫錯誤

❌ **錯誤：`無法讀取 Google Calendar`**
- 確認 Service Account Email 已加入日曆的共用者
- 確認 Calendar ID 正確

❌ **錯誤：`無法讀取 Google Sheets`**
- 確認 Service Account Email 已加入 Sheets 的共用者
- 確認 Sheet ID 和 Sheet Name 正確

### 步驟 3：測試 API 端點

1. **保持伺服器運行**

2. **測試健康檢查**
   - 瀏覽器訪問：http://localhost:8080/health
   - 應該看到：`{"status":"ok","timestamp":"..."}`

3. **測試 LIFF ID API**
   - 瀏覽器訪問：http://localhost:8080/api/line/liff-id
   - 應該看到：`{"success":true,"data":{"liffId":"你的LIFF_ID"}}`

---

## 🎉 完成檢查

請確認以下項目都已完成：

- [x] ✅ Google Cloud 專案已建立
- [x] ✅ Calendar API 和 Sheets API 已啟用
- [x] ✅ Service Account 已建立並下載 JSON 金鑰
- [x] ✅ Google Calendar 已建立並設定共用
- [x] ✅ Calendar ID 已取得
- [x] ✅ Google Sheets 已建立並設定共用
- [x] ✅ Sheet ID 已取得
- [x] ✅ LINE Channel 已建立
- [x] ✅ Channel ID 和 Channel Secret 已記錄
- [x] ✅ LIFF App 已建立
- [x] ✅ LIFF ID 已記錄
- [x] ✅ 所有環境變數已填入 .env 檔案
- [x] ✅ 伺服器可以正常啟動（沒有認證錯誤）

---

## 🆘 常見問題排除

### Q1: GOOGLE_PRIVATE_KEY 格式錯誤

**錯誤訊息**：`Invalid key format` 或 `Cannot parse private key`

**解決方法**：
1. 確認私鑰有雙引號包起來
2. 確認換行符號是 `\n`（不是實際的換行）
3. 確認包含完整的 `-----BEGIN PRIVATE KEY-----` 和 `-----END PRIVATE KEY-----`
4. 從 JSON 檔案中直接複製 `private_key` 的值（不要手動輸入）

### Q2: 無法存取 Google Calendar

**錯誤訊息**：`Calendar not found` 或 `Permission denied`

**解決方法**：
1. 確認 Service Account Email 已加入日曆的共用者
2. 確認權限是「可以變更活動」（不是「僅查看」）
3. 確認 Calendar ID 正確（格式：`xxx@group.calendar.google.com`）

### Q3: 無法存取 Google Sheets

**錯誤訊息**：`Unable to parse range` 或 `Permission denied`

**解決方法**：
1. 確認 Service Account Email 已加入 Sheets 的共用者
2. 確認權限是「編輯者」（不是「檢視者」）
3. 確認 Sheet ID 正確（從網址中取得）
4. 確認 Sheet Name 正確（預設是「工作表1」）

### Q4: LIFF 無法初始化

**錯誤訊息**：`LIFF initialization failed`

**解決方法**：
1. 確認 LIFF_ID 正確
2. 確認 LIFF Endpoint URL 設定正確
3. 如果使用 ngrok，確認 ngrok URL 已更新到 LINE Developers Console

---

## 📝 下一步

完成第二步後，你可以：

1. **測試應用程式功能**
   - 使用 ngrok 測試 LINE LIFF
   - 測試行事曆功能
   - 測試成員管理功能

2. **開始開發新功能**
   - 根據需求調整程式碼
   - 測試各個功能

3. **準備部署**
   - 參考 `DEPLOYMENT.md` 了解部署流程

---

**完成這一步後，告訴我「已完成」，我們就可以開始測試應用程式了！** 🚀
