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

## 自動化測試（v2.4.0 起，change 12）

> **核心原則**：蓋一層測一層 — 每個 task source + 對應 test 一起寫，跑該層測試全綠才勾 [x] 進下一 task。詳細流程見 [`workflow.md`](workflow.md)「執行計畫」+「測試功能」。

### 三軌分工

| 軌道 | 範圍 | 跑法 |
|---|---|---|
| **Vitest 元件單元** | feedback 套件 / 純邏輯元件 / utility — 抓「這層自己對不對」 | `npm --prefix frontend run test:run` |
| **Playwright E2E** | page 流程 / 表單驗證 / 彈窗互動 / 多步使用者旅程 | `npm --prefix frontend run test:e2e` |
| **手動（dev 站）** | PWA install / 真實 `navigator.share` / 視覺感受 / 跨裝置 | 瀏覽器開 [kjcs-dev.pages.dev](https://kjcs-dev.pages.dev) |

### 寫測試的時機（task → test 對照）

| task 類型 | 測試檔位置 | 測試類型 |
|---|---|---|
| 新元件 `frontend/src/components/<dir>/Foo.jsx` | `<dir>/__tests__/Foo.test.jsx` | vitest |
| 新 utility `frontend/src/utils/Foo.js` | `frontend/src/utils/__tests__/Foo.test.js` | vitest |
| 改 page 流程（表單 / 彈窗 / 跳轉） | `frontend/e2e/<spec>.spec.js`（新或補 case） | playwright |
| 改既有元件 / utility | 跑既存 test 檔 + 必要時補 case | vitest |
| 純文件 / 規則 / OpenSpec | — | 跳過 |

### npm scripts

```bash
npm --prefix frontend test                  # vitest watch（改 source 自動重跑）
npm --prefix frontend run test:run          # vitest 一次跑（每個 task 完成後跑這個）
npm --prefix frontend run test:run -- <檔>  # vitest 指定檔加速
npm --prefix frontend run test:e2e          # playwright（自動啟 vite dev）
npm --prefix frontend run test:e2e:ui       # playwright 互動式 debug + 看 trace
```

### 寫測試的踩坑筆記（給未來 change 參考）

- **vitest@4 與 vite@8 不相容** — 用 `vitest@^3.2`（v4 的 `describe` 會 throw 「Cannot read properties of undefined (reading 'config')」即便最簡 sanity test 也壞）
- **vitest pipeline 不會自動掛 `plugin-react`** — vite.config.js 要明確設 `esbuild.jsx='automatic'` + `jsxImportSource='react'`，否則 jsx source 會 `ReferenceError: React is not defined`
- **vite 8 build 用 oxc 取代 esbuild** — 會印 「esbuild options ignored」warning，但 vitest 仍用 esbuild，互不影響
- **`@testing-library/react` v16 需要 peer dep `@testing-library/dom`** — 不裝會 「Cannot find module '@testing-library/dom'」
- **vitest 4+ 的 setupFiles 不能直接用 `afterEach`** — testing-library v16 + globals 已自動 cleanup，setup.js 只需 `import '@testing-library/jest-dom/vitest'`

### Fail 排查順序

見 [`workflow.md`](workflow.md)「執行計畫」→「Fail 排查順序」（含 vite8+vitest4 整合衝突案例）。

---

## 既有共用元件位置

- `frontend/src/components/Header.jsx`、`FabNav.jsx`、`FabAction.jsx`
- `frontend/src/components/ConfirmLeaveDialog.jsx`（編輯頁離開守衛，內部消費 ConfirmDialog）
- `frontend/src/components/feedback/`（彈出訊息套件 — 詳見上方）
