---
description: 管理 DevVps 上的 CLI session（Claude remote-control 或 Codex 等非 Claude CLI）— 開新 session 或關閉既有 session
---

# vps新對話

定位：管理 DevVps 上的 CLI session——產生「開新 session」的可貼上指令，或列出既有 session
問使用者要關哪個。涵蓋兩種 session 類型：**Claude**（`claude remote-control`，手機用 Claude
App 看）與 **非 Claude CLI**（Codex 等，tmux + amux 監看，手機用 amux 儀表板看，見 change 29）。
使用情境：session context 快滿要換新、或 VPS 上掛著太多舊 session 要清。

平實語言撰寫，不嵌比喻。

## 步驟 1：模式判斷

使用者輸入含「關」（要關／關閉）→ 關閉模式；否則 → 開新模式（預設）。

## 步驟 2：CLI 類型判斷（僅開新模式）

使用者輸入含「codex」或明確點名非 Claude 的 CLI → **非 Claude CLI 路徑**；
否則（未指名、或明講「claude」）→ **Claude 路徑**（預設，維持既有行為）。

## 步驟 3：環境判斷

```bash
pgrep -f "claude remote-control"
```

有結果 → 本機就是 VPS，可直接 Bash 代執行。無結果（CCR / 其他環境）→ 一律只輸出
自包含指令給使用者貼 Termius（遵守 `/實作` 使用者終端機指令紀律：cd 絕對路徑寫死、
&& 串接單行、無佔位符、假設乾淨 shell）。

## 開新模式 — Claude 路徑

1. session 名稱：使用者有給就用，沒給預設 `KJ-<當前 change 編號或主題>`；
   tmux session 名稱取唯一值（如 `kj-<HHMM>`），避免與既有 tmux session 撞名
2. 產出單一 code block（貼 Termius 一次通），名稱由 Claude 代入實值後輸出，
   code block 內不得殘留 `<>` 佔位符：

   ```bash
   tmux new -d -s <實際 tmux 名> 'cd /home/ubuntu/dev/KJ-Champion-System && claude remote-control --name "<實際 session 名>"'
   ```

3. 固定附一句：「貼上執行後，開 Claude app → Code 列表點『<session 名>』即可（不需掃 QR）。」
4. 本機即 VPS 時：直接 Bash 代執行上述指令並回報「已建立，去 app 列表找 <session 名>」

## 開新模式 — 非 Claude CLI 路徑（Codex 等）

1. **首次使用先確認 amux 是否已裝**：

   ```bash
   command -v amux
   ```

   無結果（尚未安裝）→ 告知使用者：「amux 尚未安裝，請先依
   `changes/29-多CLI手機監看層/runbook.md` 完成安裝與 Tailscale 設定（一次性），
   完成後即可重複用本指令開新 session。」並停在此步，不產出下一步指令。

2. 已安裝 → tmux session 名稱：使用者有給就用，沒給預設 `<CLI名>-<HHMM>`（如 `codex-1430`），
   避免撞名。產出單一 code block（貼 Termius 一次通），不留 `<>` 佔位符：

   ```bash
   tmux new -d -s <實際 tmux 名> 'cd /home/ubuntu/dev/KJ-Champion-System && codex'
   ```

3. 固定附一句：「貼上執行後，手機開 amux 儀表板（Tailscale IP:8822）即可看到卡片、跟著即時狀態，
   不需要開 Termius 盯著。」
4. 本機即 VPS 時：直接 Bash 代執行上述指令並回報「已建立，去 amux 儀表板找 <tmux 名>」

## 關閉模式

1. 列出對照表：

   ```bash
   tmux ls
   ps -eo pid,etime,args | grep "[r]emote-control"
   ```

   （`ps` 可看到 `--name` 參數，把 tmux session ↔ claude session 名稱對起來）

2. 問使用者要關哪個（列選項，含各 session 名稱與存活時間），不自行判斷
3. **目標是自己所在的 process 時必須警告**：「關閉後本對話立即結束」，要求再次明確確認
4. 本機即 VPS：確認後 `tmux kill-session -t <名>`（非 tmux 管理的 process 用 kill PID）並回報；
   CCR / 其他環境：輸出自包含 kill 指令給使用者貼 Termius
