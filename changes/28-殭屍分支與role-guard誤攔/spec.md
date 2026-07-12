# Change 28：殭屍分支清理 + role-guard doctor 段誤攔修復 + 規則類直推收尾補強

- 類型：規則 / 基礎建設（純 `.claude/` 變更，屬「規則類直推 main」候選）
- 來源：`診斷報告.md`（原始 commit `0c91916` on `claude/diagnosis-rct3p4`，change 28 診斷 session）
- 規劃 session 分支：`claude/diagnosis-report-review-gqjfkw`

---

## 一、背景與問題

診斷 session 追查使用者截圖（DevVps 跑 `sync-branches.sh`，`m_b_role-guard補強` 回報 `conflict-stopped`、behind main）後確認：**script 沒壞、內容沒遺失**，真正的問題是三類殘留 + 一個規則層 bug + 一個制度缺口。本 change 一次清乾淨。

診斷報告已逐項核實，本 spec 撰寫時規劃者再次實測驗證（見各 Phase gate 的「實測結果」）。

### 核實後的四個事實（規劃者實測）

1. **`m_b_role-guard補強`**：`git diff origin/main origin/m_b_role-guard補強` = 僅 `changes/27-role-guard補強/tasks.md` 差 2 行（勾選狀態，main 為事實）。純殭屍分支，刪除零內容損失。
2. **`m_b_打包繼續指令`**：同上，直接樹比對僅 tasks.md 差 1 行。純殭屍分支。
3. **`claude/packing-continue-skills-audit-qr0c9z`**：change 26 規劃期 CCR session 分支，change 26 已上線 main（最終 spec 在 `changes/26-打包繼續指令/spec.md`）。直接樹比對顯示分支只是較舊快照 + 一份已被 main 取代的規劃草稿。可刪。
4. **`role-guard.js:87` `/^git merge\b/`**：實測 `/^git merge\b/.test("git merge-base origin/main HEAD")` → **true**（誤攔唯讀指令）。與 change 27 剛修的 `\bmain\b` 誤攔同型。

---

## 二、目標與非目標

### 目標

1. 修復 `role-guard.js` doctor 段對唯讀 `git merge-base` / `git merge-tree` 的誤攔。
2. 在 `deploy-release` skill「規則類直推」段補上「上線後刪功能分支」收尾步驟，堵住殭屍分支的產生源頭（根因）。
3. 清除三條殘留分支（殭屍 2 條 + 過時 CCR 1 條）。
4. change 28 本身以「規則類直推」交付，並 dogfood 新增的 #2 收尾規則（直推後刪自己的功能分支）。

### 非目標（明確排除，不得擴張）

- **`sync-branches.sh` 退役清單**（診斷報告 ⚪5-B）：#2 上線後殭屍分支不再產生，此項屬過度設計，本 change 不做。
- **`claude/change-20-strategy-hf8eds`**（診斷報告 🟡3 後半）：change 20 尚未復工，此分支需由接手 change 20 的 session 比對後才可刪，不在本 change 範圍。
- **產品程式碼**（`server/`、`frontend/`）：本 change 零產品程式碼異動。

---

## 三、範圍決策（規劃層定案，交使用者確認）

### 決策 A：`git tag` 唯讀列出誤攔——本 change 是否一併修？

規劃者依診斷報告「順手檢查同段其餘 regex」逐條檢查 doctor 段九條 regex，結論：

| regex | 是否同型 bug |
|---|---|
| `/^git tag\b/` | ⚠️ **是** — 誤攔唯讀 `git tag` / `git tag -l`（列出 tag） |
| `/^git branch\b.*\s-[dD]\b/` | 否，只攔 `-d/-D` 刪除形式 |
| `/^git push\b.*--delete\b/` | 否，只攔 `--delete` |
| `/^git checkout\b.*\s-b\b/` | 否，只攔 `-b` 建分支 |
| `/^git switch\b.*\s-c\b/` | 否，只攔 `-c` 建分支 |
| `/^git merge(\s|$)/`（本 change 修後） | 否 |
| `cherry-pick` / `rebase` / `reset` | 否，皆無唯讀變體 |

**定案（使用者拍板 2026-07-12）：一併修 `git tag`——與 change 27「把同型 bug 一次修乾淨」取向一致。**

