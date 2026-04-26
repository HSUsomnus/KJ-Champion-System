# Proposal: 統一彈出訊息系統

## 背景

目前前端散落 14 處瀏覽器原生 `alert()` / `confirm()`，視覺與互動完全不符 Warm Minimal 設計風格（米白底、深綠 accent、`rounded-2xl`）。已存在的自製對話框（`ConfirmLeaveDialog`、AddEvent 內的 `ShareConfirmDialog`、FinancialEdit 內的 `AmountPicker`）三套各寫各的，沒抽出共用基底，也沒有統一的 Toast / 通知系統。

## 動機

- 視覺一致性：所有彈出訊息符合 `UIDESIGN.md` 規範
- DX：抽出 `useToast()` / `useConfirm()` hook 後，新功能不必每次自己拼 modal
- 規範化：寫進 `.claude/rules/frontend.md`，未來新功能不會再回頭用 `alert()`
- 表單體驗：欄位錯誤從「跳出 alert 打斷流程」改為「inline 紅字 + 焦點導引」

## 範圍

### 新元件（`frontend/src/components/feedback/`）

1. **`<ToastContainer />` + `useToast()` hook**
   - API：`toast.success(msg)` / `toast.error(msg)` / `toast.info(msg)`
   - 視覺：螢幕底部 stack，自動消失（success 2s / info 3s / error 4s）
   - 風格：白底 + 左側 4px 色條（綠 / 紅 / 暖灰）+ `rounded-xl`

2. **`<ConfirmDialog />` + `useConfirm()` hook**
   - API：`await confirm({ title, message, confirmText, cancelText, variant })`
   - `variant: 'default' | 'danger'`，danger 用 `#FDECEA` / `#C0392B`（同 ConfirmLeaveDialog）
   - 回傳 `Promise<boolean>`

3. **`<FieldError />` 元件**
   - 表單欄位下方的紅字錯誤訊息
   - 風格：`#C0392B` 12px，左側 dot bullet

4. **`<FeedbackProvider />`**
   - 包在 `App.jsx` 最外層，提供上述 hook 的 context
   - 同時 portal mount `<ToastContainer />` 與當前 `<ConfirmDialog />`

### 既有彈出元件統一

- `ShareConfirmDialog`（AddEvent 內聯）→ 抽出至 `components/feedback/Dialog.jsx` 作為通用 Dialog base
- `ConfirmLeaveDialog` 改為消費 `Dialog` base，邏輯保留
- `AmountPicker`（FinancialEdit 內聯）→ 抽出 `components/feedback/BottomSheet.jsx` base，AmountPicker 變消費者

### 替換清單（14 處 alert/confirm 全部替換）

| 檔案 | 原本 | 替換為 |
|---|---|---|
| `ProfileEdit.jsx` × 4 必填驗證 | alert | `<FieldError />` inline |
| `ProfileEdit.jsx` API 失敗 | alert | `toast.error()` |
| `AddEvent.jsx` × 2 必填驗證 | alert | `<FieldError />` inline |
| `AddEvent.jsx` API 失敗 | alert | `toast.error()` |
| `EventDetail.jsx` 刪除確認 | confirm | `useConfirm({ variant:'danger' })` |
| `FinancialEdit.jsx` × 2 API 失敗 | alert | `toast.error()` |
| `FinancialUpload.jsx` API 失敗 | alert | `toast.error()` |
| `UserStatsEdit.jsx` 必填 | alert | `<FieldError />` inline |
| `UserStatsEdit.jsx` API 失敗 | alert | `toast.error()` |
| `Management.jsx` API 失敗 | alert | `toast.error()` |
| `shareEvent.js` 已複製 | alert | `toast.success()` |
| `Calendar.jsx` 已複製 | alert | `toast.success()` |

### 規則文件

- 新增 `.claude/rules/frontend.md` 「彈出訊息規範」章節，列出何時用 toast、何時用 dialog、何時用 inline error，禁止 `alert / confirm / prompt`

## 非目標

- 不引入第三方套件（react-toastify / sonner / hot-toast）— 自製可控，避免 SDK 鎖定
- 不做訊息歷史記錄 / 通知中心
- 不做 loading spinner 統一（不在此次範圍）
- 不重構 FabNav / FabAction（它們不屬於「訊息」類別）

## 影響

### 受影響的檔案

- 新增：`frontend/src/components/feedback/` 整包（Toast / ConfirmDialog / Dialog / BottomSheet / FieldError / FeedbackProvider）
- 修改：`frontend/src/App.jsx`（包 Provider）、上述替換清單 9 個 page 檔 + 1 個 util
- 修改：`frontend/src/components/ConfirmLeaveDialog.jsx`（改用 Dialog base）
- 修改：`.claude/rules/frontend.md`、`UIDESIGN.md`（補充元件規範）

### 不影響

- 後端 API、DB schema、部署設定全部不動
- FabNav / FabAction / 既有頁面布局與功能邏輯
