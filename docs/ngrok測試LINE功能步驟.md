# 用 ngrok 測試 LINE 相關功能（詳細步驟）

> **資安為最高原則**：請先讀完「資安提醒」再開始，測試期間與測試後都要遵守。

---

## ⚠️ 資安風險為最高原則（必讀）

### 1. 測試前、測試中

- **ngrok 會把你的本機伺服器暴露到網際網路**。拿到你 ngrok 網址的人，都可以對你的後端發請求。
- **絕對不要**把 ngrok 網址貼到公開場合（社群、論壇、截圖、影片）。只在自己裝置與 LINE Developers 後台使用。
- **.env、Key/ 資料夾**不會透過網址「傳出去」，但你的**後端 API**（例如 `/api/calendar`）會對外開放。若有金鑰外洩在程式碼或 log 裡，可能被利用。
- **測試完就關閉 ngrok**，不要長時間開著。關閉後該網址就失效，別人無法再連。
- 本機執行時，**不要**在程式碼或 log 裡印出金鑰、Channel Secret、私鑰。若有 `console.log(process.env.XXX)` 請移除或改印長度。

### 2. LINE Developers 設定

- **LIFF Endpoint URL** 改成 ngrok 網址後，**只有你知道**該 LIFF 的實際後端在哪。測試結束後建議：
  - 若已部署正式環境：把 Endpoint URL **改回正式網址**（例如 `https://xxx.run.app`）。
  - 若暫時不部署：可先改回 `https://localhost:8080` 或留 ngrok 網址但**關閉 ngrok**，避免 LIFF 指到失效網址。
- **Channel Secret** 只存在後端（.env），不要寫進前端、不要推上 GitHub、不要用 ngrok 網址當作「分享連結」到處傳。

### 3. 測試後

- 關閉 ngrok 與本機伺服器。
- 若曾把 ngrok 網址給別人或貼到任何地方，**當作可能外洩**：關閉該次 ngrok session，下次測試用新網址；必要時到 LINE Developers 重新檢查 / 輪替設定。
- 金鑰、.env、Key/ 永遠不進 Git、不進截圖、不進公開文件。

**同意以上原則再進行下列步驟。**

---

## 一、事前準備

### 1. 本機環境已就緒

- [ ] 已安裝 Node.js（建議 18+）
- [ ] 專案已 `npm install`
- [ ] `.env` 已設定好（含 `LIFF_ID`、`LINE_CHANNEL_ID`、`LINE_CHANNEL_SECRET`、Google 相關變數），且 **.env 與 Key/ 絕不推上 GitHub**
- [ ] 本機曾成功執行過 `npm start` 或 `npm run dev`，且瀏覽器開 `http://localhost:8080` 可看到畫面

### 2. LINE Developers 已建立 LIFF

- [ ] 已有 Channel
- [ ] 已建立 LIFF App，並取得 **LIFF ID**（已寫入 .env）
- [ ] 目前 LIFF 的 **Endpoint URL** 可以先隨便填（例如 `https://localhost:8080`），下面會改成 ngrok 網址

---

## 二、安裝 ngrok

### 步驟 1：下載並安裝

1. 開啟：**https://ngrok.com/download**
2. 選擇你的作業系統（例如 Windows）下載。
3. 解壓縮得到 `ngrok.exe`（Windows），放到你方便的路徑（例如 `C:\ngrok`），或加入系統 PATH。

### 步驟 2：註冊並取得 Auth Token（免費帳號）

1. 到 **https://ngrok.com/** 註冊免費帳號（可用 Google / GitHub 登入）。
2. 登入後：**Your Authtoken**（或 Dashboard → Auth）：複製你的 **Authtoken**。
3. 在本機終端機執行（把 `你的token` 換成實際 token）：

   ```bash
   ngrok config add-authtoken 你的token
   ```

   之後同一台電腦不需重複設定。

---

## 三、啟動本機伺服器

1. 在專案資料夾（`Line_Liff`）開**第一個**終端機。
2. 執行：

   ```bash
   npm start
   ```

   （或 `npm run dev`，依你習慣。）
3. 看到類似 `伺服器已啟動在 http://localhost:8080` 即表示成功。
4. **保持這個終端機開著**，不要關閉。

---

## 四、啟動 ngrok

1. 開**第二個**終端機（本機伺服器繼續跑）。
2. 執行：

   ```bash
   ngrok http 8080
   ```

   （若你的伺服器用其他 port，把 `8080` 改成該 port。）
3. 終端機會出現類似：

   ```
   Forwarding   https://abc123xyz.ngrok-free.app -> http://localhost:8080
   ```

4. **複製 `https://` 開頭的那一串網址**（例如 `https://abc123xyz.ngrok-free.app`），這就是你的**對外網址**。
5. **免費版**：每次重開 ngrok，網址都會變，所以每次測試都要重新到 LINE Developers 改 Endpoint URL。

---

## 五、在 LINE Developers 設定 LIFF Endpoint URL

1. 開啟 **https://developers.line.biz/console/**
2. 點進你的 **Channel**。
3. 上方選 **「LIFF」** 標籤。
4. 點你建立的 **LIFF App**（例如 LINE LIFF Calendar）。
5. 找到 **Endpoint URL**，改成你剛複製的 **ngrok 網址**（例如 `https://abc123xyz.ngrok-free.app`）。
   - **不要**加結尾斜線，**不要**加 `?dev=0`；就只填根網址。
   - 必須是 **https**。
