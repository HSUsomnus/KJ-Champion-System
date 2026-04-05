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
- **hotfix 準備收尾**：commit → push → merge main

### 本次 hotfix 已修的問題

1. **手機檔案選擇器** — accept 移除圖片 MIME type，只保留 xlsx/xls/csv，手機不再跳媒體 picker
2. **試算表預覽** — 新增 `FinancialPreview.jsx`，用 xlsx 套件前端解析並以 Excel 風格表格展示
3. **管理介面 → 用戶財力頁** — Management 財力 tab 卡片可點擊導航、不受隱藏開關、editMode 時可編輯財力金額（瀑布流 picker 100萬～10億）
4. **選取/編輯模式** — FAB「選取/編輯」進入、多選卡片、刪除/下載/確認/取消、離開守衛（ConfirmLeaveDialog）
5. **FAB 顏色統一** — editMode 不再改變 FAB 顏色
6. **離開守衛統一** — 改用共用 `useLeaveGuard` hook，取代自行內嵌 useBlocker
7. **點擊文件用原生 APP 開啟** — Web Share API with files，手機可直接用 Excel/Google Sheets/Numbers 開啟試算表，桌面 fallback 到網頁預覽

### 下一步

- commit → push → merge main → 等使用者確認後刪除 hotfix 分支 → main 同步到所有本機分支

## 已知地雷

- DEV 後端 `APP_URL` 為 `https://kj-champion-system-dev.zeabur.app`，LINE Console 已加此 callback URL
- 部分成員 avatar 404 是正常的（該成員無頭像），前端有 fallback 顯示姓名首字
- 測試前必須清 Service Worker（DevTools → Application → Service Workers → Unregister）避免舊 SW 快取干擾
- hotfix push + merge main 後不要自動刪分支或同步，等使用者確認修完再繼續
