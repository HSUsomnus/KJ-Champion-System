# 大版本更新：LIFF 內讀取用戶個人 Google 日曆

> 本方案規劃「每個人在 LIFF 裡可以連結自己的 Google 日曆，並在此 LIFF 中讀取該用戶個人 Google 日曆的行程」，預計於下一版本實作。

---

## 一、目標（一句話）

**現狀**：所有人看到的是同一個「團體日曆」。  
**目標**：每位用戶可選擇「連結我的 Google 日曆」，之後在此 LIFF 內讀取**該用戶個人 Google 日曆**的行程。

---

## 二、做法概述

- 後端新增 **Google OAuth 2.0** 授權流程（不是只用現在的 Service Account）。
- 每位用戶透過瀏覽器完成一次「用 Google 帳號授權此應用讀取我的日曆」。
- 後端將取得的 **refresh_token** 依 **LINE userId** 儲存，之後用該 token 呼叫 Google Calendar API 讀取該用戶的 **primary**（主日曆）行程。
- LIFF 前端提供「連結我的 Google 日曆」按鈕，並可切換顯示「團體日曆」或「我的 Google 日曆」。

---

## 三、實作項目清單

### 1. Google 雲端專案設定（OAuth）

| 項目 | 說明 |
|------|------|
| 憑證類型 | 在 [Google Cloud Console](https://console.cloud.google.com/) → **API 與服務 → 憑證** 建立 **OAuth 2.0 用戶端 ID**（應用程式類型：**網頁應用程式**）。 |
| 重新導向 URI | 新增一筆：`https://你的後端網域/api/auth/google/callback`（須與實際部署網域一致）。 |
| 權限範圍（scope） | 至少：`https://www.googleapis.com/auth/calendar.readonly`；若需寫入用戶日曆則改為 `https://www.googleapis.com/auth/calendar`。 |

### 2. 後端：OAuth 流程與權杖儲存

| 項目 | 說明 |
|------|------|
| 新增路由 | **開始授權**：`GET /api/auth/google` — 組出 Google 授權網址（含 client_id、redirect_uri、scope、state），並以 302 導向該網址。**state 須帶入目前使用者的 LINE userId**（或 LIFF 辨識用 id）。 |
| 回調路由 | **授權完成**：`GET /api/auth/google/callback` — 接收 Google 回傳的 `code` 與 `state`，用 code 換取 `access_token` 與 `refresh_token`，依 state 中的 LINE userId 將 **refresh_token** 寫入儲存。 |
| 權杖儲存 | 以「LINE userId」為 key，儲存 refresh_token（可選：access_token、過期時間）。可存於資料庫、Google Sheet（當簡易 DB）或現有後端儲存，須注意安全與隱私。 |
| 換 token | 需要讀取該用戶日曆時，用該用戶的 refresh_token 向 Google 換取 access_token，再呼叫 Calendar API。 |

### 3. 後端：用用戶權杖讀取個人日曆

| 項目 | 說明 |
|------|------|
| 現有邏輯 | 維持現有 Service Account + 團體日曆（`GROUP_CALENDAR_ID`）不變。 |
| 新增邏輯 | 依「LINE userId」取得該用戶的 Google refresh_token → 建立 OAuth2 客戶端 → 取得 Calendar API 客戶端 → 呼叫 `calendar.events.list`，**calendarId 使用 `primary`**（該 Google 帳號的主日曆）。 |
| API 設計 | 可新增例如：`GET /api/calendar/my/events?start=...&end=...`，後端從 request 帶入的 LINE userId（或 session/cookie）取得對應 refresh_token，僅回傳該用戶個人日曆行程。 |

### 4. LIFF 前端：連結與顯示

| 項目 | 說明 |
|------|------|
| 按鈕 | 在設定頁或首頁加入「**連結我的 Google 日曆**」按鈕。 |
| 觸發流程 | 點擊後向後端取得授權網址（例如呼叫 `GET /api/auth/google`，並在 state 帶入 `LIFF.getUserId()`），再以 `window.location.href = url` 或 `liff.openWindow({ url, external: true })` 開啟，讓用戶在瀏覽器／LINE 內建瀏覽器中完成 Google 登入與授權。 |
| 授權後導回 | Google 授權完成後導向 `https://你的網域/api/auth/google/callback?...`；後端存妥 token 後 302 導回 LIFF 網址（可帶 `?google_linked=1`），前端顯示「已連結成功」。 |
| 外部瀏覽器 | 若使用 `liff.openWindow` 開外部瀏覽器，需在 callback 頁面提示「請回到 LINE 繼續」，或改為在 LIFF 內建瀏覽器內完成 OAuth（不開 external），以利導回 LIFF。 |
| 顯示切換 | 可提供 UI 切換「團體日曆」／「我的 Google 日曆」，選「我的」時改呼叫上述「我的日曆」API 並顯示個人行程。 |

---

## 四、注意事項

- **安全性**：refresh_token 須妥善儲存（建議加密或存於受控環境），且僅供該 LINE 用戶對應的請求使用。
- **隱私與條款**：向用戶說明「會讀取你的 Google 日曆」並取得同意，必要時更新隱私政策與服務條款。
- **錯誤處理**：token 過期、用戶撤銷授權時，後端應回傳明確錯誤，前端提示「請重新連結 Google 日曆」。

---

## 五、檢查清單（下一版本實作時可依此逐項完成）

- [ ] Google Cloud 建立 OAuth 2.0 用戶端 ID，設定 redirect URI 與 scope
- [ ] 後端新增 `GET /api/auth/google`（組授權網址、state 帶 LINE userId）
- [ ] 後端新增 `GET /api/auth/google/callback`（換 token、存 refresh_token）
- [ ] 後端設計權杖儲存方式（DB / Sheet / 檔案）並實作讀寫
- [ ] 後端新增「依 LINE userId 用 refresh_token 讀 primary 日曆」的服務與 API（如 `/api/calendar/my/events`）
- [ ] LIFF 前端新增「連結我的 Google 日曆」按鈕與授權流程
- [ ] 授權完成後導回 LIFF 並顯示連結成功
- [ ] 前端可切換「團體日曆」／「我的 Google 日曆」並顯示對應行程
- [ ] 錯誤與重新連結的提示與流程

---

*文件建立日期：依專案紀錄。大版本更新，下一版實作。*
