# NOW.md — 當前執行狀態
> 此文件由 Claude Code 自動維護，人工只維護「設計決策」區塊。
> 上下文快滿時輸入 `/打包`，新對話輸入 `/繼續`。

---

## 功能範圍

v2.0.4 hotfix 上線完成：修復「新增行程」兩個 UX bug（靜默無反應 + 誤跳未儲存警告），附帶全站編輯頁 FAB「確認」→「確認/儲存」。

## 設計決策

- UI 風格：Warm Minimal（`#F7F5F2` bg, `#4A7C59` accent, `#2C2C2C` text, `rounded-xl`）
- OAuth 動態 redirect：後端從 request headers（Origin/Referer）偵測前端 origin，編入 OAuth state，callback 後用該 origin redirect。白名單驗證防 open redirect
- `_worker.js` `resolveBackend(hostname)`：`kjcs-dev.pages.dev` → dev 後端；其他 → 正式後端
- FAB onOpen：不用 inline useCallback（會因 early return 違反 hooks 規則），直接用箭頭函式
- 前端目錄：`frontend/`（React + Vite + PWA），舊 `public/` 已於 v2.0.0 刪除
- FAB 顏色統一不變色：左下 `#2C2C2C`、右下 `#4A7C59`，editMode 不改色
- **useLeaveGuard 用 useRef 而非 useState**：避免與 react-router v7 `useBlocker` 的 useEffect 延遲註冊產生時序競態（v2.0.4）
- 編輯頁 FAB 紅色按鈕統一文字：「確認/儲存」（v2.0.4）

## 目前進度

- **目前分支**：`main`（v2.0.4 已完成）
- **已 push 到 main 的最新 commits**：
  - `c3dc878` — chore: v2.0.4 版本資訊
  - `921ddcd` — merge: hotfix/add-event-save-no-feedback → main
  - `434efb6` — fix: useLeaveGuard 改用 ref
  - `952cc64` — fix: 新增行程必填提示 + FAB 確認/儲存
- **tag 狀態（遠端）**：v2.0.0 ~ v2.0.4 完整（v2.0.3、v2.0.4 由使用者手機補建）
- **dev 分支**：`dbb4c39` 已同步 main
- **殘留 hotfix 分支**：全部已清（使用者手機操作刪除）

### 本次 v2.0.4 修復內容

1. **新增行程靜默無反應**：`handleConfirm` 漏填欄位時 silent return → 改 `alert('請輸入標題')` / `alert('請選擇開始日期')`
2. **useLeaveGuard 時序競態**：原 `useState(saved)` + `useBlocker(!saved)` 在 `setSaved()` 後 navigate 仍誤攔截 → 改 `useRef` + `useCallback` 穩定 shouldBlock
3. **FAB 統一文字**：`AddEvent / ProfileEdit / UserStatsEdit / FinancialUpload / FinancialEdit` 紅色「確認」→「確認/儲存」

## 已知地雷

- DEV 後端 `APP_URL` 為 `https://kj-champion-system-dev.zeabur.app`，LINE Console 已加此 callback URL
- 部分成員 avatar 404 是正常的（該成員無頭像），前端有 fallback 顯示姓名首字
- 測試前必須清 Service Worker（DevTools → Application → Service Workers → Unregister）避免舊 SW 快取干擾
- **CCR 沙箱 git 限制（v2.0.4 發現）**：Claude Code Remote 環境的本機 git proxy 會拒絕 tag push 與 branch delete（HTTP 403）。推完 main 後 Claude 必須主動提醒使用者手機或本機手動建 tag + 刪分支。詳見 `.claude/rules/deploy.md` 的「CCR 沙箱 git 限制」章節
- Bash 輸出 `Everything up-to-date` 出現在 403 錯誤之後時不代表成功，必須用 `git ls-remote --tags origin` 驗證
