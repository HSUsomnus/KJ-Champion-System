# Change 29：Codex CLI 整合 VPS 多 Agent 工作區 — AGENTS.md 規則檔

- 類型：規則 / 基礎建設（root 規則檔 + `.claude/` 變更，屬「規則類直推 main」）
- 來源：使用者上傳 `CLAUDE3.md`（Codex 整合到 VPS 多 Agent 工作區決策文件）第六節第 1 點：「AGENTS.md 由 CCR 環境的 Opus 撰寫」。
- 規劃 session 分支：`claude/diagnosis-report-review-gqjfkw`
- 範圍拍板（使用者 A/A/A，2026-07-13）：只交付 AGENTS.md／完整版／規則類直推。

---

## 一、背景與問題

使用者要在 VPS（Tencent Tokyo，repo 在 `/home/ubuntu/dev/KJ-Champion-System`）用 tmux 管理多 agent：**Claude Code 做架構決策 + 寫 spec，Codex CLI 做機械性全端執行**。Codex 讀的規則檔慣例是 repo root 的 `AGENTS.md`（不是 `CLAUDE.md`）。

上傳文件把大部分工作（裝 Codex、tmux、ChatGPT Plus 登入、window 切換）定義為**使用者在 VPS 上的手動操作**，唯一落進本 repo 的產物是 `AGENTS.md`——防 Codex 陷入 doom loop（反覆失敗燒 Plus 額度）、且不與專案既有規範打架的規則檔。文件明文將此檔指派給「CCR 環境的 Opus」撰寫，因其能讀取整個專案既有規則檔、依既有 convention 建立限制。

### 核實後的事實（規劃者實測）

1. **root 無 `AGENTS.md`**：`test -f AGENTS.md` → ABSENT。全新建立，零覆蓋風險。
2. **`changes/` 最大編號 = 28**：新 change = 29。
3. **deploy-release 直推允許清單缺 AGENTS.md**：SKILL.md 129–132 行明列 `.claude/`、`.gitignore`、`scripts/`、`CLAUDE.md`、`CHANGELOG.md`，**未含 root 的 `AGENTS.md`**。
4. **git-guard 不擋 AGENTS.md**：`git-guard.js:52` 僅擋 `/^(server|frontend|public)\//` 與 migrations/schema/seeds；root 的 `AGENTS.md` 不在攔截範圍，技術上可直推 main。但「允許清單未明列」是制度缺口，須補（見決策 A）。

---

## 二、目標與非目標

### 目標

1. 於 repo root 建立 `AGENTS.md`——Codex CLI 在本專案的工作規則（完整版：doom-loop 五要點 + 繼承專案既有鐵律）。
2. 補 deploy-release skill 直推允許清單，明列 `AGENTS.md`，讓其「規則類直推」交付名正言順（決策 A）。
3. change 29 以「規則類直推」交付，並更新 now.md（同 commit）。

### 非目標（明確排除，不得擴張）

- **CI/CD 全套測試移 GitHub Actions**（上傳文件第六節第 2 點）：使用者 Q1=A 明確排除，列為後續 change。AGENTS.md 內文可**前向引用**此方向（「全套測試未來移 Actions」），但本 change 不建立任何 `.github/workflows`。
- **VPS 手動操作**（裝 Codex CLI、tmux session/window、ChatGPT Plus 登入、Termius 切換）：屬使用者端 live 操作，由 CCR 非 planner session 或使用者自行執行，**不是本 change 的 repo 產物**。列於「五、相關操作」僅供參照，不進 tasks 勾選項。
- **OpenCode 整合**：上傳文件明示暫緩，不做。
- **sync-branches conflict-stopped 技術債**（上傳文件第七節）：與本任務分開，不在範圍。
- **產品程式碼**（`server/`、`frontend/`）：本 change 零產品程式碼異動。

---

## 三、範圍決策（規劃層定案，已獲使用者確認）

### 決策 A：AGENTS.md 交付方式 = 規則類直推（使用者 Q3=A 拍板）

AGENTS.md 是 repo root 的規則/文件檔，性質等同 `CLAUDE.md`（agent 規則檔），非 git-guard 定義的功能程式碼。故比照 `.claude/` 慣例：任何分支 commit 後 `cherry-pick` 直推 main，不走功能分支 merge。

**但**：deploy-release 直推允許清單（SKILL.md 129–132）目前未明列 `AGENTS.md`。為避免「規則類直推」淪為臨時例外，本 change 順手把 `AGENTS.md` 加進該清單（與 `CLAUDE.md` 並列）。此為 AGENTS.md 自身交付分類所必需，屬本 change 範圍內（非 CI/CD、非被排除項）。

→ 本 change 因此有 3 個檔案觸點：Phase 1（建 AGENTS.md）、Phase 2（deploy-release 允許清單補一行）、Phase 3（now.md）。

### 決策 B：AGENTS.md 內容深度 = 完整版（使用者 Q2=A 拍板）

