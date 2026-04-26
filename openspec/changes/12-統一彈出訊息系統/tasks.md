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

- [ ] 3.1 `ProfileEdit.jsx`：4 個必填驗證 → `<FieldError>` inline；API 失敗 → `toast.error()`
- [ ] 3.2 `AddEvent.jsx`：title / date 驗證 → `<FieldError>` inline；API 失敗 → `toast.error()`
- [ ] 3.3 `EventDetail.jsx`：刪除 confirm → `useConfirm({ variant:'danger' })`；API 失敗 → `toast.error()`
- [ ] 3.4 `FinancialEdit.jsx`：兩處 API 失敗 → `toast.error()`
- [ ] 3.5 `FinancialUpload.jsx`：API 失敗 → `toast.error()`
- [ ] 3.6 `UserStatsEdit.jsx`：courseList 驗證 → `<FieldError>` 或 banner；API 失敗 → `toast.error()`
- [ ] 3.7 `Management.jsx`：API 失敗 → `toast.error()`
- [ ] 3.8 `frontend/src/utils/shareEvent.js`：複製成功 → `toast.success()`（注意：utility 不能用 hook，需改為呼叫端 page 觸發 toast，或改 shareEvent 簽名回傳 result，由 page 處理 toast）
- [ ] 3.9 `Calendar.jsx`：複製成功 → `toast.success()`
- [ ] 3.10 全專案 grep 確認 `alert(` / `confirm(` 在 `frontend/src/` 內 0 命中（排除註解、字串 literal、變數名）

## 4. 規範文件

- [ ] 4.1 `.claude/rules/frontend.md` 新增「彈出訊息規範」章節：
  - 何時用 toast（成功 / 失敗反饋、輕量提示）
  - 何時用 ConfirmDialog（破壞性動作二次確認）
  - 何時用 FieldError（表單欄位驗證）
  - 何時用 BottomSheet（多選一的選擇器）
  - 禁止使用 `window.alert / confirm / prompt`
- [ ] 4.2 `UIDESIGN.md` 補「Feedback 元件」章節（Toast / ConfirmDialog / BottomSheet 視覺規格）

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

## 完成條件

- 1.x ~ 4.x 全部勾選
- 5.x dev 驗證通過
- 6.x 上線完成
