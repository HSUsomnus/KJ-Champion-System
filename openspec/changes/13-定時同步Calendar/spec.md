# Change 13 — 定時同步 Calendar

## 需求摘要

Google Calendar 是系統唯一的行程主資料來源。
目前問題：直接在 Google Calendar 建立的行程（如財務課程）因為沒有同步機制，無法進入 DB，導致系統看不到。

**解法**：後端 server 啟動後，每 1 分鐘自動執行一次 `syncRecentMonths()`，把 Google Calendar 前後 2 個月的行程同步到 DB。不依賴 Google Webhook。

## 技術設計

### 新增檔案

`server/scheduler/calendarSync.js`
- 使用 `node-cron`（`* * * * *`，每分鐘）
- 執行 `calendarSyncService.syncRecentMonths()`
- 匯出 `start()` / `stop()`，介面與 `dailyAgenda.js` 一致

### 修改檔案

`server/server.js`
- `require` calendarSync scheduler
- 在 `app.listen` callback 內呼叫 `calendarSyncScheduler.start()`
- 在 SIGTERM / SIGINT 處理加入 `calendarSyncScheduler.stop()`

### 不動的部分

- `calendarService.js`：新增/編輯/刪除仍維持「寫 Google + 立即 upsert DB」雙寫，保留即時性
- Webhook 路由保留但不依賴（不主動維護 Watch 通道）
- 同步邏輯 `calendarSyncService.syncRecentMonths()` 完全複用

## 邊界定義

- 只做「Google Calendar → DB」單向拉取
- 不移除現有 Webhook 路由
- 不調整同步範圍（維持前後 2 個月）
- Google Calendar 未設定時，sync 靜默 skip（現有行為）
