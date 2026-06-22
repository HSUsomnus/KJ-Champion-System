# CHANGELOG

版本索引（輕量）。每版詳細上下文：`.claude/context/vX.Y.Z.md`

規則：只在頂部新增，舊版永遠保留。版本號與 git tag 對應。

---

## [v2.10.1] - 2026-06-22

git tag: v2.10.1
摘要：hotfix — 主頁財力金額顯示「$非數值」。`financial_amount` 欄位存的是自由文字（如「1700萬」），`Number('1700萬')` 回傳 NaN，`toLocaleString()` 在中文 locale 渲染為「非數值」。修法：直接顯示原始字串，不做任何數值轉換。

---

## [v2.10.0] - 2026-06-22

git tag: v2.10.0
摘要：change 19「主頁快捷資訊」— 主頁歡迎區塊改為卡片，右側整合財力金額（空值顯示「尚未填寫」灰字）與「上傳財力」按鈕。新增系統連結區三個圖示方塊（LINE 事業部小幫手、康九冠軍 google 日曆、安裝到手機/PC），連結 URL 透過新後端 API `GET /api/line/system-links` 取得。PWA 安裝按鈕依狀態彈出 dialog（已安裝／不支援瀏覽器兩種訊息，手機與 PC 文案不同）。今日行程保留並移至系統連結下方。`main.jsx` 在 React render 前預攔截 `beforeinstallprompt` 事件解決 useEffect 太晚問題。

---

## [v2.9.0] - 2026-06-22

git tag: v2.9.0
摘要：change 18「桌機版面置中」— 桌機橫式螢幕以手機直式欄框居中顯示。`main.jsx` 於 React render 前同步執行 `pickColWidth()`，依視窗寬高比判斷手機/桌機（≤ 9/16 為手機直接全寬，否則從視窗高度反推最接近 430px 的標準比例），寫入 `--col-max-w` / `--col-half-w` CSS 變數（session 固定）。`Layout.jsx` 欄位加 `width:100%` 修正 `#root { display:flex; flex-direction:column }` 環境下 flex item 需顯式設寬才填滿 `maxWidth` 的 bug。`FabAction.jsx` 與 `SidebarNav.jsx` 漢堡按鈕改用 `max(16px, calc(50vw - var(--col-half-w) + 16px))` 跟隨欄位邊緣。`Management.jsx` pill tab 從 inline px 改 Tailwind rem 確保值一致。

---

## [v2.8.1] - 2026-06-21

git tag: v2.8.1
摘要：hotfix — `package.json engines` 加入 `"npm": "10"`，繞過 Zeabur 基礎映像 `promise-retry` 缺失 bug（`npm update -g npm` 在新映像失敗）。Zeabur 偵測到 npm 版本約束後改執行 `npm install -f -g npm@10`，build 恢復正常。

---

## [v2.8.0] - 2026-06-21

git tag: v2.8.0
摘要：change 17「SidebarNav UI 重構」— SidebarNav 頂部在 logo 右側加入品牌文字「康九冠軍」；新增「管理者後台」導覽入口（isManager = role !== '一般人'，即負責人與開發者皆可見）；Management.jsx 頁面標題改為「管理者後台」並將 tab 切換改為統一 pill 樣式（#EFEDE9 底容器 / active #4A7C59 綠底白字 / borderRadius 20/16）。後端 PUT /api/members/update-roles 權限由「僅開發者」放寬為「負責人或開發者」。新增 GET /api/admin/export-backup-csv（從 backup DB 匯出 CSV，走內網不需開公網）；移除 POST /api/admin/sync-backup-to-dev（安全考量，dev DB 寫入改為全手動）；backup-status 改動態探索 public table。新增 scripts/import-csv-to-dev.js（本機 CSV → dev DB UPSERT 工具）。UIDESIGN.md 補充 Pill Tab 規範與 SidebarNav 規範。

---

## [v2.7.0] - 2026-06-21

