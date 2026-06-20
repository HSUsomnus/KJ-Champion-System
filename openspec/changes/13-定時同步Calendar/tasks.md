# Change 13 Tasks — 定時同步 Calendar

## Section 1：排程器

- [x] 1.1 新增 `server/scheduler/calendarSync.js`（node-cron 每分鐘，呼叫 syncRecentMonths）
- [x] 1.2 修改 `server/server.js`：引入並啟動 calendarSyncScheduler
- [x] 1.3 修正 `server/config/googleAuth.js`：JWT 建立後明確覆寫 `auth.tokenUrl`，強制打 `oauth2.googleapis.com/token`，解決 `v4/token Premature close`

## Section 2：驗證

- [ ] 2.1 本機測試：啟動 server，觀察 log 確認每分鐘有執行同步
- [ ] 2.2 直接在 Google Calendar 新增一筆測試行程，等 1 分鐘，確認系統前端可見
