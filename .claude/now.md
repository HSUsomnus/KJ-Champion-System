<!--
  .claude/now.md — Claude 動態狀態（git 和 code 無法告訴你的事）
  更新規則：發現新地雷、環境特殊狀態改變、使用者 /打包 時立即更新。
  不記錄：分支狀態（用 git）、tasks 進度（用 tasks.md）、設計決策細節（用 spec.md）。
-->

## 當前 Change

change 13「定時同步Calendar」— 分支 `m_b_定時同步Calendar`，已 merge dev，DEV 驗證中（task 4.2 打 health endpoint 確認 ok:true）。
change 12「統一彈出訊息系統」— 分支 `m_b_統一彈出訊息系統`，0/33 task，尚未開始實作。

## 最近推送

fix(change-13)：b64u Buffer 路徑修正（Invalid JWT Signature）— signer.sign() 回傳 Buffer，JSON.stringify 造成簽名錯誤；已加 Buffer.isBuffer 判斷，merge dev 觸發重新部署。

## 已知地雷

- **CCR 沙箱 git 403**：tag push / 刪分支在 Claude Code Remote 環境會失敗，需使用者本機或手機手動執行
- **CCR 沙箱 npm / node 不可用**：`npm test`、`npm run dev` 等指令在 CCR 環境無法執行。後端測試改走 DEV 部署驗證（打 `/api/debug/health`）；前端 vitest / playwright 需由使用者本機 PC 自行執行
- **測試環境（非本機）**：dev 前端 `kjcs-dev.pages.dev`、dev 後端 `kj-champion-dev.zeabur.app`；main 前端 `kj-champion-system.pages.dev`、main 後端 `kj-champion-system.zeabur.app`
- **prod DB 公網預設關閉**（v2.1.0 起）：日常無法直連 prod DB，維護需去 Zeabur Dashboard 暫開連線埠轉送，做完立刻關
- **測試前必清 Service Worker**：DevTools → Application → Service Workers → Unregister，避免舊 PWA 快取干擾
- **CCR 沙箱 outbound 白名單**：zeabur.com 與 Zeabur DB 公網 IP 不可達，連 DB 的指令必須由 PC 本地執行
- **Zeabur PostgreSQL connection string**：`${POSTGRES_CONNECTION_STRING}` 引用 `${PASSWORD}`（不是 `${POSTGRES_PASSWORD}`），改密碼時兩個都改並重啟後端服務

## 環境特殊狀態

（空白 = 一切正常）
