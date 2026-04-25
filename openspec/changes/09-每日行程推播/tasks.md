# Tasks: 每日行程推播 LINE Bot

## 後端（分支 `m_b_每日行程推播_backend`）

### 1. 依賴與 DB
- [x] 1.1 `package.json` 新增 `node-cron` 依賴
- [x] 1.2 `server/server.js` 新增 `system_settings` 表的自動 migration（含初始資料）

### 2. 核心服務
- [x] 2.1 新建 `server/services/agendaService.js`
  - `getAgendaSettings()`、`updateAgendaSettings()`
  - `getTomorrowEvents()`、`filterMembersByTarget()`
  - `sendDailyAgenda()` 主流程
- [x] 2.2 修改 `server/services/lineService.js` 新增 `generateDailyAgendaFlexMessage()`
- [x] 2.3 新建 `server/scheduler/dailyAgenda.js`（`start` / `stop` / `reschedule`）

### 3. API
- [x] 3.1 `server/routes/line.js` 新增 GET `/api/line/agenda-settings`
- [x] 3.2 `server/routes/line.js` 新增 PUT `/api/line/agenda-settings`
- [x] 3.3 `server/routes/line.js` 新增 POST `/api/line/push-daily-agenda`

### 4. 整合
- [x] 4.1 `server/server.js` 啟動 scheduler、掛上 graceful shutdown

### 5. 驗證（後端先）
- [x] 5.1 merge 到 dev 並 push，確認 server log 輸出 `📅 每日行程推播：已排程`
- [x] 5.2 手動呼叫 `POST /api/line/push-daily-agenda` 成功推送 Flex 到 LINE
- [x] 5.3 `GET /PUT /api/line/agenda-settings` 讀寫正常

### 5.5 字卡重新設計（Phase 1 驗證後追加，符合 DESIGN_SYSTEM.md）
- [x] 5.5.1 修 `agendaService.js` 時區 bug（`new Date(toLocaleString)` → `Intl.DateTimeFormat`）
- [x] 5.5.2 修 `lineService.js` `generateDailyAgendaFlexMessage`：
  - 全面移除 emoji（禁止 emoji 作 icon）
  - 加圓形 dot bullet（8x8 cornerRadius 4px，依類型色）
  - 類型改膠囊 badge（cornerRadius xxl、accent-light 底）
  - Header 改 Warm Minimal accent `#4A7C59`
  - Footer 主要按鈕改深炭灰 `#2C2C2C`
  - event row 加 `action.uri = ${FRONTEND_URL}/event/${id}` 可點進詳情
  - Footer URL 改用 `FRONTEND_URL`（前端網址）
- [x] 5.5.3 修 altText 移除 emoji
- [x] 5.5.4 merge 到 dev 並 push，手機測試：
  - 字卡 Header 墨綠、日期正確、無 emoji
  - Event row 可點進 `/event/:id`
  - Footer「開啟行事曆」可點進 `/calendar`

### 5.6 Event row 卡片化（第二輪視覺調整）
- [x] 5.6.1 body 背景改 `#F7F5F2`（Warm Minimal bg 米白），讓白色 row 突出
- [x] 5.6.2 每個 event row 加邊框 + 圓角 + padding，符合 DESIGN_SYSTEM 卡片規範：
  - `backgroundColor: '#FFFFFF'`
  - `borderWidth: '1px'`、`borderColor: '#E2DED8'`
  - `cornerRadius: 'lg'`（12px）
  - `paddingAll: '12px'`
- [x] 5.6.3 移除 event 間 separator（卡片本身已有邊框，多餘）
- [x] 5.6.4 merge 到 dev 並 push，手機測試：event row 可見為獨立卡片（連續多日 23:30 收到推播且滿意，視為已驗證）

## 前端（分支 `m_b_每日行程推播_frontend`）

### 6. 設定頁面
- [x] 6.1 新建 `frontend/src/pages/AgendaSettings.jsx`
  - 啟用 toggle、時間選擇、對象下拉、儲存、立即推播
  - 權限檢查（非開發者顯示無權限）
  - 加碼：頁面內整合 Eruda 切換 toggle（讀寫 `localStorage.erudaEnabled`，提示「重新整理後生效」）

### 7. 前端整合
- [x] 7.1 `frontend/src/services/api.js` 新增 3 個 API 方法（`getAgendaSettings` / `updateAgendaSettings` / `pushDailyAgenda`）
- [x] 7.2 `frontend/src/components/FabNav.jsx` 新增開發者入口（`DEVELOPER_ITEMS`，role gate）
- [x] 7.3 `frontend/src/App.jsx` 新增 `/agenda-settings` 路由（在 `ProtectedRoute` 下）
- [x] 7.4 `frontend/index.html` 加 Eruda inline script loader（URL `?eruda=1` 或 localStorage 任一觸發）
- [x] 7.5 `frontend/index.html` 加 `mobile-web-app-capable` meta tag（補 `apple-` deprecated 警告，新舊並存）

### 8. 驗證（後端 OK 後才開始）
- [x] 8.1 merge 到 dev 並 push
- [x] 8.2 開發者帳號登入，FabNav 顯示「開發者設定」入口（role gate 正確）
- [x] 8.3 設定頁讀寫、手動推播、權限控制全部正確（dev DB seed 後實機驗證通過）
- [x] 8.4 Eruda toggle 開關 + 重整後右下角綠色按鈕出現
- [x] 8.5 非開發者帳號訪問 `/agenda-settings` 顯示「無存取權限」（用 localStorage swap lineUserId 驗證）

## 完成條件

- 後端 5.x 與 前端 8.x 全部勾選後視為完成
