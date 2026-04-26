# Frontend Rules — 觸碰 frontend/* 時注入

## 當前前端目錄

`frontend/`（React 19 + Vite + PWA），舊 `public/` 已於 v2.0.0 刪除（僅保留 `frontend/public/_worker.js` 給 Cloudflare Pages）。

## 動 UI 前必讀

**任何新增 / 修改前端 UI 元件 / 新增彈窗 / 改視覺前**，先讀根目錄 [`UIDESIGN.md`](../../UIDESIGN.md) — 涵蓋 Warm Minimal 設計系統、Feedback 元件規範、彈出訊息決策樹、禁止事項。

## 修改前確認

1. 確認當前分支（`git branch --show-current`）
2. **main 分支**：強烈警告，修改直接影響正式上線用戶（`server/` 與 `frontend/` 禁止直推 main）
3. **m_b_* 功能分支**：正常開發流程

## 開發 / 測試

- 本機 dev server：`cd frontend && npm run dev`（vite，預設 port 5173）
- 未登入測試：清除 localStorage 的 `lineUserId` 再重整
- 上線前清 Service Worker：DevTools → Application → Service Workers → Unregister，避免舊 SW 快取干擾

## 登入機制

- 正式登入：LINE Login OAuth（不依賴 LIFF SDK，`server/routes/auth.js` 處理 callback）
- 開發者帳號 swap：用瀏覽器 console 改 localStorage `lineUserId` 後重整

## 分享機制

- Web Share API（手機原生分享面板）
- Fallback：clipboard 複製 +「已複製到剪貼簿」**toast**（不要 alert）

---

## 彈出訊息規範（v2.4.0 起，change 12）

**禁止使用瀏覽器原生 `window.alert / confirm / prompt`。** 所有彈出訊息一律走 `frontend/src/components/feedback/` 套件。

### 決策樹 — 新增彈出訊息前對照下表

| 情境 | 用什麼 | API |
|---|---|---|
| 成功反饋（已儲存、已複製、已寄出） | `toast.success()` | `useToast()` |
| 失敗反饋（API 錯誤、操作失敗） | `toast.error()` | `useToast()` |
| 中性告知（不需要反應） | `toast.info()` | `useToast()` |
| 破壞性動作二次確認（刪除、登出、清空） | `useConfirm({ variant: 'danger' })` | `useConfirm()` |
| 一般動作二次確認（送出、儲存） | `useConfirm({ variant: 'default' })` | `useConfirm()` |
| 表單欄位驗證錯誤 | `<FieldError>` inline + 焦點導引 | 直接 import 元件 |
| 多選一選擇器（非下拉） | `useBottomSheet()` 或直接 render `<BottomSheet>` | `useBottomSheet()` |
| 自訂彈窗（非標準場景） | 消費 `<Dialog>` base | 直接 import |

### 反例（禁止）

- ❌ `window.alert / confirm / prompt`
- ❌ 用 `toast.error` 顯示表單欄位錯誤（應該 inline `<FieldError>`，能精準指出哪個欄位）
- ❌ 用 `toast.success` 處理破壞性動作（應該 `useConfirm({ variant: 'danger' })` 二次確認後才 toast）
- ❌ 自己 `fixed inset-0` 寫 modal（應該消費 `<Dialog>` base）
- ❌ 引入第三方通知套件（react-toastify / sonner / hot-toast 等）— 自製套件已涵蓋所有需求

### Utility 函式不能用 hook

`frontend/src/utils/` 內的 utility 函式不能直接呼叫 `useToast()`。處理方式：

- 改函式簽名回傳 result（如 `shareEvent.js` 回傳 `{ ok, copied?, cancelled? }`）
- 由呼叫端 page component 拿到 result 後自行觸發 toast

### 視覺與 API 詳細規格

見 [`UIDESIGN.md`](../../UIDESIGN.md) 「Feedback 元件規範」章節（Toast / ConfirmDialog / BottomSheet / FieldError 完整視覺規格）。

---

## 既有共用元件位置

- `frontend/src/components/Header.jsx`、`FabNav.jsx`、`FabAction.jsx`
- `frontend/src/components/ConfirmLeaveDialog.jsx`（編輯頁離開守衛，內部消費 ConfirmDialog）
- `frontend/src/components/feedback/`（彈出訊息套件 — 詳見上方）
