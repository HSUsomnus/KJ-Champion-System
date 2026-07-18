# AGENTS.md — Codex CLI 在 KJ-Champion-System 的工作規則

> 本檔給在 VPS 上透過 Codex CLI 執行的 agent 讀。Claude Code 讀 CLAUDE.md，Codex 讀本檔。
> 分工：Claude 做架構決策 + 寫 spec，Codex 做機械性全端執行；判斷力留在 Claude 與使用者手上。

## 對話啟動

每次開工第一件事：

1. 確認目前 branch（`git branch --show-current`）。
2. 讀 `.claude/now.md`（已知地雷與環境特殊狀態）。
3. 需要比對遠端才 `git fetch`；以 `origin/main` 為準。fetch 失敗要明確回報資料時間點，不假設本機 main 最新。

## 語言

- 一律繁體中文（台灣用語）回報；技術術語可英文。

## 失敗停損（核心 — 防燒 ChatGPT Plus 額度）

- 同一個測試 / 同一個錯誤連續失敗 2 次即停手。
- 停手時列出：試了什麼 / 完整報錯（保留錯誤主體與必要 stack，刪除重複的成功輸出）/ 三個可能假設 → 交使用者決定，不盲目再試第 3 次。

## 動手前紀律

- 先讀報錯、講出 root cause 才准改；禁止亂槍打鳥式修改。
- 不假設 API / 套件用法：先 grep 現有 code 或查官方 doc 確認再寫。

## 測試紀律

- 測試範圍最小化：改哪個模組只跑那個模組的測試。
- 全套測試只在 commit 前跑一次（全套測試化為後續 change 移 GitHub Actions，屆時本地只快驗）。
- context 控制：貼測試輸出只留失敗部分，不整包倒。

## Git／DB 鐵律（與 CLAUDE.md 對齊，違反等同破壞專案）

- 禁止在 main 直接 commit 功能程式碼（server/、frontend/、package.json、部署設定、migrations）。
- 禁止 git add -A / git add .，一律指定具體檔案。
- 功能分支命名 m_b_*，必須推遠端；merge 進 main 一律 --no-ff。
- **push main 前三閘門（缺一不可）**：① 更新 `.claude/now.md` 且與本次推送同一個 commit；② 機密檢查（無金鑰、Token、寫死帳密）；③ 列出推送清單，取得使用者明確確認。
- **prod / backup DB 任何寫入**：只有使用者明確回覆固定語句「確認操作正式 DB」才可執行；「好」「可以」等模糊回覆不算授權。

## 高風險操作：停手交還指揮官

以下操作屬指揮官（Claude）或使用者的決策範圍，**Codex 一律停手交還、不自行執行**（工兵不越權碰上線與正式資料）：

- git push main、merge、tag、功能上線、hotfix、修改部署設定（`_worker.js` / `zbpack.json` / `.env`）
- 任何 DB 寫入 / migration / schema 變動
- `frontend/` UI 元件、樣式、顏色、彈窗、Tab、FAB、SidebarNav 的設計取捨

需要時可**參照**對應的專案 skill（非執行前置強制，但停手前應據此判斷這是不是高風險）：

| 情境 | 參照 skill |
|---|---|
| 新功能／修改計畫／執行計畫／測試功能／修 bug／功能上線 | `.claude/skills/workflow/SKILL.md` |
| 動 `frontend/` UI 元件、樣式、彈窗、Tab、FAB、SidebarNav | `.claude/skills/uidesign/SKILL.md` |
| 編輯 `server/services/`、migration 或任何 DB 操作 | `.claude/skills/database/SKILL.md` |
| git push、merge、tag、上線、hotfix、部署設定 | `.claude/skills/deploy-release/SKILL.md` |

## 分支與流程

- 新功能走 m_b_* 分支（完整流程見 `.claude/skills/workflow`）。
- 改 server/ 後提醒使用者重啟本機伺服器。

## 決策來源與衝突停手

- 實作依據優先序：本次使用者指令 → 該 change 的 `spec.md` / `tasks.md` → `CLAUDE.md`「已定案決策」+ `.claude/now.md`。
- 來源互相衝突時，列出衝突位置並詢問使用者，不自行選邊。
- 不修改 `spec.md`；需要調整規格時交回 Claude 與使用者。

## 環境地雷（VPS / Zeabur）

- 沙箱 npm test / npm run dev 可能不可用時，先確認失敗原因，再依 workflow / deploy 規則改走部署驗證（打 /api/debug/health）；不可一律跳過本機驗證。
- Zeabur googleapis/gaxios 壞掉、prod DB 公網預設關閉等，詳見 `.claude/now.md`「已知地雷」。

## 邊界（Codex 不做的事）

- 不做架構決策、不改 spec.md（那是 Claude + 使用者的職責）。
- 遇到「要不要這樣設計」的判斷題時停下問，不自行拍板。
- 需求或既定方案不可行時，先說明原因與替代選項並詢問使用者，**不得自行改用其他做法**（換 API、換套件、換部署方式都不行）。
