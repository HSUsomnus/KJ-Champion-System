# Change 13 Tasks — 定時同步 Calendar

## Section 1：排程器 + Google Auth 修正

- [x] 1.1 新增 `server/scheduler/calendarSync.js`（node-cron 每分鐘，呼叫 syncRecentMonths）
- [x] 1.2 修改 `server/server.js`：引入並啟動 calendarSyncScheduler
- [x] 1.3 修正 `server/config/googleAuth.js`：完全跳過 `JWT.refreshTokenNoCache()`，改用 Node.js 原生 `crypto` + `https` 自簽 JWT（aud 正確），解決 `v4/token Premature close`；新增 `getToken()` 與 `calendarApiRequest()` helpers（讀 `token_uri` from JSON），供 calendarService.js 使用
- [x] 1.4 改寫 `server/services/calendarService.js`：全面改用 `calendarApiRequest` + `getToken`（raw `https.request`），完全移除 `googleapis` / `gaxios` 呼叫，解決 Calendar API 呼叫 `Premature close`

## Section 2：自檢工具

- [x] 2.1 新增 `scripts/diagnose-google-auth.js`：6 步驟本機 CLI 診斷（credentials → 簽名 → TCP → token → Calendar → DB）
- [x] 2.2 新增 `server/routes/debug.js`：`GET /api/debug/health` HTTP 端點（同 4 步驟檢查，回傳 JSON）
- [x] 2.3 修改 `server/server.js`：永遠掛載 `/api/debug` 路由（移除 NODE_ENV guard，Zeabur DEV 的 NODE_ENV=production 曾導致 404）
- [x] 2.4 新增 `package.json` → `"diagnose"` script

## Section 3：測試

- [x] 3.1 新增 `jest.config.js`：testEnvironment=node，testMatch 限定 `server/**/__tests__/**/*.test.js`
- [x] 3.2 新增 `server/config/__tests__/googleAuth.test.js`（10 個 test：credentials 解析、token exchange URL/aud 驗證、timeout、getRequestHeaders、token caching）
- [x] 3.3 新增 `server/scheduler/__tests__/calendarSync.test.js`（8 個 test：schedule expression、timezone、idempotent start、stop lifecycle、runSync 成功/失敗/吞錯/log）
- [x] 3.4 新增 `server/routes/__tests__/debug.test.js`（10 個 test：supertest 測 /api/debug/health 全通過、各層失敗、response 格式）
- [x] 3.5 加入 `devDependencies`：`supertest@^6.3.4`

## Section 4：驗證（DEV 部署後）

- [ ] 4.1 `npm install && npm test` 本機全綠
- [x] 4.2 DEV 部署後打 `https://kj-champion-dev.zeabur.app/api/debug/health`，確認 ok:true（前次部署已驗證；重新部署後需重確認 Calendar API 路徑也正常）
- [ ] 4.3 直接在 Google Calendar 新增一筆測試行程，等 1 分鐘，確認系統前端可見
