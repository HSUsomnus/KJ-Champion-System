# 🛠️ 詳細開發環境設定指南（Windows）

這份指南會一步一步帶你完成開發環境的設定，適合完全沒有經驗的初學者！

## 📋 第一步：檢查與安裝 Node.js

### 步驟 1.1：檢查是否已安裝 Node.js

1. **開啟 PowerShell 或命令提示字元（CMD）**
   - 按 `Win + X`，選擇「Windows PowerShell」或「終端機」
   - 或按 `Win + R`，輸入 `cmd`，按 Enter

2. **輸入以下命令檢查版本**：
   ```powershell
   node --version
   npm --version
   ```

3. **如果顯示版本號碼**（例如 `v18.17.0`），恭喜！你可以跳到下一步。
   
4. **如果顯示「找不到命令」或錯誤**，請繼續下面的安裝步驟。

### 步驟 1.2：安裝 Node.js（如果還沒安裝）

1. **前往 Node.js 官網下載**
   - 開啟瀏覽器，前往：https://nodejs.org/
   - 點擊左邊的 **LTS 版本**（推薦，例如 v20.x.x）
   - 下載 Windows Installer（.msi 檔案）

2. **執行安裝程式**
   - 雙擊下載的 `.msi` 檔案
   - 點擊「Next」直到安裝完成
   - **重要**：安裝過程中確保勾選「Add to PATH」選項

3. **驗證安裝**
   - 關閉並重新開啟 PowerShell
   - 再次執行：
     ```powershell
     node --version
     npm --version
     ```
   - 應該會顯示版本號碼

## 📂 第二步：準備專案資料夾

### 步驟 2.1：確認專案位置

你的專案應該在：`C:\Users\hu199\OneDrive\桌面\Line_Liff`

如果不在這個位置，請：
1. 開啟檔案總管
2. 找到專案資料夾
3. 在資料夾內按右鍵 → 選擇「在終端機中開啟」或「Open in Terminal」

### 步驟 2.2：確認專案檔案

在 PowerShell 中執行：
```powershell
ls
```

你應該會看到以下檔案和資料夾：
- `package.json` ✅
- `server/` 資料夾 ✅
- `public/` 資料夾 ✅
- `env.example` ✅

如果沒有看到這些檔案，請確認你在正確的資料夾中。

## 📦 第三步：安裝專案依賴套件

### 步驟 3.1：安裝 npm 套件

在 PowerShell 中執行（確保你在專案資料夾中）：

```powershell
npm install
```

**這個步驟會做什麼？**
- 讀取 `package.json` 檔案
- 下載所有需要的套件（express、googleapis 等）
- 安裝到 `node_modules` 資料夾

**需要多久？**
- 通常需要 1-3 分鐘，取決於網路速度
- 第一次安裝會比較久

**成功的話會看到：**
```
added 150 packages, and audited 151 packages in 2m
```

**如果遇到錯誤：**
- **錯誤：`npm ERR! code EACCES`**
  - 解決方法：以系統管理員身分執行 PowerShell
  - 右鍵點擊 PowerShell → 「以系統管理員身分執行」

- **錯誤：`npm ERR! network`**
  - 檢查網路連線
  - 可能需要設定代理伺服器

### 步驟 3.2：驗證安裝

檢查 `node_modules` 資料夾是否已建立：

```powershell
Test-Path node_modules
```

如果顯示 `True`，表示安裝成功！✅

## 🔐 第四步：設定環境變數

### 步驟 4.1：複製環境變數範例檔案

在 PowerShell 中執行：

```powershell
Copy-Item env.example .env
```

**這個命令會做什麼？**
- 複製 `env.example` 檔案
- 建立一個新的 `.env` 檔案（這個檔案用來儲存你的設定）

### 步驟 4.2：開啟 .env 檔案進行編輯

**方法一：使用記事本**
```powershell
notepad .env
```

**方法二：使用 VS Code（如果已安裝）**
```powershell
code .env
```

**方法三：直接在檔案總管中**
- 找到 `.env` 檔案
- 右鍵 → 「開啟方式」→ 選擇「記事本」

### 步驟 4.3：填入環境變數

