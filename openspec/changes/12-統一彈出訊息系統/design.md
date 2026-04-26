# Design: 統一彈出訊息系統

## 架構

```
App.jsx
└─ <FeedbackProvider>          ← context: { toast, confirm, bottomSheet }
   ├─ <BrowserRouter>...        ← 應用內所有頁面
   ├─ <ToastContainer />        ← portal → document.body, fixed bottom
   └─ <ActiveDialogPortal />    ← portal → document.body, 同時最多一個 Dialog/BottomSheet
```

頁面組件：
```js
import { useToast, useConfirm } from '@/components/feedback'

function EventDetail() {
  const toast = useToast()
  const confirm = useConfirm()

  const handleDelete = async () => {
    const ok = await confirm({
      title: '確認刪除',
      message: `確定刪除「${title}」？此操作無法復原`,
      confirmText: '刪除',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await api.deleteEvent(id)
      toast.success('已刪除')
      navigate('/calendar')
    } catch (err) {
      toast.error(err.message || '刪除失敗')
    }
  }
}
```

## 關鍵設計決策

### 1. 為什麼自製不用第三方？

- 既有 `package.json` 沒有任何通知套件，引入新依賴會增加 bundle size 與 SDK 鎖定風險
- Warm Minimal 風格高度客製，第三方主題化反而要花更多時間覆寫
- API 需求簡單（4 個方法 + 1 個 hook），自製 < 200 行就能完成
- 與現有 `ConfirmLeaveDialog` portal + Tailwind 模式完全相容

### 2. 為什麼 Toast 與 Confirm 共用 Provider？

兩者都需要全域 single mount point + portal，且呼叫 site 都希望「在任意元件用 hook 觸發」。一個 Provider 內部分兩個 reducer 比兩個 Provider 巢狀更簡潔。`<FeedbackProvider>` 對外暴露三個 hook（`useToast` / `useConfirm` / `useBottomSheet`），開發者按需取用。

### 3. ConfirmDialog 的 Promise API

```js
const ok = await confirm({ ... })
```

這個簽名讓使用端不必處理 `onConfirm` / `onCancel` callback，邏輯線性、可讀。內部以 `useRef<{ resolve }>` 保存當前 pending Promise，使用者按按鈕後 resolve(true/false) 並關閉。

### 4. Toast 視覺與堆疊

- 位置：`fixed bottom-24 left-1/2 -translate-x-1/2`（避開 FAB 區）
- 多筆同時：往上堆疊，間距 8px，最多顯示 3 筆，超過排隊
- 自動消失時長：`success 2s` / `info 3s` / `error 4s`（error 多停一下讓使用者看清）
- 視覺：`bg-white` + 左側 4px 色條 + `rounded-xl` + `shadow-md` + 12px padding
  - success：`#4A7C59` accent 條
  - info：`#8A8680` muted 條
  - error：`#C0392B` 紅條
- 進場動畫：`opacity 0→1 + translateY 8px→0`，0.2s ease（符合 DESIGN_SYSTEM 動畫規範）

### 5. ConfirmDialog 視覺基底

直接沿用 `ConfirmLeaveDialog` 的視覺：
- 遮罩：`rgba(44,44,44,0.4)` + `z-[60]`
- 卡片：`bg-white` + `rounded-2xl` + 24px padding + `shadow-lg`
- danger 按鈕：`#FDECEA` 底 / `#C0392B` 字 / `#C0392B` 邊
- default 按鈕：`#2C2C2C` 底 / 白字（主要按鈕規範）
- 取消按鈕：`#EFEDE9` 底 / `#8A8680` 字

`ConfirmLeaveDialog` 重構為消費 `<Dialog>` base，邏輯（`useLeaveGuard`、`useBlocker` 整合）保留不動。

### 6. FieldError 與表單驗證流程

```jsx
<input value={realName} ... />
{errors.realName && <FieldError>{errors.realName}</FieldError>}
```

- 驗證時機：`handleConfirm` 內先收集所有 error，setState 後 return（不送出）
- 第一個錯誤的欄位自動 focus + scrollIntoView
- 視覺：`#C0392B` 12px 字 + 6px dot bullet 在左、4px margin-top
- 不用 toast 顯示「請填寫所有欄位」之類的總結（inline 已足夠）

### 7. BottomSheet 抽出

`AmountPicker` 內聯版本太大（~30 行 JSX 寫死），抽 `<BottomSheet>` base 後：
- AmountPicker 變 `<BottomSheet title="選擇金額">{ amounts.map(...) }</BottomSheet>`
- 將來若需要其他底部選單（行程類型選擇、成員多選等）可重用

### 8. 為什麼不只用 toast 處理表單錯誤？

- toast 是「臨時通知」（自動消失），表單錯誤需要「持續可見直到使用者修正」
- 表單錯誤要對應到具體欄位，inline 才能直接指出位置
- 多個欄位錯誤同時 toast 會洗版

## 元件 API 規格

### useToast()

```ts
const toast = useToast()
toast.success(message: string, options?: { duration?: number })
toast.error(message: string, options?: { duration?: number })
toast.info(message: string, options?: { duration?: number })
toast.dismiss(id?: string)  // 不傳 id 清空全部
```

### useConfirm()

```ts
const confirm = useConfirm()
const ok: boolean = await confirm({
  title?: string,
  message: string,
  confirmText?: string,    // 預設「確認」
  cancelText?: string,     // 預設「取消」
  variant?: 'default' | 'danger',  // 預設 'default'
})
```

點擊遮罩 = 取消（resolve false），符合 ConfirmLeaveDialog 既有行為。

### useBottomSheet()

```ts
const sheet = useBottomSheet()
const result: T | null = await sheet.open<T>({
  title: string,
  render: (close: (val: T | null) => void) => ReactNode,
})
```

把選擇邏輯交給呼叫端的 `render`，BottomSheet base 只管容器與遮罩。

### <FieldError>

```jsx
<FieldError>{message}</FieldError>
// → <p className="..." style={{ color: '#C0392B' }}><span>•</span> {message}</p>
```

純展示元件，不管狀態，由父層條件渲染。

## 檔案結構

```
frontend/src/components/feedback/
├── index.js                 ← export 所有 hook 與元件
├── FeedbackProvider.jsx     ← context provider
├── ToastContainer.jsx       ← portal + 訊息堆疊
├── Toast.jsx                ← 單一 toast 視覺
├── Dialog.jsx               ← Dialog base（遮罩 + 卡片容器）
├── ConfirmDialog.jsx        ← 消費 Dialog 的 confirm 對話框
├── BottomSheet.jsx          ← 底部抽屜 base
└── FieldError.jsx           ← 表單欄位錯誤紅字
```

`ConfirmLeaveDialog.jsx` 不搬位置（避免改 import path 散落多檔），但內部改用 `<Dialog>` base。

## 風險

- **r1 視覺一致性**：替換 14 處時可能 miss 部分情境的 message 文案。緩解：每改一處 commit 一次，dev 上人工掃過完整流程
- **r2 Provider 漏包**：若忘記在 App.jsx 包 `<FeedbackProvider>`，hook 呼叫會 throw。緩解：hook 內部加 friendly error message
- **r3 Service Worker 快取**：上線後使用者拿到舊 bundle 仍是 alert。緩解：上線時遵守既有 SW 更新流程，NOW.md 提醒
