<!--
  .claude/now.md — Claude 動態狀態（git 和 code 無法告訴你的事）
  更新規則：發現新地雷、環境特殊狀態改變、使用者 /打包 時立即更新。
  不記錄：分支狀態（用 git）、tasks 進度（用 tasks.md）、設計決策細節（用 spec.md）。
  已解決或已寫入 context 檔的地雷，必須從本檔移除（地雷清單只增不減 = 本檔膨脹失效）。
-->

## 當前 Change

- change 26「/打包、/繼續 指令實作」— **已於 2026-07-12 上 main**（使用者於 Termius 手動 cherry-pick + push，main HEAD `002cb01`）。剩 Phase 0（懸掛分支清理）與 `sync-branches.sh` 待 remote-control session 收尾。
- change 27「role-guard 補強」— 分支 `m_b_role-guard補強`（自 change 26 分支切出），spec + tasks 已定稿，待 Sonnet `/實作` 執行。**上線順序固定 26 → 27**（27 分支夾帶 26 commits，先推 27 等於偷渡 26 上線；tasks 3.1 有前置檢查）。
- change 20「團隊調查表單系統」— 分支 `m_b_調查表單`，待復工。規格文件已遷入 `changes/20-團隊調查表單系統/spec.md`。復工時注意 `.claude/` 變更一律取 main 版本。

（change 12「統一彈出訊息系統」已於 2026-07-11 封存廢除，成品在 tag `archive/change-12`；change 24「收尾清理」與 change 25「三層流程補強」均已上線 main）

## 最近推送

規則類直推（2026-07-12）：change 26「/打包、/繼續 指令實作」——新增 `.claude/commands/打包.md`、`繼續.md`、`診斷.md`（+ role-guard.js doctor 角色圍籬）；CLAUDE.md 補 /打包 vs /compact 機制區分、啟動規則改讀 `origin/main`、Session 角色段補 /診斷；workflow SKILL.md／git-guard.js 修正過時 `deploy.md` 引用為 deploy-release skill；now.md 修正 change 20 spec 路徑；workflow SKILL.md／規劃.md 補「Sub-agent 平行執行配置」四條判準；刪除已壞的 `子代理.md`。詳見 `changes/26-打包繼續指令/spec.md`。

規則類直推（2026-07-11）：上線確認訊息「指令雙軌」紀律——code block 只放「現在請你執行」的指令，預告類步驟用文字描述、使用者手動步驟輪到才給。寫入 deploy-release skill「推送到 main」段與 `/實作` command 回報紀律。起因：v2.12.2 上線確認時預告指令被提前執行，tag 打錯位置。

v2.12.2：change 25「三層流程補強」— 第二次實地驗證 + 制度化修補 change 24 暴露的六個交接缺口。`.claude/commands/` 規劃/實作 command 強化；`.claude/agents/收尾員.md` 交接素材改為動態取值；`.claude/skills/deploy-release/SKILL.md` 補做指令自包含 + SSH 簽章說明；`.claude/now.md` 補 CCR 限制與簽章條目、修正 change 12 記錄。零產品程式碼異動。詳見 `.claude/context/v2.12.2.md`。

v2.12.1：change 24「收尾清理」— change 22 + 23 上線後記錄檔掃尾。`.claude/CHANGELOG.md` v2.8.1 壓縮為索引（近 5 版規則補裁切）；`.claude/now.md` 移除已 DONE 行、更新進行中 change 說明；刪除 `changes/22-規則體系重構`、`changes/23-模型分層工作證`（歷史由 git + context 檔承載）。收尾員首次實地驗證三層流程（`/規劃` → `/實作` → 收尾員）。零產品程式碼異動。

v2.12.0：change 23「模型分層工作證」上線 main。`.claude/commands/` 新增規劃/實作打卡 command，`.claude/agents/` 新增收尾員 Haiku 子代理；role-guard.js / lang-reminder.js hooks 強化角色邊界與語言紀律。詳見 `.claude/context/v2.12.0.md`。

v2.11.0：change 22「規則體系重構」上線 main。`.claude/rules/` 8 個規則檔改造為 4 個 `.claude/skills/`；git-guard.js 三類攔截升級為 deny；新增 `scripts/sync-branches.sh`（衝突預設停下回報）；`openspec/changes/` 改名 `changes/` 並清空已完成資料夾；`docs/` 19 份過時文件歸檔至 `docs/archive/`。常駐 token ~19,000 → ~2,453。詳見 `.claude/context/v2.11.0.md`。

## 已知地雷

- **googleapis / gaxios 在 Zeabur 壞掉**：gaxios@6+ 在 Node.js 18 改用 undici，Zeabur NAT 導致 Premature close。解法：用 raw https.request。詳見 `.claude/context/v2.4.0.md`（學習日誌）
- **CCR 沙箱 git 403**：tag push / 刪分支在 CCR 環境會 403；非 CCR（本機 desktop / VS Code extension）可直接執行。遇到 403 才請使用者補做，不要預先叫使用者手動；**補做指令必須自包含**（tag 需先在使用者端建立並指明 SHA，見 deploy-release skill）
- **CCR 沙箱簽章顯示 N 屬正常**：沙箱有平台自動 SSH 簽章但缺 allowedSignersFile 無法本地驗證，git log 顯示 N ≠ 沒簽；禁止為此重寫歷史，以 GitHub badge 為準
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
