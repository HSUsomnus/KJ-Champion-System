# Change 29 — 多 CLI 手機監看層（amux）

## 一、需求（使用者原話收斂）

- 一台 VPS（DevVps），不想再花錢買第二台。
- 這台 VPS 上用 tmux 多 window，**不同 window 跑不同 CLI agent**（Claude Code、Codex、可能還有 Gemini…）。
- Claude 側**已解決**：`claude remote-control` → Claude App「Code 列表」卡片，手機直接看 session。
- **痛點在 Codex 側**：Codex CLI 沒有等價的 app／環境，手機上要看「它現在做到哪一步」只能盯 Termius 原始終端，不方便。
- 想要的是：Codex（及其他非 Claude CLI）也有個**方便在手機上看 session 進度**的介面，效果比照 Claude App 那種「一頁看到每個 session 現在的狀態」。

## 二、方向導正紀錄（規劃過程結論，避免日後重踩）

1. **卡片式介面不是 tmux 檢視器**。Claude App 的卡片是 `claude remote-control` 的專屬產物（Anthropic 綁定協定），tmux 只是「保活外殼」。Codex 不會註冊進 Claude App，沒有 `codex remote-control`。
2. **不需要第二台 VPS、不需要雲端 offload**。社群已有自架、開源、tmux-native 的「AI agent 監看控制台」，跑在同一台 VPS 即可。
3. **不強迫 Claude 與 Codex 擠在同一 runtime**，但本 change 的解法也不需要它們解耦到不同機器——監看層直接讀同一台 VPS 的 tmux。

## 三、技術方案

### 選定工具：amux（https://github.com/mixpeek/amux）

| 面向 | 事實（取自 README，2026-07 查證） |
|---|---|
| 部署 | 單一 Linux VPS；single-file Python；`./install.sh` → `/usr/local/bin`；`amux serve` 起在 `:8822` |
| 需求 | Python 3.10+、tmux 3.2+、至少一個 agent CLI（Claude Code／Codex／Gemini） |
| tmux 整合 | ANSI-stripped 解析、**無 hook 無改寫**，直接吃既有 tmux session 跑的任意 CLI；session 以 UUID 識別、跨 stop/start 存活 |
| 儀表板 | session **卡片**顯示 live 狀態（working／idle／needs input）、token 花費、快捷操作；peek 全捲動搜尋＋檔案預覽；tiled 多 session workspace；kanban |
| 安全 | **無內建 auth**；官方明示「**絕不要把 8822 對公網開**」；`--bind` 限制監聽介面；HTTPS 自動發憑證（Tailscale → mkcert → self-signed） |
| 授權 | MIT + Commons Clause（自架／改用免費；商業轉售需另授權——本專案僅自用，符合） |

### 傳輸層：Tailscale（規劃層已定案，不再詢問）

- 理由：與 CLAUDE.md「prod DB 預設不開公網」的安全習慣一致；amux 官方亦推薦。
- 做法：VPS 與手機加入同一 tailnet；`amux serve --bind 127.0.0.1,$(tailscale ip -4)`；手機走 Tailscale IP 開 PWA。
- **避開已知雷**：amux「streaming 過公網 tunnel 會退化成 ~2 分鐘輪詢」——Tailscale 是直連私網、非公網 tunnel，可維持即時。

### 架構定位（本 change 採「混合模式」，尊重使用者現狀）

- **Claude 側維持現狀**：`claude remote-control` + Claude App，**不動**。使用者明確表示 Claude 那邊已滿意。
- **Codex 及其他非 Claude CLI**：在 VPS tmux 起 session → amux 自動探測 → 手機開 amux 儀表板監看。
- （選配、非本 change 範圍）若日後想要「一個面板看全部」，可把 Claude 也改成 tmux 內跑純 `claude` 交給 amux；本 change 不做，避免破壞現有 Claude App 體驗。

## 四、邊界

