# Change 29 — amux + Tailscale 安裝 Runbook（DevVps）

> 給 Codex（及其他非 Claude CLI）用的手機監看層。Claude 側維持 `claude remote-control` +
> Claude App，不受本 runbook 影響。以下指令請貼到 **Termius（DevVps 的終端機）** 執行，
> 依序做完即完成安裝與啟動。每個 code block 已用 `&&` 串接為單行、`cd` 絕對路徑寫死，
> 可直接貼上執行。

## 前置：確認環境

請貼到 Termius 執行，確認 Python 3.10+、tmux 3.2+、Codex CLI 已裝：

```bash
python3 --version && tmux -V && codex --version
```

三個版本都印得出來（Python ≥ 3.10、tmux ≥ 3.2）才繼續下一步；缺哪個先裝哪個（`apt install python3 tmux`、Codex CLI 依官方文件安裝並登入）。

## 步驟 1：安裝 amux

```bash
cd /home/ubuntu && git clone https://github.com/mixpeek/amux && cd /home/ubuntu/amux && ./install.sh
```

安裝完成後 `amux` 指令會進 `/usr/local/bin`，任意路徑可執行。

## 步驟 2：安裝並登入 Tailscale

```bash
curl -fsSL https://tailscale.com/install.sh | sh && sudo tailscale up
```

`tailscale up` 會印出一個登入網址，用瀏覽器打開、用你的 Tailscale 帳號登入授權這台 DevVps 加入 tailnet。

手機端：到 App Store / Play 商店裝 **Tailscale** app，用同一個帳號登入，加入同一個 tailnet。

## 步驟 3：確認 Tailscale IP

```bash
tailscale ip -4
```

記下這個 IP（例：`100.x.x.x`），下一步會用到。

## 步驟 4：啟動 amux

```bash
cd /home/ubuntu && amux serve --bind 127.0.0.1,$(tailscale ip -4)
```

- `--bind` 限制 amux 只監聽本機 loopback 與 Tailscale 私網介面——**絕不對公網開放** 8822。
- 首次啟動會自動嘗試發 HTTPS 憑證（Tailscale → mkcert → self-signed 依序 fallback）。
- 想長駐執行，可用 `tmux new -d -s amux 'cd /home/ubuntu && amux serve --bind 127.0.0.1,$(tailscale ip -4)'` 起一個獨立 tmux session 跑 amux 本身，避免關掉 Termius 就斷線。

## 步驟 5：手機端開儀表板

1. 手機開 Tailscale app，確認已連上同一個 tailnet。
2. 手機瀏覽器開 `https://<步驟 3 記下的 Tailscale IP>:8822`。
3. 第一次連線瀏覽器會警告憑證不受信任（因為是 Tailscale/mkcert/self-signed 憑證），選擇「繼續前往」或依提示信任憑證。
4. 看到 amux 儀表板後，用瀏覽器「加到主畫面」把它變成 PWA，之後像 app 一樣點開即可。

## 步驟 6：用 amux 註冊並啟動 Codex session

> ⚠️ **實測修正**：amux 的 dashboard **只認用 `amux register` 註冊過的 session**（記錄在
> `~/.amux/sessions/*.env`），不會被動掃描任意 tmux session；手動 `tmux new` 開的 session
> 不會出現在卡片列表。另外 `amux register` 目前沒有官方參數指定 provider 為 Codex，
> 需手動補寫 `CC_PROVIDER` 這行到 session 設定檔。以下指令已修正為正確流程：

```bash
amux register codex-work --dir /home/ubuntu/dev/KJ-Champion-System && echo 'CC_PROVIDER="codex"' >> ~/.amux/sessions/codex-work.env && amux start codex-work --detach
```

- `amux register` 建立 session 設定檔（`~/.amux/sessions/codex-work.env`），`--dir` 指定工作目錄（必須絕對路徑）。
- 手動補一行 `CC_PROVIDER="codex"`，`amux start` 才會執行 `codex` 而非預設的 `claude`。
- `amux start --detach` 會用 amux 自己的 tmux 命名規則（實際 tmux session 名為 `amux-codex-work`，非 `codex-work`）建立 session 並啟動 Codex，**這樣 dashboard 才抓得到卡片**。
- session 名稱（此例 `codex-work`）可自訂，多個 CLI／多個專案就重複這個流程、換不同名稱。
- 確認 session 已啟動：`tmux ls` 應看到 `amux-codex-work`；回手機儀表板刷新即可看到卡片。
- Codex 預設會補上 `--model gpt-5.5 -a never`（`-a never` = 每個工具呼叫都要手動核准，安全預設）；若要換模型，進 Codex 內用 `/model` 指令切換即可，不影響 amux 監看。

## 收尾備註

- **amux 無內建 auth**，官方明講絕不要把 `:8822` 對公網開放——本 runbook 全程走 Tailscale 私網，符合此要求，不需額外設定密碼。
- amux 是 MIT + Commons Clause 授權：自架、自用完全免費；若要拿去商業轉售則需另外取得授權（本專案僅自用，不受影響）。
- **streaming 已知限制**：若未來改走公網 tunnel（不建議），amux 的即時 streaming 會退化成約 2 分鐘輪詢；本 runbook 用 Tailscale 直連私網，不受此限制影響，狀態更新為即時。
- 關閉 amux：`tmux kill-session -t amux`（若照步驟 4 用 tmux 長駐執行）。
