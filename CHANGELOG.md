# CHANGELOG

版本索引（輕量）。每版詳細上下文：`.claude/context/vX.Y.Z.md`

規則：只在頂部新增，舊版永遠保留。版本號與 git tag 對應。

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