`git tag` 改 token 比對（比照現有 `git push` 段 line 57–64 風格）：只攔含寫入 flag 或「建立用位置參數」的形式，放行純列出。Phase 1 因此從單行改動擴為約 8 行。

**實作參考（規劃者已 `node -e` 實測，10/10 案例全過）**：
```js
if (/^git tag\b/.test(t)) {
  const args = t.split(/\s+/).slice(2); // 'git tag' 之後的 tokens
  const writeFlag = /^(-a|--annotate|-s|--sign|-u|--local-user|-m|--message|-F|--file|-e|--edit|-d|--delete|-f|--force)$/;
  const readFlag  = /^(-l|--list|-n\d*|--contains|--no-contains|--points-at|--merged|--no-merged|--sort.*|--format.*|--color|--no-color|-i|--ignore-case|-v|--verify)$/;
  const hasWrite = args.some(a => writeFlag.test(a));
  const hasRead  = args.some(a => readFlag.test(a));
  const bareCreate = !hasRead && args.some(a => !a.startsWith('-')); // 無 read flag 時的位置參數＝要建立的 tag 名
  return hasWrite || bareCreate;
}
```
放行（唯讀，doctor 可用）：`git tag`、`git tag -l [pattern]`、`git tag -n5`、`git tag --contains HEAD`、`git tag --sort=-creatordate`。
攔截（寫入，doctor 禁止）：`git tag <name>`、`git tag -a … -m …`、`git tag -d <name>`、`git tag -f <name>`。

> 實作 session 須把上述 `if (/^git tag\b/.test(t)) return true;` 那一行（line 82）整段替換為此 block，並補對應 gate（見 Phase 1）。

---

## 四、Phase 拆解

> 本 change 全部落在 `.claude/`，屬規則類直推。Phase 1、2、3 為檔案編輯（實作 session 執行）；分支刪除與上線為操作步驟（主 session + 使用者端執行）。

### Phase 1 — role-guard.js doctor 段 merge-base 誤攔修復

- **檔案**：`.claude/hooks/role-guard.js`（僅此檔）
- **改動 1（merge-base）**：第 87 行 `/^git merge\b/.test(t)` → `/^git merge(\s|$)/.test(t)`
- **改動 2（git tag，決策 A 定案＝一併修）**：第 82 行 `/^git tag\b/.test(t)` 整行替換為「三、決策 A」的 token 比對 block。
- **Gate（規劃者已實測）**：
  ```bash
  # merge-base
  node -e 'console.log("merge-base放行:", /^git merge(\s|$)/.test("git merge-base origin/main HEAD")===false);
           console.log("真merge仍攔:", /^git merge(\s|$)/.test("git merge --no-ff foo")===true);'
  # git tag：以 spec 決策 A 的 blocksTag() 跑 10 案例，期望全 PASS
  ```
  **實測結果**：merge-base 修法對 `git merge-base` → `false`（放行✓）、對真 merge → `true`（仍攔✓）；`git tag` token 比對 10/10 案例全過（唯讀列出放行、建立/刪除攔截）。
- **驗收**：修改 `server/` 提醒不適用（本檔非 server）。改 hook 後提醒使用者：hook 於下次 tool call 生效，無需重啟服務。

### Phase 2 — deploy-release skill 補「直推後刪功能分支」收尾

- **檔案**：`.claude/skills/deploy-release/SKILL.md`（僅此檔）
- **改動**：在「### 直推流程」段（約 142–156 行）之後，補一小節，內容要點：
  - 若直推 main 的內容原本在某條 `m_b_*` 功能分支上開發、且已 100% 進 main，該功能分支即成殭屍分支，**必須在同一批上線收尾中刪除**，與 workflow「功能上線＝merge + 刪分支」對齊。
  - 刪除指令因 CCR 沙箱 403，須以自包含指令交使用者端執行：`git push origin --delete <分支>`（見本 skill「tag push / 刪分支的正確流程」段）。
  - 明點「規則類直推」與「功能上線」都要刪分支，差別只在前者不 merge。
- **Gate**：
  ```bash
  grep -n "直推後刪\|上線後.*刪.*分支\|--delete" .claude/skills/deploy-release/SKILL.md
  ```
  期望：新段落可被 grep 命中。
