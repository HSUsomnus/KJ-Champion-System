# NOW.md — 當前執行狀態
> 此文件由 Claude Code 自動維護，人工只維護「設計決策」區塊。
> 上下文快滿時輸入 `/打包`，新對話輸入 `/繼續`。

---

## 功能範圍

三分支合併 main 已完成上線：
1. **v1.6.0** — OAuth 動態 redirect（`m_b_oauth動態redirect` → main）
2. **v2.0.0** — React 新前端上線（`m_b_開發新UI前端` → main，舊 `public/` 已刪除）
3. **v2.0.1** — Vercel 全站 301 轉址（cherry-pick `m_b_vercel轉址` → main）

## 設計決策

- UI 風格：Warm Minimal（`#F7F5F2` bg, `#4A7C59` accent, `#2C2C2C` text, `rounded-xl`）
- OAuth 動態 redirect：後端從 request headers（Origin/Referer）偵測前端 origin，編入 OAuth state，callback 後用該 origin redirect。白名單驗證防 open redirect
- `_worker.js` ZEABUR_BACKEND：正式版指向 `kj-champion-system.zeabur.app`
- FAB onOpen：不用 inline useCallback（會因 early return 違反 hooks 規則），直接用箭頭函式
- 根目錄 `public/`（舊 HTML+JS 前端）已在 v2.0.0 刪除，前端完全在 `frontend/`
- FAB 顏色統一不變色：左下 `#2C2C2C`、右下 `#4A7C59`，editMode 不改色

## 目前進度

- **目前分支**：`hotfix/financial-upload-accept`（從 main 切出，修復財力相關 bug）
- **已 push + merge main 的 commits**：
  - `5936d6c` — 修復手機檔案選擇器無法顯示試算表格式
  - `1d0c8d1` — 修復財力上傳檔案選擇器 + 財力頁功能補齊
  - `61c87a8` — 新增 hotfix 完整工作流規則
  - `302f627` — 試算表預覽頁 + 選取/編輯模式 + 管理介面不受隱藏
- **需要 revert main 上的錯誤 commit `91bf7b5`**

### 本次 hotfix 已修的問題（302f627 之前的 commit，正確）

1. **手機檔案選擇器** — accept 移除圖片 MIME type，只保留 xlsx/xls/csv，手機不再跳媒體 picker
2. **試算表預覽** — 新增 `FinancialPreview.jsx`，用 xlsx 套件前端解析並以 Excel 風格表格展示
3. **管理介面 → 用戶財力頁** — Management 財力 tab 卡片可點擊導航、不受隱藏開關、editMode 時可編輯財力金額（瀑布流 picker 100萬～10億）
4. **選取/編輯模式** — FAB「選取/編輯」進入、多選卡片、刪除/下載/確認/取消、離開守衛（ConfirmLeaveDialog）
5. **FAB 顏色統一** — editMode 不再改變 FAB 顏色

### ⛔ 錯誤 commit `91bf7b5`（需 revert）

以下改動全部錯誤，已 push 到 main，需要 revert：
- **useLeaveGuard 錯誤**：把 `useBlocker(editMode)` 換成 `useLeaveGuard()`，導致一進頁面就攔截所有導航。Financial.jsx 是有模式切換的頁面，只需 `useBlocker(editMode)` 在編輯模式時攔截，不該用 `useLeaveGuard`
- **Web Share API 錯誤**：`navigator.share({ files })` 彈出的是「分享」選單，不是 LINE 聊天室的「用 APP 開啟檔案」體驗。方向完全錯誤
- **計畫外修改混入**：FAB 顏色、setSaved(true) 等不在 plan mode 計畫中的改動被混入同一 commit

### 下一步

1. **revert main 上的 `91bf7b5`** → push main
2. **重新研究** LINE 聊天室開啟檔案的實際機制（不是 Web Share API）
3. **正確實作**：Financial.jsx 點擊文件卡片用本地 APP 開啟試算表
4. 離開守衛維持 `useBlocker(editMode)` 不動

## 已知地雷

- DEV 後端 `APP_URL` 為 `https://kj-champion-system-dev.zeabur.app`，LINE Console 已加此 callback URL
- 部分成員 avatar 404 是正常的（該成員無頭像），前端有 fallback 顯示姓名首字
- 測試前必須清 Service Worker（DevTools → Application → Service Workers → Unregister）避免舊 SW 快取干擾
- hotfix push + merge main 後不要自動刪分支或同步，等使用者確認修完再繼續
