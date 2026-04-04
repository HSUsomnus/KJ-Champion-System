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

## 目前進度

- 上次停在：**三分支合併 main 全部完成，收尾中（同步分支）**
- v1.6.0 ✅ push + tag 完成
- v2.0.0 ✅ push + tag 完成
- v2.0.1 ✅ push + tag 完成
- 下一步：main 合併到各分支同步

## 已知地雷

- DEV 後端 `APP_URL` 為 `https://kj-champion-system-dev.zeabur.app`，LINE Console 已加此 callback URL
- 部分成員 avatar 404 是正常的（該成員無頭像），前端有 fallback 顯示姓名首字
- 測試前必須清 Service Worker（DevTools → Application → Service Workers → Unregister）避免舊 SW 快取干擾
