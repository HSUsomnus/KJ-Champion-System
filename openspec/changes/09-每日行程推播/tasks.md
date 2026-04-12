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
- [ ] 5.1 merge 到 dev 並 push，確認 server log 輸出 `📅 每日行程推播：已排程`
- [ ] 5.2 手動呼叫 `POST /api/line/push-daily-agenda` 成功推送 Flex 到 LINE
- [ ] 5.3 `GET /PUT /api/line/agenda-settings` 讀寫正常

## 前端（分支 `m_b_每日行程推播_frontend`）

### 6. 設定頁面
- [ ] 6.1 新建 `frontend/src/pages/AgendaSettings.jsx`
  - 啟用 toggle、時間選擇、對象下拉、儲存、立即推播
  - 權限檢查（非開發者顯示無權限）

### 7. 前端整合
- [ ] 7.1 `frontend/src/services/api.js` 新增 3 個 API 方法
- [ ] 7.2 `frontend/src/components/FabNav.jsx` 新增開發者入口
- [ ] 7.3 `frontend/src/App.jsx` 新增 `/agenda-settings` 路由

### 8. 驗證（後端 OK 後才開始）
- [ ] 8.1 merge 到 dev 並 push
- [ ] 8.2 開發者帳號登入，FabNav 顯示「推播設定」
- [ ] 8.3 設定頁讀寫、手動推播、權限控制全部正確

## 完成條件

- 後端 5.x 與 前端 8.x 全部勾選後視為完成
