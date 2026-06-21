<!--
  .claude/now.md — Claude 動態狀態（git 和 code 無法告訴你的事）
  更新規則：發現新地雷、環境特殊狀態改變、使用者 /打包 時立即更新。
  不記錄：分支狀態（用 git）、tasks 進度（用 tasks.md）、設計決策細節（用 spec.md）。
-->

## 當前 Change

change 12「統一彈出訊息系統」— 分支 `m_b_統一彈出訊息系統`，0/33 task，尚未開始實作。dev 已有部分 feedback 元件（FeedbackProvider / useToast / useConfirm），merge main 時需留意衝突。
change 13「定時同步Calendar」— ✅ DONE，已上線 v2.4.0。
change 14「側邊欄導覽」— ✅ DONE，已上線 v2.5.0。
change 15「用戶資料整合」— ✅ DONE，已上線 v2.6.0。
change 16「備份DB同步」— ✅ DONE，已上線 v2.7.0。

## 最近推送

v2.7.0 — change 16「備份 DB 同步」。新增 Zeabur postgresql-backup（內網備份）、postgresql-dev（公網 dev）。後端每 8 小時定時全量覆蓋 prod→backup；admin API：sync-prod-to-backup / sync-backup-to-dev / backup-status（Bearer token 保護）。移除舊 write-through queue 架構。Task 4.1（刪舊 postgresql-dev）待使用者確認後手動完成。

## 已知地雷

- **googleapis / gaxios 在 Zeabur 壞掉**：gaxios@6+ 在 Node.js 18 改用 undici，Zeabur NAT 導致 Premature close。解法：用 raw https.request。詳見 `.claude/context/v2.4.0.md`（學習日誌）
- **CCR 沙箱 git 403**：tag push / 刪分支在 CCR 環境會 403；非 CCR（本機 desktop / VS Code extension）可直接執行。遇到 403 才請使用者補做，不要預先叫使用者手動
- **CCR 沙箱 npm / node 不可用**：`npm test`、`npm run dev` 等指令在 CCR 環境無法執行。後端測試改走 DEV 部署驗證（打 `/api/debug/health`）；前端 vitest / playwright 需由使用者本機 PC 自行執行
- **測試環境（非本機）**：dev 前端 `kjcs-dev.pages.dev`、dev 後端 `kj-champion-dev.zeabur.app`；main 前端 `kj-champion-system.pages.dev`、main 後端 `kj-champion-system.zeabur.app`
- **prod DB 公網預設關閉**（v2.1.0 起）：日常無法直連 prod DB，維護需去 Zeabur Dashboard 暫開連線埠轉送，做完立刻關
- **測試前必清 Service Worker**：DevTools → Application → Service Workers → Unregister，避免舊 PWA 快取干擾
- **CCR 沙箱 outbound 白名單**：zeabur.com 與 Zeabur DB 公網 IP 不可達，連 DB 的指令必須由 PC 本地執行
- **Zeabur PostgreSQL connection string**：`${POSTGRES_CONNECTION_STRING}` 引用 `${PASSWORD}`（不是 `${POSTGRES_PASSWORD}`），改密碼時兩個都改並重啟後端服務

- **備份 DB schema 更新**（v2.7.0 起）：新增 migration 時需暫時開 `kj-champion` → `postgresql-backup` 公網，執行 `$env:TARGET_DB_URL="..."; node scripts/init-db.js`，完成後立刻關公網
- **Zeabur 跨服務變數引用不解析**：`${postgresql-backup.POSTGRES_CONNECTION_STRING}` 在手動填寫的環境變數欄位不會展開，必須填完整連線字串
- **PowerShell ADMIN_SECRET 要用單引號**：含 `$` 字元的 secret 必須 `$secret = 'xxx$yyy'`（單引號），雙引號會把 `$y` 當變數展開導致 401

## 環境特殊狀態

（空白 = 一切正常）
