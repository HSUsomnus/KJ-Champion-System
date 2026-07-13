# Change 29 — tasks（多 CLI 手機監看層 amux）

> 進度唯一來源。`[ ]` 未完成 / `[x]` 完成。實作 session 照序執行，不跳躍。
> 本 change 無產品程式碼，屬 `.claude/` 指令 + 文件；驗證分「在庫（CCR 可跑）」與「VPS 端（使用者實測）」兩類（見 spec.md 第五節）。

## Phase 1：amux + Tailscale setup runbook（在庫）

- [x] 1.1 撰寫 `changes/29-多CLI手機監看層/runbook.md`，含以下段落，指令自包含（cd 絕對路徑寫死 `/home/ubuntu`、`&&` 串接、無 `<>` 佔位符、假設乾淨 shell，遵守 `/實作` 使用者終端機指令紀律）：
  - 前置：確認 Python 3.10+、tmux 3.2+、目標 CLI（Codex）已裝
  - 安裝 amux：`git clone` → `./install.sh`
  - 安裝／登入 Tailscale（VPS 端 + 手機端同一 tailnet）
  - 啟動 amux：`amux serve --bind 127.0.0.1,$(tailscale ip -4)`（避開公網 tunnel 輪詢雷）
  - 手機端：經 Tailscale IP 開 `:8822`、信任憑證、加到主畫面當 PWA
  - 起 Codex tmux session 的範例指令（amux 自動探測）
  - 收尾備註：amux 無 auth、8822 嚴禁對公網開；MIT + Commons Clause 僅自用
- [x] 1.2 跑 gate G1（在庫）：runbook 存在且含 install.sh / tailscale / amux serve 關鍵字 → `GATE_G1_PASS`
- [x] 1.3 commit（Phase 1）

## Phase 2：更新 /vps新對話 指令（.claude/）

- [x] 2.1 修改 `.claude/commands/vps新對話.md`：
  - 開新模式擴充：區分「Claude session（維持 `claude remote-control` → Claude App）」與「非 Claude CLI（Codex 等，起 tmux session → amux 監看）」兩條路徑
  - 開 Codex/非 Claude session 時，附一句指引：「開 amux 儀表板（Tailscale IP:8822）即可看卡片，不需 Termius」
  - 指向 runbook（首次安裝 amux/Tailscale 的步驟）
  - 維持既有 Termius 自包含指令紀律
- [x] 2.2 跑 gate G2（在庫）：`grep -q "amux" .claude/commands/vps新對話.md` → `GATE_G2_PASS`
- [x] 2.3 commit（Phase 2）；`.claude/` 修改依特殊規則 cherry-pick 到 main + `bash scripts/sync-branches.sh`（上線時，見 deploy-release）

## Phase 3：VPS 端實測（使用者，非 CCR）

> 此 Phase 由使用者在 DevVps 依 runbook 實作並回報；實作 session 不代跑（CCR 不可達 VPS）。

- [ ] 3.1 使用者依 runbook 完成 amux + Tailscale 安裝與啟動 → gate G3（amux 起得來、手機看得到儀表板）
- [ ] 3.2 使用者起 Codex tmux session → gate G4（amux 現卡片、狀態即時更新、peek 看得到輸出）
- [ ] 3.3 使用者回報 G3/G4 結果；若 amux flag/行為與 runbook 有出入，回頭修正 runbook（改 HOW，不擴大 change）

## Phase 4：記錄與上線（收尾）

- [ ] 4.1 更新 `.claude/CHANGELOG.md`、新增 `.claude/context/vX.Y.Z.md`（或比照規則類直推記錄）
- [ ] 4.2 更新 `.claude/now.md`（當前 change、最近推送、如有新地雷補「已知地雷」）
- [ ] 4.3 機密檢查 + 使用者明確確認 → 依 deploy-release「規則類直推」上 main
- [ ] 4.4 收尾：刪功能分支（本機 + 遠端），避免殭屍分支（change 28 教訓）