**做**：
- amux + Tailscale 在 DevVps 的安裝／設定 runbook（自包含、可貼 Termius 的指令）。
- `.claude/commands/vps新對話.md` 更新：納入「非 Claude CLI 用 tmux + amux 監看」的開 session 與監看指引。
- 記錄檔（CHANGELOG / context / now.md）。

**不做**：
- 不寫任何產品程式碼（`server/`、`frontend/` 零異動）。
- 不設計多 agent 的「工作分工／GitHub 協調流程」（Claude 做什麼、Codex 做什麼、如何用 PR 交棒）——那是獨立主題，若要另開 change。
- 不把 Claude 從 Claude App 遷進 amux（見上，選配、非本 change）。
- 不自建儀表板（amux 現成，不重造輪子）。

## 五、驗證 gate

> **環境限制**：CCR 沙箱不可達 DevVps、無法連 Tailscale/VPS（比照 now.md「CCR 沙箱 npm/node 不可用」「outbound 白名單」慣例）。因此 gate 分兩類：**在庫可驗**由實作 session 於 CCR 執行；**VPS 端**由使用者在 DevVps 實測回報，指令以 amux 官方 README 為準，設定過程即驗證。

### G1（在庫可驗）runbook 檔存在且含關鍵段落
```bash
test -f "changes/29-多CLI手機監看層/runbook.md" && \
grep -q "install.sh" "changes/29-多CLI手機監看層/runbook.md" && \
grep -q "tailscale" "changes/29-多CLI手機監看層/runbook.md" && \
grep -q "amux serve" "changes/29-多CLI手機監看層/runbook.md" && echo GATE_G1_PASS
```
預期輸出：`GATE_G1_PASS`

### G2（在庫可驗）vps新對話 指令已納入 amux 監看
```bash
grep -q "amux" .claude/commands/vps新對話.md && echo GATE_G2_PASS
```
預期輸出：`GATE_G2_PASS`

### G3（VPS 端，使用者實測回報）amux 起得來
- 使用者在 DevVps 跑完 runbook 安裝段後：`amux serve --bind 127.0.0.1,$(tailscale ip -4)` 能啟動、`:8822` 有回應。
- 通過標準：手機經 Tailscale 開 `https://<tailscale-ip>:8822`（信任憑證後）看得到儀表板。

### G4（VPS 端，使用者實測回報）Codex session 現卡片
- 在 VPS tmux 起一個跑 Codex CLI 的 session。
- 通過標準：amux 儀表板出現該 session 卡片，狀態隨 Codex 執行更新（working／idle／needs input），peek 看得到即時輸出。

## 六、commit 數驗收

- 每 Phase 一個 commit（見 tasks.md 的 Phase 切分）。
- 使用者中途手動 commit 允許，但須在驗收報告揭露。
- 記錄檔（CHANGELOG / context / now.md）依 `.claude/` 特殊規則單獨 commit，不與其他內容混。
- **本 change 為 `.claude/` 指令 + 文件性質，無 `server/`/`frontend/` 產品程式碼**，可比照 change 26/27/28「規則類直推」路徑上 main（deploy-release skill），不需 vitest/playwright、不需 Cloudflare/Zeabur 追蹤分支。

## 七、Sub-agent 平行執行配置

- **判定：不平行，主 session 單線執行**。
- 依四判準：
  1. **檔案接觸面**：本 change 在庫改動僅 `changes/29-.../runbook.md`（新增）與 `.claude/commands/vps新對話.md`（修改），量小；記錄檔需在最後依序落盤，Phase 間有順序相依。
  2. sub-agent 只寫檔＋跑 Phase gate、不 commit/push——本 change 無切分平行的收益。
  3. 需與使用者互動的步驟（VPS 端 G3/G4 實測回報、上線確認）一律主 session。
  4. 平行邊界由本 spec 定案：**不拆平行**，實作 session 照表單線執行。
