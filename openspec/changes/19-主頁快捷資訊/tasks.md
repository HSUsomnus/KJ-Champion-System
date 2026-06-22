# Change 19 — 主頁快捷資訊 Tasks

## 後端（分支：`m_b_主頁快捷資訊_backend`）

### Section 1：system-links API

- [x] **19.1** `server/routes/line.js` 新增 `GET /api/line/system-links`
  - 讀 `LINE_ADD_FRIEND_URL`、`GROUP_CALENDAR_ID` env var
  - 回傳 `{ success: true, data: { lineAddFriendUrl, calendarAddUrl } }`
  - 兩個欄位若 env 未設則為 `null`
- [x] **19.2** 後端單元測試：`server/routes/__tests__/line-system-links.test.js`
  - case 1：兩個 env 都有設 → 正確回傳 URL
  - case 2：env 都沒設 → 兩個欄位都是 null
  - case 3：只有 LINE_ADD_FRIEND_URL → calendarAddUrl null
- [x] **19.3** Section 1 milestone：部署 dev 後端，打 `/api/line/system-links` 確認回應正確

---

## 前端（分支：`m_b_主頁快捷資訊_frontend`）

> 前置：後端 19.3 驗證通過後才開始

### Section 2：api.js + 資料層

- [x] **19.4** `frontend/src/services/api.js` 新增 `getSystemLinks()`
- [x] **19.5** vitest unit test：`frontend/src/services/__tests__/api.test.js`（若無則新建）
  - mock fetch，確認 `getSystemLinks()` 呼叫正確路徑並回傳資料

### Section 3：Home.jsx UI 改版

- [x] **19.6** 歡迎區塊改為卡片，整合財力金額與「上傳財力」按鈕
  - 左：頭像 + 歡迎文字（現有）
  - 右：財力標籤 + 金額（空則「尚未填寫」灰字）+ 上傳按鈕
- [x] **19.7** 系統連結區：3 個圖示方塊（LINE、行事曆、安裝 PWA）
  - LINE / 行事曆：`window.open(url, '_blank')`，URL 來自 `getSystemLinks()`
  - PWA：`beforeinstallprompt` event 存 ref，click 觸發 `prompt()`
  - PWA 已安裝判定：`window.matchMedia('(display-mode: standalone)').matches`
  - URL null → 對應方塊隱藏
  - 已安裝 → opacity 0.45，disabled，副文字「已安裝」
- [x] **19.8** 今日行程保持現有邏輯，只調整排版順序（移到系統連結區下方）
- [x] **19.9** vitest unit test：`frontend/src/pages/__tests__/Home.test.jsx`
  - 財力有值時顯示金額
  - 財力空值時顯示「尚未填寫」
  - lineAddFriendUrl null 時 LINE 方塊不渲染
  - PWA standalone 模式時安裝按鈕 disabled

### Section 4：整合驗收

- [x] **19.10** Section 3 milestone：vitest 全套 + playwright e2e（若有主頁相關 spec）全綠
- [x] **19.11** 刪除暫存 mockup 檔 `frontend/public/mockup-home.html`

---

## 上線順序

1. 後端 merge main → 部署 dev 後端驗證
2. 前端 merge main → 部署 dev 前端驗證
3. 依序 merge main 上線