6. 按 **Update** 儲存。

---

## 六、實際測試 LINE 相關功能

### ⚠️ 重要：不要直接點 ngrok 網址

| 開啟方式 | 結果 |
|----------|------|
| **直接點 ngrok 網址**（例如把 `https://xxx.ngrok-free.dev` 傳到聊天室再點） | LINE 會用「一般瀏覽器」開，**不會**帶 LIFF 情境 → 畫面上會出現「請在 LINE App 內開啟以使用完整功能」，分享字卡等會變成文字。 |
| **點 LIFF 網址**（`https://liff.line.me/你的LIFF_ID`） | LINE 會以 **LIFF** 方式開啟並導向你的 Endpoint（ngrok），`liff.isInClient()` 為 true，字卡／分享等才正常。 |

**結論：在 LINE 裡要開「LIFF 網址」，不要開「ngrok 網址」。**

---

### 方式 A：在手機 LINE 裡開 LIFF（推薦）

1. **LIFF 網址**（從 LINE Developers Console → 你的 LIFF 可看到 LIFF ID，或「LIFF app URL」）：
   - 首頁：`https://liff.line.me/你的LIFF_ID`
   - 成員頁（測邀請字卡）：`https://liff.line.me/你的LIFF_ID/members.html`
   - 成員頁 + 極簡字卡測試：`https://liff.line.me/你的LIFF_ID/members.html?minimal=1`
2. 用手機 **LINE** 開**上面其中一個 LIFF 連結**（可把連結傳給自己或從官方帳號選單點進去）。
3. 會在 LINE 內以 **LIFF 情境**開啟（不會出現「請在 LINE App 內開啟」橫幅），並走真實 LINE 登入。
4. 可測試：登入、行事曆、列表、成員、邀請字卡、分享、關閉視窗等。

### 方式 B：在電腦瀏覽器開（需 LINE 登入）

1. 在電腦 Chrome / Edge 開：**你的 ngrok 網址** + `?dev=0`  
   例如：`https://abc123xyz.ngrok-free.app/?dev=0`
2. 會出現「使用 LINE 登入」；按下去會跳轉 LINE 登入，登入後會回到你的 LIFF。
3. `?dev=0` 表示關閉開發模式，使用真實 LINE 帳號。

### 測試時可確認

- [ ] LINE 登入成功、可看到行事曆
- [ ] 行程列表、成員、個人頁正常
- [ ] 新增／編輯／刪除行程（若有權限）
- [ ] 分享到 LINE（LIFF share）
- [ ] 關閉 LIFF 回到 LINE

---

## 七、測試完後（資安收尾）

1. **關閉 ngrok**：在執行 `ngrok http 8080` 的那個終端機按 **Ctrl+C**，結束 ngrok。
2. **關閉本機伺服器**：在執行 `npm start` 的終端機按 **Ctrl+C**。
3. **LIFF Endpoint URL**：
   - 若你已有正式環境（例如 Cloud Run）：回 LINE Developers 把 Endpoint URL **改回正式網址**。
   - 若還沒有正式環境：可改回 `https://localhost:8080`，或先維持 ngrok 網址但因為 ngrok 已關，該網址會失效，下次測試再換新 ngrok 網址並更新。
4. **不要**把 ngrok 網址、LIFF 連結、Channel Secret、任何金鑰貼到公開處或推上 GitHub。

---

## 八、常見問題

### Q1：ngrok 顯示 "Session Expired" 或要登入

- 免費帳戶有時會限時，或需重新登入。到 https://ngrok.com 登入，再執行一次 `ngrok config add-authtoken 你的token`。

### Q2：LINE 登入後出現「無法提供安全連線」或 ERR_SSL_PROTOCOL_ERROR

- LIFF Endpoint URL 必須是 **https**，且是**目前正在跑的 ngrok 網址**。
- 確認你填的是 ngrok 給的 **https** 網址，不是 `http://localhost:8080`。

### Q3：LIFF 一片白或初始化失敗

- 確認 Endpoint URL 與目前 ngrok 網址**完全一致**（免費版每次重開 ngrok 都會變）。
- 確認本機伺服器有跑、ngrok 有跑，且瀏覽器直接開 `https://你的ngrok網址` 可看到你的畫面。

### Q4：換電腦或重開 ngrok，網址變了

- 免費版每次重開 ngrok 會換網址。每次都要到 LINE Developers 把 **LIFF Endpoint URL** 改成**新的** ngrok https 網址，否則 LINE 會連到舊的失效網址。

---

## 九、一句話總結

1. **資安第一**：不分享 ngrok 網址、不洩漏金鑰、測試完就關 ngrok，並把 LIFF Endpoint 改回正式或 localhost。
2. **順序**：本機 `npm start` → 開 ngrok `ngrok http 8080` → 複製 **https** 網址 → 到 LINE Developers 改 LIFF Endpoint URL → 用手機 LINE 或電腦瀏覽器 `?dev=0` 測試。
3. **結束**：Ctrl+C 關 ngrok 與本機伺服器，並依是否有正式環境更新或還原 LIFF Endpoint URL。

依照這份步驟與資安提醒，即可用 ngrok 安全地測試 LINE 相關功能。
