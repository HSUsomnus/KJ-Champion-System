# Tasks: 025-html-production-deploy

> ⬜ **待開始** — 前提：02-cloudflare-pages-validate ✅ 通過

---

## 第一步：合併 staging → main

- [ ] 025.1 開 PR：`staging` → `main`，review 無誤後 merge
- [ ] 025.2 確認 Cloudflare Pages 自動觸發 main branch Production build 成功

## 第二步：Zeabur 正式後端

- [x] 025.3 Zeabur 建立正式後端服務，監聽 `main` 分支（`kj-champion-system.zeabur.app`）
- [x] 025.4 設定正式環境變數（`DATABASE_URL`、`LINE_*`、`GOOGLE_*`、`FRONTEND_URL`、`NODE_ENV=production`）
- [x] 025.5 LINE Console 正式 Channel 新增 Callback URL：`https://kj-champion-system.pages.dev/api/auth/line-callback`

## 第三步：Cloudflare Pages Production branch

- [ ] 025.6 `kj-champion-system` 專案 Production branch 切換為 `main`
- [ ] 025.7 確認 Production build 部署成功，網站可正常開啟

## 第四步：驗證 main 正式環境

- [ ] 025.8 **API 溝通驗證**：`/api/members`、`/api/calendar/events` 回應正確
- [ ] 025.9 **資料庫連線驗證**：CRUD 確認資料落在 Zeabur PostgreSQL
- [ ] 025.10 **LINE Login 完整流程**：正式環境 OAuth → 回跳 → 正常使用

## 第五步：清空 staging，準備新前端開發

- [ ] 025.11 停止 Zeabur staging 後端服務
- [ ] 025.12 staging `_worker.js` 確認 API proxy 目標指向正式 Zeabur 後端 URL
- [ ] 025.13 ✅ **以上完成 → archive 此 change，進入 03-pencil-ui-design**
