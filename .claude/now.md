<!--
  .claude/now.md — Claude 動態狀態（git 和 code 無法告訴你的事）
  更新規則：發現新地雷、環境特殊狀態改變、使用者 /打包 時立即更新。
  不記錄：分支狀態（用 git）、tasks 進度（用 tasks.md）、設計決策細節（用 spec.md）。
  已解決或已寫入 context 檔的地雷，必須從本檔移除（地雷清單只增不減 = 本檔膨脹失效）。
-->

## 當前 Change

change 12「統一彈出訊息系統」— 分支 `m_b_統一彈出訊息系統`，0/33 task，尚未開始實作。dev 已有部分 feedback 元件（FeedbackProvider / useToast / useConfirm），merge main 時需留意衝突。Home.jsx 中有臨時 pwaDialog inline modal，待 change 12 完成後替換為 feedback 元件。

change 19「主頁快捷資訊」— ✅ DONE，已上線 v2.10.0。

change 22「規則體系重構與 Token 降本」— ✅ DONE，已上線 v2.11.0。分支 `m_b_規則體系重構` 已刪除。

change 23「模型分層工作證」— 依賴 change 22（現已完成）可以開始，尚未動工。復工前提醒：`.claude/skills/`、git-guard deny 模式、deploy-release skill 皆已就緒。

change 20「團隊調查表單系統」（分支 `claude/new-feature-pz95p1`）、`claude/new-session-k97gfv`（AI員工後端橋接，復工時編號改 21）— 復工時 `.claude/` 相關衝突一律取 main 版本；spec 需從舊路徑搬到 `changes/`。

## 最近推送

v2.11.0：change 22「規則體系重構」上線 main。`.claude/rules/` 8 個規則檔改造為 4 個 `.claude/skills/`（依情境自動載入）；git-guard.js 三類攔截升級為 deny（main 產品碼 commit / `git add -A` / commit 缺型別前綴），heredoc commit 誤判已修正；新增 `scripts/sync-branches.sh`（衝突預設停下回報，不自動覆蓋）；`openspec/changes/` 改名 `changes/` 並清空已完成資料夾；`docs/` 19 份過時文件歸檔至 `docs/archive/`。常駐 token ~19,000 → ~2,453。詳見 `.claude/context/v2.11.0.md`。

## 已知地雷

- **googleapis / gaxios 在 Zeabur 壞掉**：gaxios@6+ 在 Node.js 18 改用 undici，Zeabur NAT 導致 Premature close。解法：用 raw https.request。詳見 `.claude/context/v2.4.0.md`（學習日誌）
- **CCR 沙箱 git 403**：tag push / 刪分支在 CCR 環境會 403；非 CCR（本機 desktop / VS Code extension）可直接執行。遇到 403 才請使用者補做，不要預先叫使用者手動
- **CCR 沙箱 npm / node 不可用**：`npm test`、`npm run dev` 等指令在 CCR 環境無法執行。後端測試改走 DEV 部署驗證（打 `/api/debug/health`）；前端 vitest / playwright 需由使用者本機 PC 自行執行
- **測試環境（非本機）**：dev 前端 `kjcs-dev.pages.dev`、dev 後端 `kj-champion-dev.zeabur.app`；main 前端 `kj-champion-system.pages.dev`、main 後端 `kj-champion-system.zeabur.app`
- **prod DB 公網預設關閉**（v2.1.0 起）：日常無法直連 prod DB，維護需去 Zeabur Dashboard 暫開連線埠轉送，做完立刻關
- **測試前必清 Service Worker**：DevTools → Application → Service Workers → Unregister，避免舊 PWA 快取干擾
- **CCR 沙箱 outbound 白名單**：zeabur.com 與 Zeabur DB 公網 IP 不可達，連 DB 的指令必須由 PC 本地執行
- **Zeabur PostgreSQL connection string**：`${POSTGRES_CONNECTION_STRING}` 引用 `${PASSWORD}`（不是 `${POSTGRES_PASSWORD}`），改密碼時兩個都改並重啟後端服務
- **備份 DB schema 更新**（v2.7.0 起）：新增 migration 時不開公網，直接到 `kj-champion` → `postgresql-backup` → Console 貼上 migration SQL（詳見 database skill）
- **Zeabur 跨服務變數引用不解析**：`${postgresql-backup.POSTGRES_CONNECTION_STRING}` 在手動填寫的環境變數欄位不會展開，必須填完整連線字串
- **PowerShell ADMIN_SECRET 要用單引號**：含 `$` 字元的 secret 必須 `$secret = 'xxx$yyy'`（單引號），雙引號會把 `$y` 當變數展開導致 401
- **sync-backup-to-dev 已移除**（v2.8.0）：dev DB 寫入只能手動。流程：prod 後端 export-backup-csv API → 下載 CSV → Zeabur `postgresql-dev` Console 貼上 INSERT/UPSERT SQL
- **Zeabur 基礎映像 bug**（v2.8.1 hotfix）：Zeabur Node.js 映像更新後 `promise-retry` 缺失，`npm update -g npm` 失敗。修法：`package.json engines` 加 `"npm": "10"`。若未來再遇 Zeabur build 失敗先查論壇

## 環境特殊狀態

（空白 = 一切正常）