doom-loop 五要點 + 繼承專案既有鐵律，讓 Codex 不與專案規範打架。內容大綱見 Phase 1。原因：Codex 是機械執行者，若只給 doom-loop 五點、其餘要它自行跳讀 CLAUDE.md/skills，反而增加它「假設 / 亂翻」的機會；把關鍵鐵律直接內嵌最省 Plus 額度且最不易出錯。

---

## 四、Phase 拆解

> 三 Phase 檔案零重疊。Phase 1（`AGENTS.md`）、Phase 2（`deploy-release/SKILL.md`）、Phase 3（`now.md`）皆為檔案編輯（實作 session 執行）；上線為操作步驟（主 session + 使用者端）。

### Phase 1 — 建立 `AGENTS.md`（root，完整版）

- **檔案**：`AGENTS.md`（repo root，新建，僅此檔）
- **內容大綱**（實作 session 據此撰寫，繁體中文；標題與順序可微調，要點不可缺）：

  ```
  # AGENTS.md — Codex CLI 在 KJ-Champion-System 的工作規則

  > 本檔給在 VPS 上透過 Codex CLI 執行的 agent 讀。Claude Code 讀 CLAUDE.md，Codex 讀本檔。
  > 分工：Claude 做架構決策 + 寫 spec，Codex 做機械性全端執行；判斷力留在 Claude 與使用者手上。

  ## 語言
  - 一律繁體中文（台灣用語）回報；技術術語可英文。

  ## 失敗停損（核心 — 防燒 ChatGPT Plus 額度）
  - 同一個測試 / 同一個錯誤連續失敗 2 次即停手。
  - 停手時列出：試了什麼 / 完整報錯 / 三個可能假設 → 交使用者決定，不盲目再試第 3 次。

  ## 動手前紀律
  - 先讀報錯、講出 root cause 才准改；禁止亂槍打鳥式修改。
  - 不假設 API / 套件用法：先 grep 現有 code 或查官方 doc 確認再寫。

  ## 測試紀律
  - 測試範圍最小化：改哪個模組只跑那個模組的測試。
  - 全套測試只在 commit 前跑一次（全套測試化為後續 change 移 GitHub Actions，屆時本地只快驗）。
  - context 控制：貼測試輸出只留失敗部分，不整包倒。

  ## Git 鐵律（與 CLAUDE.md 對齊，違反等同破壞專案）
  - 禁止在 main 直接 commit 功能程式碼（server/、frontend/、package.json、部署設定、migrations）。
  - 禁止 git add -A / git add .，一律指定具體檔案。
  - 功能分支命名 m_b_*，必須推遠端；merge 進 main 一律 --no-ff。
  - prod / backup DB 任何寫入，需使用者明確確認。

  ## 分支與流程
  - 新功能走 m_b_* 分支（完整流程見 .claude/skills/workflow）。
  - 改 server/ 後提醒使用者重啟本機伺服器。

  ## 環境地雷（VPS / Zeabur）
  - 沙箱 npm test / npm run dev 可能不可用時，改走部署驗證（打 /api/debug/health）。
  - Zeabur googleapis/gaxios 壞掉、prod DB 公網預設關閉等，詳見 .claude/now.md「已知地雷」。

  ## 邊界（Codex 不做的事）
  - 不做架構決策、不改 spec.md（那是 Claude + 使用者的職責）。
  - 遇到「要不要這樣設計」的判斷題時停下問，不自行拍板。
  ```

- **Gate（規劃者已實測語法）**：
  ```bash
  test -f AGENTS.md && echo EXISTS                                    # 期望 EXISTS
  grep -cE "失敗停損|連續失敗|停手" AGENTS.md                          # 期望 ≥1
  grep -cE "git add -A|main 直接 commit|繁體中文" AGENTS.md            # 期望 ≥1（鐵律有內嵌）
  ```
  **實測結果（現狀）**：`test -f` → ABSENT（建立前預期）；grep 語法有效，file absent 時回 exit 2 屬正常。實作後三條期望值可達成。
- **驗收**：AGENTS.md 非 server/，重啟提醒不適用。

### Phase 2 — deploy-release skill 直推允許清單補 `AGENTS.md`

- **檔案**：`.claude/skills/deploy-release/SKILL.md`（僅此檔）
- **改動**：在「規則類更新 — 直推 main」允許清單（約 129–132 行）中，`CLAUDE.md`、`CHANGELOG.md` 那條旁補上 `AGENTS.md`（root 的 Codex 規則檔）。一行改動。
- **Gate（規劃者已實測）**：
  ```bash
  grep -n "AGENTS.md" .claude/skills/deploy-release/SKILL.md         # 期望命中允許清單段
  ```
  **實測結果（現狀）**：目前 grep 命中 0（清單未含），實作後應 ≥1。語法有效。
- **邊界**：只補允許清單一行，不動「不得直推」清單、不動直推流程步驟。

