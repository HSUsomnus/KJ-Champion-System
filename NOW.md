# NOW.md — 當前執行狀態
> 此文件由 Claude Code 自動維護，人工只維護「設計決策」區塊。
> 上下文快滿時輸入 `/打包`，新對話輸入 `/繼續`。

---

## 功能範圍

同時進行兩個 Change：
1. **Change 06 — 新UI前端開發**（分支 `m_b_開發新UI前端`）：React 18 + Vite 5 + Tailwind CSS 前端重建，目前在 06.8 DEV 測試站驗證
2. **Change 07 — OAuth 動態 redirect**（分支 `m_b_oauth動態redirect`）：後端 auth.js 自動偵測前端 origin，DEV 測試已通過

兩個 Change 都通過 DEV 測試後，一起合併到 main。

## 設計決策

- UI 風格：Warm Minimal（`#F7F5F2` bg, `#4A7C59` accent, `#2C2C2C` text, `rounded-xl`）
- OAuth 動態 redirect：後端從 request headers（Origin/Referer）偵測前端 origin，編入 OAuth state，callback 後用該 origin redirect。白名單驗證防 open redirect
- `_worker.js` ZEABUR_BACKEND：DEV 分支指向 `kj-champion-system-dev.zeabur.app`，正式版指向 `kj-champion-system.zeabur.app`
- FAB onOpen：不用 inline useCallback（會因 early return 違反 hooks 規則），直接用箭頭函式

## 目前進度

- 上次停在：06.8 DEV 測試中，已修完 React hooks 違規（13 個頁面），推送到 dev，成員列表頁正常
- 已完成驗證：LINE Login OAuth ✅、成員列表 ✅、成員詳情不再崩潰 ✅
- 尚未驗證：行事曆頁、個人資料頁、FAB 導航/操作、新增行程、財力頁、PWA 安裝
- 下一步：使用者繼續在 `kjcs-dev.pages.dev` 測試剩餘頁面，發現 bug 就修 → 全部通過後 06.8 標完成 → 07 + 06 合併到 main

## 已知地雷

- DEV 後端 `APP_URL` 已修正為 `https://kj-champion-system-dev.zeabur.app`，LINE Console 已加此 callback URL
- 部分成員 avatar 404 是正常的（該成員無頭像），前端有 fallback 顯示姓名首字
- 測試前必須清 Service Worker（DevTools → Application → Service Workers → Unregister）避免舊 SW 快取干擾
- `frontend/public/_worker.js` 在 DEV 分支指向 dev 後端，合併 main 時需確認是否要改回正式後端 URL
