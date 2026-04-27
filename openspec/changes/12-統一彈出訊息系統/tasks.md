# Tasks: 統一彈出訊息系統

> 分支：`m_b_統一彈出訊息系統`（純前端，無前後端拆分）

## 1. 基礎元件 — feedback 套件

- [x] 1.1 新建 `frontend/src/components/feedback/Dialog.jsx`（遮罩 + 卡片容器 base，符合 UIDESIGN.md）
- [x] 1.2 新建 `frontend/src/components/feedback/ConfirmDialog.jsx`（消費 Dialog，支援 `default` / `danger` variant）
- [x] 1.3 新建 `frontend/src/components/feedback/Toast.jsx` + `ToastContainer.jsx`（左側色條 + 自動消失 + 堆疊）
- [x] 1.4 新建 `frontend/src/components/feedback/BottomSheet.jsx`（底部抽屜 base）
- [x] 1.5 新建 `frontend/src/components/feedback/FieldError.jsx`（紅字 + dot bullet）
- [x] 1.6 新建 `frontend/src/components/feedback/FeedbackProvider.jsx`（context + portal mount）
- [x] 1.7 新建 `frontend/src/components/feedback/index.js`（export `useToast` / `useConfirm` / `useBottomSheet` 與元件）
- [x] 1.8 `frontend/src/App.jsx` 最外層包 `<FeedbackProvider>`

## 2. 既有彈出元件遷移

- [x] 2.1 `ConfirmLeaveDialog.jsx` 改為消費 `ConfirmDialog`（含 danger variant），邏輯（`useLeaveGuard`）保留
- [x] 2.2 `AddEvent.jsx` 內聯的 `ShareConfirmDialog` 抽掉，改用通用 `<Dialog>` 自寫內容
- [x] 2.3 `FinancialEdit.jsx` 內聯的 `AmountPicker` 改為消費 `BottomSheet` base

## 3. 替換 14 處 alert / confirm

- [x] 3.1 `ProfileEdit.jsx`：4 個必填驗證 → `<FieldError>` inline + 焦點導引；API 失敗 → `toast.error()`
- [x] 3.2 `AddEvent.jsx`：title / date 驗證 → `<FieldError>` inline + 焦點；API 失敗 → `toast.error()`；分享成功 → `toast.success()`
- [x] 3.3 `EventDetail.jsx`：刪除 confirm → `useConfirm({ variant:'danger' })`；API 失敗 → `toast.error()`；分享成功 → `toast.success()`
- [x] 3.4 `FinancialEdit.jsx`：兩處 API 失敗 → `toast.error()`
- [x] 3.5 `FinancialUpload.jsx`：API 失敗 → `toast.error()`
- [x] 3.6 `UserStatsEdit.jsx`：courseList 驗證 → `<FieldError>` + 滾動聚焦；API 失敗 → `toast.error()`
- [x] 3.7 `Management.jsx`：API 失敗 → `toast.error()`
- [x] 3.8 `frontend/src/utils/shareEvent.js`：改回傳 `{ ok, copied?, cancelled? }`，由呼叫端 page 處理 toast
- [x] 3.9 `Calendar.jsx`：抽 `shareTextHelper()` 回傳 result，component 內 toast.success
- [x] 3.10 全專案 grep 驗證 `frontend/src/` 內 `alert(` / `confirm(` / `prompt(` 0 命中（命中的兩處皆為新 useConfirm API，非原生）

## 4. 規範文件

- [x] 4.1 `.claude/rules/frontend.md` 新增「彈出訊息規範」章節（順帶把整檔過時的 `public/` 描述更新為 `frontend/`）：
  - 何時用 toast（成功 / 失敗反饋、輕量提示）
  - 何時用 ConfirmDialog（破壞性動作二次確認）
  - 何時用 FieldError（表單欄位驗證）
  - 何時用 BottomSheet（多選一的選擇器）
  - 禁止使用 `window.alert / confirm / prompt`
