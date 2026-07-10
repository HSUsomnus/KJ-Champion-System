# 用 ngrok 測試 LINE 功能（詳細步驟）

> 適用版本：v1.5.0
> 本系統使用 **LINE Login OAuth**，不依賴 LIFF SDK。

---

## 安全提醒（必讀）

- ngrok 會把本機伺服器暴露到網際網路，拿到 ngrok URL 的人可以對你的後端發請求
- **不要**把 ngrok URL 貼到公開場合（社群、截圖、影片）
- **測試完就關閉 ngrok**，不要長時間開著
- `.env`、`Key/` 資料夾永遠不推上 GitHub，不在 log 裡印出金鑰

---

## 一、事前準備

確認以下都已就緒：

- [ ] Node.js 18+ 已安裝
- [ ] 已執行 `npm install`
- [ ] `.env` 已填妥（`LINE_LOGIN_CHANNEL_ID`、`LINE_LOGIN_CHANNEL_SECRET`、`DATABASE_URL`、Google 相關變數）
- [ ] 本機 `npm run dev` 可以啟動，瀏覽器開 `http://localhost:8080?dev=1` 看得到畫面

---

## 二、安裝並設定 ngrok

### 步驟 1：安裝

選擇以下其中一種方式：

```bash
# 方式 A：npm 全域安裝
npm install -g ngrok

# 方式 B：官網下載執行檔
# https://ngrok.com/download（選 Windows，解壓縮後加入 PATH）
```

### 步驟 2：設定 Auth Token（每台電腦只需做一次）

1. 前往 `https://ngrok.com/` 註冊免費帳號
2. 登入後到 Dashboard → Auth 複製你的 **Authtoken**
3. 執行：

```bash
ngrok config add-authtoken 你的TOKEN
```

---

## 三、啟動方式

### 方式 A：同時啟動伺服器 + ngrok（推薦）

```bash
npm run dev:ngrok
```

`concurrently` 會同時啟動 nodemon 伺服器與 ngrok，終端機會顯示：

```text
[0] 伺服器已啟動在 http://localhost:8080
[1] Forwarding  https://abc123.ngrok-free.app -> http://localhost:8080
```

複製 `https://` 開頭的網址，這就是你的**對外網址**。

### 方式 B：分開啟動（兩個終端機）

```bash
# 終端機 1
npm run dev

# 終端機 2
npm run ngrok
```

---

## 四、設定 LINE Developers Console

取得 ngrok HTTPS URL 後，填入 LINE Developers Console（`https://developers.line.biz/console/`）：

### LINE Login Channel（測試 LINE Login）

1. 進入你的 **LINE Login Channel**
2. 點上方 **「Basic settings」** 標籤
3. 找到 **Callback URL**，填入：

   ```text
   https://你的ngrok網址/api/auth/line-callback
   ```

4. 按 **Update** 儲存

### LINE Messaging API Channel（測試 LINE BOT，選擇性）

1. 進入你的 **Messaging API Channel**
2. 點上方 **「Messaging API」** 標籤
3. 找到 **Webhook URL**，填入：

   ```text
   https://你的ngrok網址/api/line/webhook
   ```

4. 開啟 **Use webhook**，按 **Update** 儲存

---

## 五、更新本機 .env

將 `APP_URL` 改為 ngrok URL，LINE OAuth 回調才能正確導向：

```env
APP_URL=https://你的ngrok網址
```

更新後**重啟伺服器**（如果是分開啟動的話）：

```bash
# 按 Ctrl+C 停止 nodemon，再執行
npm run dev
```

若使用 `npm run dev:ngrok`，修改 `.env` 後 nodemon 會自動重啟伺服器，只需確認 APP_URL 已更新即可。

---

## 六、實際測試

### 測試 LINE Login（電腦瀏覽器）

在電腦 Chrome/Edge 開啟：

```text
https://你的ngrok網址
```

應看到「使用 LINE 帳號登入」按鈕，點下去會跳轉 LINE 登入，登入後回到應用程式。

### 測試 LINE Login（手機 LINE 瀏覽器）

將 ngrok URL 傳給自己，在手機 LINE 點開：

```text
https://你的ngrok網址
```

在 LINE 內建瀏覽器開啟，可測試完整的手機體驗。

### 測試確認清單

- [ ] 點「使用 LINE 帳號登入」能跳轉到 LINE OAuth 頁面
- [ ] 登入後成功回到應用程式，看到月曆主頁
- [ ] localStorage 有存入 `lineUserId`、`displayName`、`pictureUrl`
- [ ] 行程列表、成員、個人頁正常載入
- [ ] LINE BOT Webhook 事件有進到伺服器（可看 ngrok 的 `http://localhost:4040` 流量監控）

---

## 七、ngrok 流量監控

ngrok 啟動後，可開啟：

```text
http://localhost:4040
```

這是 ngrok 的本機 Web UI，可以查看所有進出的 HTTP 請求與回應，方便除錯。

---

## 八、測試完後（安全收尾）

1. **關閉 ngrok**：按 `Ctrl+C`（或關閉 `npm run dev:ngrok` 的終端機）
2. **還原 .env**：把 `APP_URL` 改回正式環境網址或 `http://localhost:8080`
3. **LINE Developers Console**：
   - 若已有正式環境（Vercel）：把 Callback URL 改回正式網址
   - 若暫時沒有正式環境：維持 ngrok URL 即可（ngrok 已關，URL 已失效）
4. **不要**把 ngrok URL 推上 GitHub 或貼到公開場合

---

## 九、常見問題

### Q：ngrok 顯示 "Session Expired"

免費帳號有時間限制。重新執行：

```bash
ngrok config add-authtoken 你的TOKEN
npm run ngrok
```

### Q：LINE Login 回調後出現錯誤

- 確認 `APP_URL` 與目前 ngrok URL 一致
- 確認 LINE Developers Console 的 Callback URL 已更新為最新 ngrok URL
- 免費版 ngrok 每次重開都會換 URL，每次都要重複更新

### Q：ngrok 頁面顯示 "ERR_NGROK_3200"（Visitor Browser Warning）

首次透過 ngrok 訪問時，ngrok 會顯示一個警告頁，點「Visit Site」即可繼續。這只在首次訪問時出現。

### Q：Webhook 沒收到事件

- 確認 ngrok 正在運行（`http://localhost:4040` 可以訪問）
- 確認 LINE Developers Console 的 Webhook URL 已更新
- 確認 `Use webhook` 已開啟
- 確認本機伺服器正在運行

---

## 十、一句話總結

```text
npm run dev:ngrok
→ 複製 https URL
→ 更新 LINE Developers Console Callback URL
→ 更新 .env 的 APP_URL
→ 瀏覽器開啟 ngrok URL 測試 LINE Login
→ 測試完後 Ctrl+C 關閉，還原設定
```