`.env` 檔案內容應該像這樣：

```env
# Google API 設定
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_PROJECT_ID=your-project-id

# Google Calendar 設定
GROUP_CALENDAR_ID=your-group-calendar-id@group.calendar.google.com

# Google Sheets 設定
MEMBER_SHEET_ID=your-google-sheet-id
MEMBER_SHEET_NAME=成員資料

# LINE LIFF 設定
LIFF_ID=your-liff-id
LINE_CHANNEL_ID=your-channel-id
LINE_CHANNEL_SECRET=your-channel-secret

# 伺服器設定
PORT=8080
NODE_ENV=production
```

**⚠️ 重要提醒：**
- 目前先**不要修改**這些值
- 我們會在後續步驟中取得真實的值
- 先儲存檔案（Ctrl + S）

## ✅ 第五步：驗證基本設定

### 步驟 5.1：測試伺服器是否可以啟動

在 PowerShell 中執行：

```powershell
npm run dev
```

**預期結果：**
- 可能會看到一些錯誤訊息（這是正常的，因為環境變數還沒設定）
- 但應該會看到類似這樣的訊息：
  ```
  🚀 伺服器已啟動在 http://localhost:8080
  ```

**如果看到錯誤：**
- **錯誤：`Error: Cannot find module 'express'`**
  - 解決方法：執行 `npm install` 重新安裝

- **錯誤：`Port 8080 is already in use`**
  - 解決方法：關閉其他使用 8080 埠的程式，或修改 `.env` 中的 `PORT=8081`

**停止伺服器：**
- 按 `Ctrl + C` 停止伺服器

### 步驟 5.2：測試健康檢查端點

1. **保持伺服器運行**（`npm run dev`）

2. **開啟瀏覽器**，前往：
   ```
   http://localhost:8080/health
   ```

3. **應該會看到：**
   ```json
   {"status":"ok","timestamp":"2026-01-26T..."}
   ```

如果看到這個回應，恭喜！你的基本開發環境已經設定完成了！🎉

## 📝 下一步：設定 Google API 和 LINE LIFF

現在基本環境已經設定好了，接下來需要：

1. **設定 Google Cloud 專案**（參考 `SETUP.md` 第 3 節）
2. **設定 LINE LIFF**（參考 `SETUP.md` 第 4 節）
3. **填入真實的環境變數值**

## 🆘 常見問題排除

### Q1: PowerShell 顯示「無法辨識 'npm' 為 Cmdlet、函數、指令碼檔案或可執行程式」

**原因**：Node.js 沒有正確安裝或 PATH 環境變數沒有設定

**解決方法**：
1. 重新安裝 Node.js（確保勾選「Add to PATH」）
2. 重新啟動 PowerShell
3. 如果還是不行，手動將 Node.js 加入 PATH：
   - 右鍵「本機」→「內容」→「進階系統設定」
   - 「環境變數」→ 編輯「Path」
   - 新增：`C:\Program Files\nodejs\`

### Q2: npm install 很慢或失敗

**原因**：網路連線問題或使用預設的 npm registry

**解決方法**：
1. 使用淘寶鏡像（中國大陸）：
   ```powershell
   npm config set registry https://registry.npmmirror.com
   ```

2. 或使用官方 registry：
   ```powershell
   npm config set registry https://registry.npmjs.org
   ```

### Q3: 找不到 .env 檔案

**原因**：檔案可能被隱藏了

**解決方法**：
1. 在檔案總管中，點擊「檢視」→ 勾選「隱藏的項目」
2. 或在 PowerShell 中顯示所有檔案：
   ```powershell
   Get-ChildItem -Force
   ```

### Q4: 修改 .env 後沒有生效

**原因**：伺服器需要重新啟動

**解決方法**：
1. 停止伺服器（Ctrl + C）
2. 重新啟動：`npm run dev`

## 📚 相關文件

- **快速開始**：`QUICKSTART.md`
- **完整設定指南**：`SETUP.md`
- **部署指南**：`DEPLOYMENT.md`

---

**完成這一步後，你的開發環境就準備好了！** 🎉

接下來可以開始設定 Google API 和 LINE LIFF，讓應用程式真正運作起來！
