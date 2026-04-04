# Tasks — 07 OAuth 動態 Redirect

## 進度

`████░░░░░░░░░` 33% — 完成 1 / 3 個子任務

---

## ✅ 已完成

- [x] **07.1 修改 server/routes/auth.js**（Claude 程式碼）
  - ✅ 新增 `getClientOrigin(req)` 函式（從 Origin/Referer header 取得前端 origin）
  - ✅ 新增 `isAllowedOrigin(origin)` 函式（白名單驗證：*.pages.dev、kj-champion*、localhost）
  - ✅ `/line-login`：偵測 origin → 編碼進 OAuth state 的 `frontendOrigin` 欄位
  - ✅ `/line-callback`：從 state 取出 `frontendOrigin`，fallback 到 `FRONTEND_URL`
  - ✅ 向下相容：無 origin 或不在白名單 → 行為與現在完全相同

---

## ⬜ 待完成

- [ ] **07.2 推送 DEV 測試**（Claude git + 使用者驗證）
  1. merge `m_b_oauth動態redirect` → `dev`，push
  2. 使用者在 `kjcs-dev.pages.dev` 驗證：
     - 點 LINE 登入 → 授權後是否跳回 `kjcs-dev.pages.dev`（不再跳到正式站）
     - 登入後進入新版 React UI（不是舊版 HTML）

- [ ] **07.3 合併 main 上線**（使用者確認後）
  1. merge `m_b_oauth動態redirect` → `main`
  2. 確認正式站 LINE 登入仍正常
  3. 刪除功能分支

---

> **下一步**：說「執行計畫」開始實作 07.1。

> **下一步**：07.1 完成。Commit 後推送 DEV 測試（07.2）。

最後更新：2026-04-03
