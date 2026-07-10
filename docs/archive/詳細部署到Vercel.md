# 🚀 詳細部署到 Vercel

本文件說明如何將 **LINE LIFF 行事曆系統** 部署到 **Vercel**，讓你的應用擁有免費額度、自動 HTTPS、全球 CDN，以及 Git 推送即自動部署。

---

## 📋 一、事前準備

### 1. 你需要先有的東西

- **GitHub / GitLab / Bitbucket 帳號**（程式碼需放在上面，Vercel 從這裡拉程式部署）
- **Vercel 帳號**：到 [vercel.com](https://vercel.com) 註冊（可用 GitHub 登入）
- 本專案已在本地可正常執行（`npm run dev` 能跑、環境變數已設好）

### 2. 和 Cloud Run 的差異（心裡有數就好）

| 項目 | Cloud Run | Vercel |
|------|-----------|--------|
| 計費 | 依請求與資源使用 | 免費方案有額度，超出再計費 |
| 執行方式 | 常駐容器 | Serverless（每次請求才跑） |
| 靜態檔案 | 由 Express 提供 | 由 Vercel CDN 提供，**不用** Express 管 |
| 環境變數 | GCP 後台設定 | Vercel 專案 → Settings → Environment Variables |

---

## 🔧 二、專案要配合的程式調整

Vercel 跑的是 **Serverless**，需要「一個入口檔匯出 Express app」，且 **靜態檔（HTML/CSS/JS）要放在 `public/`**，由 Vercel 直接提供，不靠 `express.static()`。

### 步驟 1：讓 `server/server.js` 可以「只匯出 app」

目前 `server.js` 會直接 `app.listen(PORT)`。我們要改成：

- **在 Vercel 上**：只匯出 `app`，不執行 `listen`。
- **在本地**：照常 `listen`，方便你 `npm run dev`。

請在 **`server/server.js`** 做兩處修改：

**（1）檔案最底部**，把「啟動伺服器」那一段改成「有匯出 app，且只在非 Vercel 環境才 listen」：

找到這段：

```javascript
// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🚀 伺服器已啟動在 http://localhost:${PORT}`);
  ...
});
```

改成：

```javascript
// 在 Vercel 上不執行 listen，只匯出 app 給 Serverless 用
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 伺服器已啟動在 http://localhost:${PORT}`);
    console.log(`📅 環境: ${process.env.NODE_ENV || 'development'}`);
  });
}

// 供 Vercel Serverless 使用（必須匯出 app）
module.exports = app;
```

**（2）優雅關閉**（`SIGTERM` / `SIGINT`）可以保留，不影響 Vercel；若你想精簡，只在 `listen` 存在時註冊也可以。

### 步驟 2：新增 Vercel 的入口檔（根目錄）

Vercel 會從「專案根目錄」的 `index.js` 或 `server.js` 找 Express app。我們用一個很薄的入口檔即可。

在**專案根目錄**（和 `package.json` 同層）新增 **`index.js`**，內容：

```javascript
/**
 * Vercel Serverless 入口
 * 只負責把 Express app 轉交給 Vercel
 */