- [x] 4.2 `UIDESIGN.md` 補「Feedback 元件」章節（已於前次 UIDESIGN.md 升格 commit `bb0c14f` 同步完成）

## 5. 驗證（dev 環境）

- [ ] 5.1 `m_b_統一彈出訊息系統` merge 到 dev 並 push
- [ ] 5.2 dev 上實機掃過 8 個 page，確認所有原 alert / confirm 點位都換成新 UI 且行為正確
- [ ] 5.3 表單錯誤情境驗證：四欄都空送出 → 4 個 inline 錯誤同時顯示，焦點跳到第一個
- [ ] 5.4 toast 同時觸發三個確認堆疊正確、自動消失時長正確
- [ ] 5.5 confirm danger 樣式（紅色按鈕）視覺通過
- [ ] 5.6 PWA install 後再驗一次（避免 SW 快取舊 bundle）

## 6. 上線（v2.4.0）

- [ ] 6.1 寫 `.claude/context/v2.4.0.md`
- [ ] 6.2 更新 `CHANGELOG.md`
- [ ] 6.3 完整重寫 `README.md`（含本版功能）
- [ ] 6.4 機密檢查
- [ ] 6.5 列項目清單給使用者明確確認
- [ ] 6.6 走 `.claude/rules/deploy.md` 的「推送到 main」完整流程
- [ ] 6.7 main push 後同步全分支（dev + 所有 m_b_*）
- [ ] 6.8 砍 `m_b_統一彈出訊息系統`（本機 + 遠端）
- [ ] 6.9 STATUS.md 標 12 為 DONE

## 7. 測試自動化（計畫外加入，2026-04-27）

> **背景**：使用者於 dev 驗證階段提出「能否自動化」，決定三軌齊上（Vitest + Playwright + 手動）為長期投資 — 框架可給未來 11-tag-system / pwa_upgrade 等 change 重用。

- [x] 7.1 Vitest setup（vite.config.js test block + setup.js + esbuild.jsx='automatic' 強制 React 19 runtime + 排除 e2e）
- [x] 7.2 5 個元件單元測試 — 共 44 test 全綠：
  - Dialog (7)、ConfirmDialog (11)、Toast (6)、FieldError (6)、FeedbackProvider (14)
  - 涵蓋：portal、ESC、stopPropagation、variant 樣式、stack 上限、auto dismiss timer、useConfirm Promise resolve、no-Provider throw
- [x] 7.3 Playwright setup（playwright.config.js + chromium + webServer auto-spawn vite dev + reuseExistingServer）
- [x] 7.4 e2e/feedback.spec.js — 共 2 test 全綠：
  - 5.3 ProfileEdit 4 欄空送出 → FieldError + focus + #C0392B 邊框 + 輸入後 error 消失
  - 5.5 ConfirmLeaveDialog danger 樣式（按鈕 background / color / border 三色驗證）
  - helper：setupAuth(page) 灌 localStorage + page.route mock /api/profile / clickFabAction(page, label)
- [x] 7.5 npm scripts：test / test:run / test:e2e / test:e2e:ui
- [x] 7.6 frontend/.gitignore 排除 test-results / playwright-report / playwright/.cache

### 注意事項

- vitest@4 與 vite@8 有相容問題（describe throws "Cannot read properties of undefined (reading 'config')"），降回 vitest@3.2.4 後正常
- React 19 + vite 8 + vitest 3 的 JSX 處理：vitest pipeline 不會自動掛 plugin-react，需要 esbuild.jsx='automatic' + jsxImportSource='react'
- vite 8 build 用 oxc 而非 esbuild（會 warning 「esbuild options ignored」），但 vitest 仍用 esbuild — 互不影響

## 完成條件

- 1.x ~ 4.x 全部勾選
- 5.x dev 驗證通過
- 6.x 上線完成
- 7.x 測試自動化（已全完成，bonus）