### Phase 3 — now.md 更新（推 main 前強制，與上線同 commit）

- **檔案**：`.claude/now.md`（僅此檔）
- **改動**：「最近推送」新增 change 29 紀錄（AGENTS.md 建立 + deploy-release 允許清單補 AGENTS.md）。「已知地雷」可視需要新增一條「Codex/AGENTS.md：Codex 讀 AGENTS.md 不讀 CLAUDE.md」提示（實作 session 斟酌，非強制）。「當前 Change」無需新增（change 29 即時直推）。
- **Gate（規劃者已實測）**：`grep -c "change 29" .claude/now.md` ≥ 1。**實測現狀 = 0**（建立前預期）。
- **注意**：依鐵律，now.md 更新必須與 push main 同一個 commit。

---

## 五、操作類步驟（非 Phase，主 session 執行 / 交使用者端）＋相關操作

### 步驟 X1：change 29 上線（規則類直推，主 session + 使用者確認）

依 deploy-release skill「規則類直推」流程：更新 now.md（同 commit）→ 機密檢查 → 使用者確認 → cherry-pick `AGENTS.md` + `deploy-release/SKILL.md` + `now.md` 到 main → `git push origin main` → `bash scripts/sync-branches.sh`。
> README 重寫、CHANGELOG：規則類直推不需要。機密檢查：仍必做。

### 步驟 X2：dogfood——刪本 change 實作分支

change 29 內容進 main 後，刪除實作 session 用的 `m_b_*` 分支。CCR 沙箱刪遠端分支 403，交使用者端執行自包含指令：
```
cd /home/ubuntu/dev/KJ-Champion-System && git push origin --delete <本change實作分支> && git fetch origin --prune
```

### 相關操作（**非本 change 範圍**，僅記錄，不進 tasks 勾選）

上傳文件第四節的 VPS 手動操作——`npm install -g @openai/codex`、`codex` 首次登入選「Sign in with ChatGPT」（非 API key）、tmux `Ctrl+b c` 開 window 跑 codex、`Ctrl+b w` 列 window——由使用者在 VPS/Termius 端執行，或由 CCR 非 planner session 帶做。AGENTS.md 上線後，Codex 一啟動即讀取本規則。

---

## 六、Sub-agent 平行執行配置

依 workflow skill 四條判準定案：

| 判準 | 本 change 情形 |
|---|---|
| ① 檔案接觸面 | Phase 1（`AGENTS.md`）、Phase 2（`deploy-release/SKILL.md`）、Phase 3（`now.md`）三者**零檔案重疊**，理論上可平行。 |
| ② sub-agent 不 commit/push | 若平行，sub-agent 只寫檔＋跑該 Phase gate，commit/push 一律主 session 依序執行。 |
| ③ 使用者互動步驟歸主 session | 步驟 X1/X2（上線確認、403 fallback、刪分支）全為使用者互動，一律主 session，不下放 sub-agent。 |
| ④ 邊界由規劃層定案 | **定案：不開 sub-agent，主 session 序列做完 Phase 1→2→3。** Phase 1 為單一新檔（約 40 行內容撰寫），Phase 2/3 各約 1 行，總工作量小，開 sub-agent 協調成本大於效益（判準①雖允許平行，屬可選而不選）。 |

**實作 session 照本表執行：序列，單 session，不自行改為平行。**

---

## 七、commit 數驗收條款

- **原則**：屬規則類直推，實務上可將三檔改動（AGENTS.md + deploy-release + now.md）合併為單一 commit 後 cherry-pick 直推 main（規則類直推本就是單 commit 上線）。若實作 session 選擇每 Phase 一 commit 亦可。
- **允許的例外**：使用者中途手動 commit 允許，但**必須在驗收報告揭露**。
- **禁止**：為湊 commit 數而 squash 已推遠端的歷史。

---

## 八、驗收清單（全 ✅ 才算完成）

- [ ] Phase 1 gate：`AGENTS.md` 存在，含「失敗停損」核心段與內嵌 Git 鐵律（grep 命中）。
- [ ] Phase 1 內容：doom-loop 五要點齊全（失敗停損 / 動手前讀 root cause / 不假設 API / 測試最小化 / context 控制）+ 繼承鐵律（禁 main 直推功能碼、禁 git add -A、m_b_* 分支、DB 寫入確認、繁中）。
- [ ] Phase 2 gate：deploy-release 直推允許清單 grep 命中 `AGENTS.md`。
- [ ] Phase 3 gate：now.md 含 change 29 紀錄。
- [ ] 交付方式 = 規則類直推（決策 A），AGENTS.md 已加入 deploy-release 允許清單。
- [ ] change 29 內容已進 main，本 change 實作分支已刪（步驟 X2）。
- [ ] 全程零產品程式碼（`server/`、`frontend/`）異動；未建立任何 `.github/workflows`（CI/CD 為非目標）。