git tag: v2.7.0
摘要：change 16「備份 DB 同步」— 在 Zeabur `kj-champion` 專案新增 `postgresql-backup`（備份 DB，內網 only）與 `postgresql-dev`（dev DB，公網開放）。後端每 8 小時定時全量覆蓋 prod → backup（node-cron `0 */8 * * *`）；新增 admin API（Bearer token 保護）：`POST /api/admin/sync-prod-to-backup`（手動觸發）、`POST /api/admin/sync-backup-to-dev`（備份→dev 複製）、`GET /api/admin/backup-status`（備份筆數查詢）。移除原先的 write-through queue 架構（backupQueue.js / backupDb.js 刪除，db.js / eventDbService.js 清除相關邏輯）。新增 `scripts/init-db.js` 用於 schema 初始化（不需 pg_dump）。

---

## [v2.6.0] - 2026-06-21

git tag: v2.6.0
摘要：change 15「用戶資料整合」— 將「個人資料」、「用戶數據」、「用戶財力」三頁合併為單一 `/profile` 頁面，以 pill tab 切換（container #EFEDE9，active #4A7C59）。Profile.jsx 全面改寫：共用頭像卡 + 星級 badge，各 tab 的 FabAction 隨之切換（個人資料：編輯+登出；數據：編輯數據；財力：上傳+選取編輯），財力 tab lazy 載入，三個隱藏 toggle（hideProfile / hideFinancial / hideDocuments）實際生效（原始版本 state 有但從未條件渲染）。SidebarNav.jsx 移除獨立的「用戶數據」「用戶財力」導覽項，底部用戶區 label 改為「用戶資料」。App.jsx 的 `/user-stats` 路由改 redirect 到 `/profile`，`/financial?userId=xxx` 保留 Financial.jsx 不動（成員詳情他人財力查看）。MemberDetail.jsx 同步更新 tab 樣式為 pill 並補「成員資料」頁面標題。

---

## [v2.5.0] - 2026-06-21

git tag: v2.5.0
摘要：change 14「側邊欄導覽」— 移除固定頂部 Header 與底部左側 FabNav，改以左側抽屜式 SidebarNav 整合兩者。新建 SidebarNav.jsx（漢堡 FAB + 遮罩 + 抽屜，createPortal 掛 document.body）、Layout.jsx（Outlet 包裹器，自動帶入 SidebarNav），App.jsx 改為 ProtectedRoute → Layout → 各頁面三層巢狀。16 個頁面批次移除 Header/FabNav import 及 activeFab 狀態，padding 由 pt-16 統一調為 pt-14。未來新增頁面只需在 App.jsx 加一行路由即可自動取得側邊欄。

---

## [v2.4.0] - 2026-06-21

git tag: v2.4.0
摘要：change 13「定時同步Calendar」— node-cron 每分鐘自動同步 Google Calendar 到本地 DB，並完全移除 googleapis / gaxios HTTP client。根本問題：gaxios@6+ 在 Zeabur Node.js 18 環境改用 native fetch（undici），undici 對 Zeabur NAT TCP 半關閉敏感，所有 Google API 請求均 Premature close。解法：完全繞過 gaxios，google-auth-library JWT 端點也硬編碼了廢棄 v4/token URL（aud 不符直接關閉連線），一併自己用 crypto + https.request 自簽 JWT assertion（aud 正確），直接換 token；calendarService.js 所有 Calendar API 呼叫改用 raw https.request 封裝的 calendarApiRequest()。新增 server/scheduler/calendarSync.js（每分鐘 cron）、server/routes/debug.js（/api/debug/health 自檢端點）、scripts/diagnose-google-auth.js（本機 CLI 診斷）、Jest 後端單元測試框架（googleAuth / calendarSync / debug 共 28 個 test）。DEV 驗證：synced=89, deleted=1 正常完成。

---

## [v2.3.1] - 2026-06-20

git tag: v2.3.1
摘要：hotfix — server.js `public/` 不存在時 ENOENT 500。v2.0.0 刪除 `public/` 後，prod Zeabur 環境 `USE_REACT_FRONTEND` 未設 1 且 `frontend/dist` 不在容器內，`publicPath` fallback 到已刪除的 `public/`，導致 `GET /` → `res.sendFile('public/index.html')` → `ENOENT stat '/src/public/index.html'` → 500。同時 `favicon.ico` hardcode 了同樣不存在的 fallback 路徑。修法：加 `publicExists = fs.existsSync(publicPath)` 判斷，`express.static` 只在目錄存在時掛載，favicon 只在檔案存在時送出，`GET /` 無前端目錄時回傳 `{ status: "ok", service: "kj-champion-api" }`（純 API 模式）。所有 `/api/*` 路由與 Cloudflare Pages 前端不受影響。

