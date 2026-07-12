---
description: 管理 DevVps 上的 claude remote-control session — 開新 session 或關閉既有 session
---

# vps新對話

定位：管理 DevVps 上的 claude remote-control session——產生「開新 session」的可貼上指令，
或列出既有 session 問使用者要關哪個。使用情境：session context 快滿要換新、或 VPS 上掛著
太多舊 session 要清。

平實語言撰寫，不嵌比喻。

## 步驟 1：模式判斷

使用者輸入含「關」（要關／關閉）→ 關閉模式；否則 → 開新模式（預設）。

## 步驟 2：環境判斷

```bash
pgrep -f "claude remote-control"
```

有結果 → 本機就是 VPS，可直接 Bash 代執行。無結果（CCR / 其他環境）→ 一律只輸出
自包含指令給使用者貼 Termius（遵守 `/實作` 使用者終端機指令紀律：cd 絕對路徑寫死、
&& 串接單行、無佔位符、假設乾淨 shell）。

## 開新模式

1. session 名稱：使用者有給就用，沒給預設 `KJ-<當前 change 編號或主題>`；
   tmux session 名稱取唯一值（如 `kj-<HHMM>`），避免與既有 tmux session 撞名
2. 產出單一 code block（貼 Termius 一次通），名稱由 Claude 代入實值後輸出，
   code block 內不得殘留 `<>` 佔位符：

   ```bash
   tmux new -d -s <實際 tmux 名> 'cd /home/ubuntu/dev/KJ-Champion-System && claude remote-control --name "<實際 session 名>"'
   ```

3. 固定附一句：「貼上執行後，開 Claude app → Code 列表點『<session 名>』即可（不需掃 QR）。」
4. 本機即 VPS 時：直接 Bash 代執行上述指令並回報「已建立，去 app 列表找 <session 名>」

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