- **邊界**：只補「直推流程」收尾，不改「功能上線」段（該段已有刪分支語意）。

### Phase 3 — now.md 更新（推 main 前強制，與上線同 commit）

- **檔案**：`.claude/now.md`（僅此檔）
- **改動**：新增 change 28 上線紀錄於「最近推送」；「當前 Change」段無需新增進行中項（change 28 為即時直推）。
- **Gate**：`grep -c "change 28" .claude/now.md` ≥ 1。
- **注意**：依鐵律，now.md 更新必須與 push main 同一個 commit。

---

## 五、操作類步驟（非 Phase，主 session 執行 / 交使用者端）

> 這些是 git 分支操作，非檔案編輯。CCR 沙箱刪遠端分支會 403，一律交使用者於 Termius/PC 端執行自包含指令。

### 步驟 X1：刪三條殘留分支（診斷報告 🟠1 / 🟠2 / 🟡3 前半）

交使用者端執行（自包含，路徑寫死）：
```
cd /home/ubuntu/dev/KJ-Champion-System && git push origin --delete m_b_role-guard補強 m_b_打包繼續指令 claude/packing-continue-skills-audit-qr0c9z && git fetch origin --prune
```
> `claude/change-20-strategy-hf8eds` **不在其中**（非目標，待 change 20 復工）。

### 步驟 X2：change 28 上線（規則類直推，主 session + 使用者確認）

依 deploy-release skill「規則類直推」流程：更新 now.md（同 commit）→ 機密檢查 → 使用者確認 → cherry-pick `.claude/` 變更到 main → push → `sync-branches.sh`。

### 步驟 X3：dogfood 新規則——刪本 change 的功能分支

change 28 內容進 main 後，刪除實作 session 用的 `m_b_*` 分支（即 Phase 2 新增規則的第一次實地套用）。交使用者端執行 `git push origin --delete <本change功能分支>`。

---

## 六、Sub-agent 平行執行配置

依 workflow skill 四條判準定案：

| 判準 | 本 change 情形 |
|---|---|
| ① 檔案接觸面 | Phase 1（`role-guard.js`）、Phase 2（`deploy-release/SKILL.md`）、Phase 3（`now.md`）三者**零檔案重疊**，理論上可平行。 |
| ② sub-agent 不 commit/push | 若平行，sub-agent 只寫檔＋跑該 Phase gate，commit/push 一律主 session 依序執行。 |
| ③ 使用者互動步驟歸主 session | 步驟 X1/X2/X3（刪分支、上線確認、403 fallback）全為使用者互動，一律主 session，不得下放 sub-agent。 |
| ④ 邊界由規劃層定案 | **定案：不開 sub-agent，主 session 序列做完 Phase 1→2→3。** 三個 Phase 合計約 15 行改動，開 sub-agent 的協調成本遠大於效益（判準①雖允許平行，但工作量太小，屬可選而不選）。 |

**實作 session 照本表執行：序列，單 session，不自行改為平行。**

---

## 七、commit 數驗收條款

- **原則**：每 Phase 一個 commit（Phase 1、2、3 各一）；但本 change 屬規則類直推，實務上可將三個 `.claude/` 檔案的改動合併為單一 commit 後 cherry-pick 直推 main（規則類直推本就是單 commit 上線）。
- **允許的例外**：使用者中途手動 commit 允許，但**必須在驗收報告揭露**。
- **禁止**：為湊 commit 數而 squash 已推遠端的歷史。

---

## 八、驗收清單（全 ✅ 才算完成）

- [ ] Phase 1 gate：`node -e` 測試 `git merge-base` 放行、真 merge 仍攔；`git tag` token 比對 10 案例全過。
- [ ] Phase 2 gate：grep 命中新增的「直推後刪分支」收尾段。
- [ ] Phase 3 gate：now.md 含 change 28 紀錄。
- [ ] 決策 A 定案＝一併修 `git tag`，Phase 1 含改動 1（merge-base）+ 改動 2（git tag token 比對）。
- [ ] 三條殘留分支（步驟 X1）已由使用者端刪除，`git branch -r` 不再出現。
- [ ] change 28 內容已進 main，本 change 功能分支已刪（步驟 X3，dogfood）。
- [ ] 全程零產品程式碼（`server/`、`frontend/`）異動。