---

## [v2.3.0] - 2026-04-26

git tag: v2.3.0
摘要：OpenSpec change 09「每日行程推播」收尾 — 前端開發者設定頁 + Eruda 整合 + PWA meta tag 補正。新建 `frontend/src/pages/AgendaSettings.jsx`（toggle / 時間 picker / 對象下拉 / 立即推播按鈕 / Eruda toggle 三大區塊，僅 `role === '開發者'` 可進入），`frontend/src/components/FabNav.jsx` 加 `DEVELOPER_ITEMS`（齒輪入口），`frontend/src/services/api.js` 加 3 個 API 方法（`getAgendaSettings` / `updateAgendaSettings` / `pushDailyAgenda`），`frontend/src/App.jsx` 註冊 `/agenda-settings` 路由（在 `ProtectedRoute` 下）。`frontend/index.html` 加 Eruda inline loader（URL `?eruda=1` 或 `localStorage.erudaEnabled='true'` 任一觸發）+ `mobile-web-app-capable` meta tag（補 `apple-mobile-web-app-capable` deprecated 警告，新舊並存）。新增 `scripts/seed-dev-agenda-test.js` dev DB seed 工具（developer 帳號 + 一般人測試帳號 + 明日 event，全 idempotent，已存在帳號只更新 role 不覆寫 onboarding 資料）。dev 實機驗證 8.1 ~ 8.5 全通過。本版上線後 09 整個 change 在 STATUS.md 標為 ✅ DONE。

---

## [v2.2.1] - 2026-04-25

git tag: v2.2.1
摘要：hotfix — EventDetail 行程詳情頁右下 FAB 加紅色「刪除」按鈕。v2.2.0 之前 FAB 只有「編輯」與「分享」，缺刪除入口（後端 `DELETE /api/calendar/events/:eventId` 與 `api.deleteEvent` 早已就緒，純前端 UX 缺漏）。修法：fabItems 第三項加「刪除」，label 文字 / label 邊框 / icon / icon 邊框統一 `#dc2626` 紅；點擊先 `window.confirm` 防誤觸，刪除成功 redirect 到 `/calendar`，失敗顯示後端 error / message 不 fallback；生日事件（`isBirthdayEvent`）為動態生成，不顯示刪除按鈕。

---

## [v2.2.0] - 2026-04-25

git tag: v2.2.0
摘要：新增功能 — 每日行程推播 LINE Bot 後端（OpenSpec change 09 後端部分）。新增 `system_settings` 表自動 migration（key/value/updated_at），用 `node-cron` 排程每日 21:00（Asia/Taipei）讀取 prod DB 隔日（次日）行程後依對象（all / manager_above / developer）篩選成員 LINE userId 推送 Flex 字卡（Warm Minimal 風格：accent 色 Header、移除 emoji、event row 白底卡片化、可點進前端 `/event/:id`）。新增 3 個僅開發者可呼叫的 API（GET/PUT `/api/line/agenda-settings` 讀寫設定、POST `/api/line/push-daily-agenda` 手動觸發）。dev 環境連續多日 23:30 推播驗證通過，視覺與時區行為正確。前端設定頁（OpenSpec 09 之 6.x ~ 8.x）尚未開發 — 目前只能透過 API / 直改 system_settings 表調整，不影響後端排程運作。

---

## [v2.1.0] - 2026-04-25

git tag: v2.1.0
摘要：基礎建設升級 — OpenSpec change 10「Zeabur 專案分離」完整上線。dev 環境搬到獨立 Zeabur 專案 `kj-champion-dev`（含獨立 `postgresql-dev` DB + dev 後端 `kj-champion-dev.zeabur.app`），與 prod 環境（`kj-champion` 專案）跨專案內網完全隔絕，dev 任何錯誤無法物理觸碰 prod DB。同時關閉 prod DB 公網路（僅內網存取）+ 旋轉 prod DB 密碼（舊密碼曾在 web Claude Code chat 暴露）。`_worker.js` 的 `resolveBackend()` dev URL 從 `kj-champion-system-dev.zeabur.app` 改為 `kj-champion-dev.zeabur.app`。本版整合 v2.0.5 ~ v2.0.8 四個 hotfix（首次登入 onboarding 流程修補：no-profile 死循環、useEffect race condition、強制資料 + 數據填寫 guard、完成後導主頁），並 archive 被 superseded 的 OpenSpec change 08。