module.exports = require('./server/server.js');
```

這樣部署到 Vercel 時，就會用這支檔案當作單一 Serverless Function，所有請求都會進到你的 Express 路由。

### 步驟 3：靜態檔案（已有可略過）

- 你的前端已經在 **`public/`**（`index.html`、`list.html`、`css/`、`js/` 等），這樣就符合 Vercel 規定。
- Vercel 會自動把 **`public/**`** 當成靜態資源用 CDN 提供，**不會**經過 Express。
- 因此 `server.js` 裡的 `express.static(publicPath)` 在 Vercel 上等於不會用到，沒關係，保留也不會錯；在本地開發時一樣會用到。

### 步驟 4：（可選）根目錄 `vercel.json`

多數情況**不需要**建立 `vercel.json`，Vercel 會自動偵測 Node 專案、使用根目錄的 `index.js`，並自動把 **`public/`** 當成靜態資源由 CDN 提供。

若你想明確指定建置或輸出目錄，可在根目錄加 **`vercel.json`**，例如：

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "public"
}
```

- **`outputDirectory: "public"`**：表示靜態檔來自 `public/`（與本專案結構一致）。
- **不要**把「所有路徑」都 rewrite 到 `index.js`，否則靜態檔（HTML/CSS/JS）會變成 404；Vercel 預設會先對應 `public/` 的檔案，其餘請求才交給 Express。

---

## 🌐 三、在 Vercel 建立專案並連線 Git

### 1. 登入 Vercel

- 打開 [vercel.com](https://vercel.com) → 用 **GitHub**（或 GitLab / Bitbucket）登入。

### 2. 匯入專案

- 點 **Add New… → Project**。
- 選擇 **Import Git Repository**，選你放這個專案的 repo（例如 `你的帳號/Line_Liff`）。
- 若沒看到 repo，先到 **GitHub → Settings → Applications** 確認已授權 Vercel 存取該 repo。

### 3. 設定建置（Configure Project）

- **Framework Preset**：選 **Other**（我們是純 Node + Express，不是 Next/Nuxt）。
- **Root Directory**：維持 `./`（專案根目錄）。
- **Build Command**：可留空或填 `npm run build`（你目前 `package.json` 的 build 是 `echo 'Build completed'` 即可）。
- **Output Directory**：填 **`public`**（靜態檔輸出目錄；Vercel 會把這裡當靜態資源根目錄）。
- **Install Command**：預設 `npm install` 即可。

接著不要急著 Deploy，先到下一步設環境變數。

---

## 🔐 四、設定環境變數（重要）

在 Vercel 專案頁：**Settings → Environment Variables**。

把你在本地 **`.env`** 裡用到的變數，**一個一個**在 Vercel 新增（名稱與值都照抄，不要多空格）：

| 變數名稱 | 說明 | 備註 |
|----------|------|------|
| `NODE_ENV` | 執行環境 | 填 `production` |
| `APP_URL` | 應用對外網址 | **部署完成後**改成你的 Vercel 網址，例如 `https://你的專案.vercel.app`，**不要**結尾斜線 |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google 服務帳戶 Email | 從 GCP Service Account 複製 |
| `GOOGLE_PRIVATE_KEY` | 服務帳戶私鑰（PEM 整段） | 從 JSON 金鑰檔的 `private_key` 複製，保留 `\n` 換行，不要多餘引號 |
| `GOOGLE_PROJECT_ID` | GCP 專案 ID | |
| `GROUP_CALENDAR_ID` | 共用 Google 日曆 ID | |
| `MEMBER_SHEET_ID` | 成員 Google 試算表 ID | |
| `MEMBER_SHEET_NAME` | 試算表工作表名稱 | 例如 `成員資料` |
| `LIFF_ID` | LIFF App ID | LINE Developers → LIFF |
| `LINE_CHANNEL_ID` | Channel ID | |
| `LINE_CHANNEL_SECRET` | Channel Secret | |
| `LINE_CHANNEL_ACCESS_TOKEN` | Messaging API 長期 Token | |

**注意：**

- **`GOOGLE_PRIVATE_KEY`**：必須是完整 PEM（`-----BEGIN PRIVATE KEY-----` … `-----END PRIVATE KEY-----`），若從 JSON 貼上，只貼**值**的內容，不要連外層雙引號一起貼；換行用 `\n`（反斜線+n）。
- **`APP_URL`**：第一次部署可先填 `https://你的專案.vercel.app`，部署完成後再確認一次是否與實際網址一致（含自訂網域時要改）。

設完後儲存，再回到 **Deployments** 執行第一次 Deploy（或若你還沒 Deploy，就點 Deploy）。

---

## 🚀 五、執行部署

- 在 **Deploy** 頁點 **Deploy**，Vercel 會從 Git 拉程式、`npm install`、依你的設定建置並部署。
- 完成後會給你一個網址，例如：  
  `https://line-liff-calendar-xxxx.vercel.app`

### 部署後必做兩件事

1. **把 `APP_URL` 改成實際網址**  
   Settings → Environment Variables → 編輯 `APP_URL` → 改成上面這個網址（或你的自訂網域）→ 儲存後可再觸發一次 Redeploy。

2. **到 LINE Developers 更新 LIFF Endpoint URL**  
   - 開啟你的 Channel → **LIFF** 分頁 → 編輯 LIFF App。  
   - **Endpoint URL** 改成：`https://你的專案.vercel.app`（或自訂網域），**不要**結尾斜線。  
   - 儲存。

---

## ✅ 六、驗證部署是否成功

1. **健康檢查**  
   瀏覽器或 curl 打開：  
   `https://你的專案.vercel.app/health`  
   應回傳 JSON：`{"status":"ok","timestamp":"..."}`

2. **API**  
   `https://你的專案.vercel.app/api/line/liff-id`  
   應回傳你的 LIFF ID 等資訊（依你現有 API 實作）。

3. **在 LINE 裡開 LIFF**  
   從 LINE 聊天室或選單點進你的 LIFF，測試日曆、成員、個人資料等是否正常。

---

## 🐛 七、常見問題

### 1. 部署成功但開首頁 / 靜態檔 404

- 確認 **Output Directory** 為 **`public`**，且 repo 裡確實有 `public/` 與 `index.html`。
- 若你有改 `vercel.json` 的 `rewrites`，確認沒有把靜態路徑誤導到 `index.js` 而覆蓋掉 CDN。

### 2. 成員列表 / 個人資料出現 DECODER 錯誤

- 多半是 **`GOOGLE_PRIVATE_KEY`** 在 Vercel 環境變數裡格式錯誤（換行被吃掉、多餘引號）。
- 解法：到 Vercel → Settings → Environment Variables → 編輯 `GOOGLE_PRIVATE_KEY`，只貼 PEM 內容，換行用 `\n`，儲存後 Redeploy。

### 3. LIFF 開不起來或白畫面

- 檢查 LINE Developers 的 **LIFF Endpoint URL** 是否為你的 Vercel 網址（含 `https://`，無結尾斜線）。
- 用瀏覽器開發者工具看 Console / Network 錯誤（或參考專案內「手機 LINE 瀏覽器用 Eruda 看 Console」文件）。

### 4. 冷啟動較慢

- Vercel Serverless 一段時間沒請求會冷啟動，第一筆可能較慢，屬正常；之後同實例會變快。

### 5. 想用自訂網域

- Vercel 專案 → **Settings → Domains** → 新增你的網域，依畫面指示到 DNS 加上 CNAME 或 A 紀錄即可。
- 設好後記得把 **`APP_URL`** 和 **LIFF Endpoint URL** 改成自訂網域。

---

## 📊 八、之後的更新流程

- 程式碼 **push 到同一個 Git 分支**（例如 `main`）後，Vercel 會自動重新部署（若你有開 Auto Deploy）。
- 若關閉了自動部署，可到 Vercel 專案 **Deployments** 頁手動 **Redeploy**。
- 每次改環境變數後，要 **Redeploy** 一次新設定才會生效。

---

## 📞 九、參考連結

- [Vercel – Express 後端](https://vercel.com/docs/frameworks/backend/express)
- [Vercel – 環境變數](https://vercel.com/docs/environment-variables)
- [LINE LIFF 文件](https://developers.line.biz/en/docs/liff/)
- 本專案：`DEPLOYMENT.md`（Cloud Run）、`env.example`、`docs/LINE變數設定一覽.md`

---

**總結**：改好 `server.js` 匯出、加根目錄 `index.js`、在 Vercel 連 Git、設好環境變數與 Output Directory，部署後記得改 `APP_URL` 和 LIFF Endpoint URL，就可以在 Vercel 上穩定跑 LINE LIFF 行事曆。🎉