---

## [v2.0.8] - 2026-04-25

git tag: v2.0.8
摘要：hotfix — UserStatsEdit 完成 onboarding 後應導主頁。v2.0.7 onboarding guard 完成後，新用戶填完用戶數據按「確認/儲存」會導去 `/user-stats`，但使用者預期是進入主應用。修法：navigate 三元式判斷 — 新用戶（onboarding=true）→ `'/'`、既有用戶從 `/user-stats` 進來編輯 → `'/user-stats'` 保留原行為。

---

## [v2.0.7] - 2026-04-25

git tag: v2.0.7
摘要：hotfix — 新用戶 onboarding 強制流程修補。原設計要求新用戶照「用戶資料 → 用戶數據 → 主應用」順序完成，但程式碼缺少 guard，新用戶可帶半套資料進主應用。修法：(1) AuthContext 新增 `isProfileComplete()` 與 `isStatsComplete()` helper，前者要求 realName / email / phone / birthday 四欄都不為空，後者要求 courseRecord 至少 1 筆。(2) `ProtectedRoute` 加二級判斷：未完成資料強制導 `/profile/edit`、未完成數據強制導 `/user-stats/edit`。(3) ProfileEdit 四欄全 required + 個別 alert + 新用戶完成後接續導 `/user-stats/edit`。(4) UserStatsEdit 課程紀錄至少 1 筆驗證 + 紅星標示。兩個編輯頁加新用戶 banner 提示。

---

## [v2.0.6] - 2026-04-25

git tag: v2.0.6
摘要：hotfix — Login.jsx useEffect 與 handleConfirm 的 navigate race condition。v2.0.5 修了 `'no-profile'` 分支沒呼叫 `login(userData)` 的問題後，新發現第二層 bug：`handleConfirm` 呼叫 `login(userData)` 設 user state → 觸發 `useEffect` 「已登入跳首頁」邏輯 `navigate('/')`，蓋掉同步呼叫的 `navigate('/profile/edit')`，首次登入仍無法進編輯頁。修法：useEffect 加 `authState === 'idle'` 條件，確保只在「已登入但直接訪問 /login」時才跳首頁，OAuth callback 流程交給 `handleConfirm` 自行決定 navigate。

---

## [v2.0.5] - 2026-04-25

git tag: v2.0.5
摘要：hotfix — Login.jsx 修首次登入「建立資料」死循環。`handleConfirm` 的 `'no-profile'` 分支原直接 `navigate('/profile/edit')` 但沒先呼叫 `login(userData)` 把 user state 設起來，導致 `ProtectedRoute` 看到 user 為 null 把人踢回 `/login`。bug 從 v2.0.0 React 前端建立時就存在於 main，但 prod DB 永遠有 member 記錄所以從未被觸發；OpenSpec change 10 完成 dev DB 物理隔離後 dev DB 變空，邊界 case 才暴露。

---

## [v2.0.4] - 2026-04-13

git tag: v2.0.4
摘要：hotfix — 修復新增行程兩個 UX bug。(1) 必填欄位漏填時靜默 return 改為明確 alert 提示。(2) `useLeaveGuard` 原用 `useState` 記錄 saved，與 react-router v7 `useBlocker` 的 useEffect 延遲註冊產生時序競態，`setSaved()` 後立即 navigate 會誤跳「尚未儲存」警告；改用 `useRef` 同步讀寫解決。附帶把全站 5 個編輯頁紅色 FAB「確認」改為「確認/儲存」。

---

## [v2.0.3] - 2026-04-12

git tag: v2.0.3
摘要：hotfix — `_worker.js` 依 Pages 網址自動路由後端。修復 `kjcs-dev.pages.dev` 過去會把 /api/* 轉到正式後端造成 CORS + 404 的問題。新增 `resolveBackend(hostname)`：kjcs-dev 走 dev 後端、其他走正式後端。正式站行為不變。

---

## [v2.0.2] - 2026-04-06

git tag: v2.0.2
摘要：修復試算表預覽顏色不正確 — 補上 Excel 標準 64 色 indexed 色盤（OOXML §18.8.27），修正 auto 色判斷及 AARRGGBB 8 碼 alpha 前綴處理，舊版/標準 Excel 文件的儲存格顏色現在能正確顯示

---

## [v2.0.1] - 2026-04-04

git tag: v2.0.1
摘要：Vercel 全站 301 轉址到 Cloudflare Pages — 舊 Vercel 網址自動跳轉至 `kj-champion-system.pages.dev`，確保團隊成員使用固定入口

---

## [v2.0.0] - 2026-04-04

git tag: v2.0.0
摘要：全新 React 前端上線 — React 18 + Vite 5 + Tailwind CSS（Warm Minimal 風格），取代舊純 HTML+JS 前端（`public/` 已刪除），前端目錄改為 `frontend/`；含完整頁面重建、React Router SPA、Vite PWA、LINE Login 整合

---

## [v1.6.0] - 2026-04-04

git tag: v1.6.0
摘要：後端 OAuth 動態 redirect — LINE Login callback 自動偵測前端 origin（從 Origin/Referer header），通過白名單驗證後 redirect 回發起登入的前端站，解決 DEV/正式站登入後混跳問題

---

## [v1.5.7] - 2026-03-28

git tag: v1.5.7
摘要：重構 .claude/rules/——合併 core.md + global.md 為 workflow.md，整合 OpenSpec 工作流與 git 分支流程，加入修改/執行計畫前強制確認分支的安全閘門；更新 CLAUDE.md 工作流摘要

---

## [v1.5.6] - 2026-03-22

git tag: v1.5.6
摘要：清理 .env 死碼（移除 ADMIN_LINE_USER_IDS、DUAL_WRITE_ENABLED、SUPABASE_BACKUP_URL、Google API 分拆舊變數）、補齊 FRONTEND_URL 與 CRON_SECRET；新增 Claude Code hooks（openspec-code-guard、openspec-sync-reminder）；同步 OpenSpec 文件

---

## [v1.5.5] - 2026-03-22

git tag: v1.5.5
摘要：清理 Google Sheets 死碼——刪除已廢棄的 sheetService.js、移除 googleAuth.js 中的 getSheetsClient/getSheetConfig/spreadsheets scope，並將 financial.js 中語意錯誤的 MEMBER_SHEET_ID 改名為 FINANCIAL_SHEET_ID

---

## [v1.5.4] - 2026-03-22

git tag: v1.5.4
摘要：移除雙寫服務（dualWriteService）——eventDbService 與 memberDbService 的寫入改回直接 db.query，Supabase 不再接收任何寫入；同步更新 OpenSpec 文件與 staging README

---

## [v1.5.3] - 2026-03-22

git tag: v1.5.3
摘要：修復 Supabase 雙寫失效問題——補回 staging 分支遺漏的 dualWriteService.js，使新增/更新/刪除行程能正確同步至 Supabase 備份庫

---

## [v1.5.2] - 2026-03-18

git tag: v1.5.2
摘要：建立 staging 分支部署架構，後端遷移至 Zeabur + 前端遷移至 Cloudflare Pages（Task 1 完成：zbpack.json、env.example 更新、CORS 白名單、DB 連線池環境感知、資料庫備份腳本）

---

## [v1.5.1] - 2026-03-15

git tag: v1.5.1
摘要：新增行程分類「紫星行程聊聊」（紫色，Google Calendar Grape 色，含提示詞）

---

## [v1.5.0] - 2026-03-15

git tag: v1.5.0
摘要：整合 ngrok 本機開發工具、加入 concurrently 同步啟動腳本、重寫全部說明文件（README、QUICKSTART、DEPLOYMENT、ngrok 指南）

---

## [v1.4.0] - 2026-03-10

git tag: v1.4.0
摘要：移除廢棄 React 前端、開放 manager 財務頁籤、行程分享改純文字、邀請字卡按鈕 3 改走 open-external 中介頁

---

## [v1.3.0] - 2026-03-08

git tag: v1.3.0
摘要：詳見 `.claude/context/v1.3.0.md`

---

## [v1.2.0] - 2026-03-06

git tag: v1.2.0
摘要：詳見 `.claude/context/v1.2.0.md`

---

## [v1.1.0] - 2026-03-04

git tag: v1.1.0
摘要：詳見 `.claude/context/v1.1.0.md`

---

## [v1.0.0] - 2026-03-01

git tag: v1.0.0
摘要：詳見 `.claude/context/v1.0.0.md`
