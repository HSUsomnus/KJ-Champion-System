# Change 22 補強工作證 — 紀律閘門（addendum）

> 本工作證由顧問 session（Claude Fable 5）於 change 22 驗收後產出，供 Sonnet 直接執行。
> 驗收評分 93/100，扣分項的根因診斷已完成，執行者**不需要重新調查**，照本文件逐項實作即可。
> 執行分支：`m_b_規則體系重構`（補在功能上線 merge main 之前，一次帶進 main）。
> 產出日期：2026-07-09

---

## 一、背景（驗收扣分項 → 根因）

change 22 執行結果全部 gate 通過，但顧問複驗發現三個流程紀律瑕疵：

| 扣分項 | 現象 | 根因 |
|---|---|---|
| tasks.md 漏勾 | Phase commit 時未同步勾選，最後需要一個「補勾」collect commit | 勾選規則只存在於 workflow 文件（prose），commit 當下無任何提醒 |
| commit 型別標錯 | Phase 2「hook 硬化」、Phase 3「規則合併」誤用 `fix:`（應為 `chore:`） | 專案只規定了前綴**格式**，從未定義**何時用哪個型別**——規則缺判準 |
| spec gate 指令寫壞 | gate 7.3 `grep -c "^## \["` 字面預期值不可能達成（一行索引也以 `## [` 開頭） | spec 撰寫者（顧問）出貨前沒有實際跑過 gate 指令 |

共通病灶與 change 22 主體相同：**prose 勸告在動作發生的時點不在場**。解法也相同：能 hook 的 hook 化，不能 hook 的把判準寫進對應 skill 的動作時點。

---

## 二、執行約束（Sonnet 必讀）

1. **分支**：`m_b_規則體系重構`（change 22 既有分支，不開新分支）。
2. **只動**：`.claude/hooks/git-guard.js`、`.claude/skills/deploy-release/SKILL.md`、
   `.claude/skills/workflow/SKILL.md`、`changes/22-規則體系重構/spec.md`、
   `changes/22-規則體系重構/tasks.md`。其他檔案一律不碰。
3. **保留 git-guard.js 既有全部行為**：三類既有攔截（add -A deny、main 產品碼 deny、push main 警告）
   與誤判防護（cmdSegments 切段比對）不得弱化。第四節有 regression 測試把關。
4. 參考實作可微調，但行為必須一致。
5. **全部完成 = 一個 commit**，型別前綴 `chore:`（依本工作證新增的型別對照表，這是規則/hook 類變更）。
   commit 時 tasks.md 的勾選必須在同一個 commit 內——本工作證的第一條新規則，自己先守。
6. 有任何本文件未涵蓋的判斷點 → 停下來問使用者，不要自行決定。

---

## 三、補強項目

### A. git-guard.js — tasks.md 同步提醒（警告，不攔截）

在 `m_b_*` 分支執行 `git commit` 時，若 staged 有實質變更、repo 內存在 `changes/*/tasks.md`、
但 staged 不含任何 tasks.md → 注入一行 additionalContext 提醒。

**用警告不用 deny 的原因**：不是每個 commit 都對應一個 task（中途修 typo、格式調整），
deny 會誤傷；但提醒出現在 commit 的當下，與散落文件中的 prose 是不同量級的存在感。

參考實作（插入在既有 deny 判斷之後、push main 警告之前；警告訊息與 push main 警告
共用同一次 additionalContext 輸出，或各自輸出皆可，行為一致即可）：

```js
// ── m_b_* 分支 commit 未同步 tasks.md → 提醒（警告，不攔截）──────────
// 原因：change 22 驗收發現 Phase commit 漏勾 tasks.md，最後才補勾。
// tasks.md 是進度唯一來源，勾選必須與完成該 task 的 commit 同批。
if (/git commit\b/.test(command)) {
  let branch = '';
  try { branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim(); } catch (_) {}
  if (/^m_b_/.test(branch)) {
    let staged = '';
    try { staged = execSync('git diff --name-only --cached', { encoding: 'utf8' }); } catch (_) {}
    const stagedFiles = staged.split('\n').map(f => f.trim()).filter(Boolean);
    const hasTasksStaged = stagedFiles.some(f => /^changes\/[^/]+\/tasks\.md$/.test(f));
    let hasTasksInRepo = false;
    try {
      hasTasksInRepo = execSync('git ls-files "changes/*/tasks.md"', { encoding: 'utf8' }).trim().length > 0;
    } catch (_) {}
    if (stagedFiles.length > 0 && hasTasksInRepo && !hasTasksStaged) {
      warnings.push(
        '📋 [git-guard] 本次 commit 未包含 changes/*/tasks.md — 若本 commit 完成了任何 task，' +
        '勾選必須同 commit（tasks.md 是進度唯一來源）。純中途修正可忽略本提醒。'
      );
    }
  }
}
```

### B. git-guard.js — commit message 型別前綴格式閘（deny）

`git commit` 帶 `-m` 時，訊息開頭不符 `^(feat|fix|chore|docs|refactor|test)(\(...\))?: ` → deny。

**設計邊界（實作時注意）**：
- 只驗**格式**不驗語意（fix 誤標 chore 機器驗不了，判準靠 C 項的對照表）。
- 只檢查含 `-m` 的段；`git merge` / `git revert` 的自動訊息不經 `-m`，不受影響。
- 沿用既有 cmdSegments 切段防護：只比對**段開頭**為 `git commit` 的段，
  避免 heredoc / 訊息文字中出現「git commit -m」字樣時誤觸發。
- ⚠️ 此閘對使用者本人的手動 commit 同樣生效（例如 change 22 中的「更新 settings.json」
  就會被擋下要求補前綴）——使用者已知悉並接受，hook 不分人才有意義。

參考實作（插入既有 denyReasons 判斷區）：

```js
// ── commit message 型別前綴格式閘 ────────────────────────────────────
// 只驗格式不驗語意；型別選擇判準見 deploy-release skill「commit 型別對照表」。
const commitSeg = cmdSegments.map(s => s.trimStart()).find(s => /^git commit\b/.test(s));
if (commitSeg) {
  const msgMatch = commitSeg.match(/-m\s+["']([^"']+)/);
  if (msgMatch && !/^(feat|fix|chore|docs|refactor|test)(\([^)]*\))?: /.test(msgMatch[1])) {
    denyReasons.push(
      '⛔ [git-guard] commit message 必須以型別前綴開頭：feat|fix|chore|docs|refactor|test',
      `收到：「${msgMatch[1].slice(0, 60)}」`,
      '型別判準：feat=新功能｜fix=修錯誤行為｜refactor=行為不變重構｜chore=規則/設定/腳本｜docs=純文件',
      '詳見 deploy-release skill「commit 型別對照表」'
    );
  }
}
```

### C. deploy-release skill — commit 型別對照表

`.claude/skills/deploy-release/SKILL.md`「git 指令規範」小節，
在既有 code block（`git commit -m "feat/fix/chore: ..."`）之後補上判準表：

```markdown
**commit 型別對照表**（git-guard 強制前綴格式；型別選擇依此表）：

| 前綴 | 用於 |
|---|---|
| `feat` | 新增使用者可感知的功能 |
| `fix` | 修正錯誤行為（改之前是壞的） |
| `refactor` | 行為不變的結構調整 |
| `chore` | 規則、設定、hook、腳本、雜務 |
| `docs` | 純文件（README、spec、context） |
| `test` | 純測試變更 |
```

### D. workflow skill — spec 撰寫標準兩條

`.claude/skills/workflow/SKILL.md`，在「OpenSpec 文件職責分工」表之後
（「新 change 編號 = ...」那行附近）新增一小節：

```markdown
### spec 撰寫標準（顧問 / 規劃者適用）

- **gate 指令必須實測**：驗證 gate 的每條指令，寫入 spec 前必須對現狀實際執行過一次，
  確認語法與預期值成立（change 22 教訓：gate 7.3 的 grep 計數字面上不可能達成）。
- **commit 數驗收條款寫法**：「每 Phase 一個 commit；使用者中途手動 commit 允許，
  但必須在驗收報告揭露」——把合理例外寫進規則，避免執行者為湊數而 squash 歷史。
```

### E. change 22 spec gate 7.3 指令修正

`changes/22-規則體系重構/spec.md` 第 7.3 節，將：

```bash
grep -c "^## \[" .claude/CHANGELOG.md                    # 預期：完整摘要 ≤ 5 版（其餘為一行索引）
```

改為：

```bash
grep -c "^git tag:" .claude/CHANGELOG.md                 # 預期：≤ 5（只有完整摘要版有 git tag: 行，一行索引沒有）
```

並在該行後加一行註記：
`# （addendum 修訂：原 grep "^## \[" 會同時數到一行索引標題，字面預期值不可能達成）`

---

## 四、驗證 gate（全 ✅ 才 commit）

```bash
node --check .claude/hooks/git-guard.js                  # 預期：無輸出（語法通過）

# ── regression：spec 7.2 既有測試不得退化 ──────────────────────────────
echo '{"tool_name":"Bash","tool_input":{"command":"git add -A"}}' \
  | node .claude/hooks/git-guard.js                      # 預期：含 "permissionDecision":"deny"
echo '{"tool_name":"Bash","tool_input":{"command":"git commit -m \"docs: 說明 git add . 的規則\""}}' \
  | node .claude/hooks/git-guard.js                      # 預期：無 deny（前綴合法 + 誤判防護仍有效）

# ── 新測 B1：無前綴 commit 必須 deny ──────────────────────────────────
echo '{"tool_name":"Bash","tool_input":{"command":"git commit -m \"更新 settings.json\""}}' \
  | node .claude/hooks/git-guard.js                      # 預期：含 "deny" 與「型別前綴」字樣

# ── 新測 B2：合法前綴通過 ────────────────────────────────────────────
echo '{"tool_name":"Bash","tool_input":{"command":"git commit -m \"chore: 更新 settings.json\""}}' \
  | node .claude/hooks/git-guard.js                      # 預期：無 deny

# ── 新測 A1/A2：tasks.md 提醒（假 repo 模擬，不碰真 repo）──────────────
PROJ=$(pwd); T=$(mktemp -d); cd "$T"
git init -qb m_b_test && mkdir -p changes/99-test && echo "- [ ] x" > changes/99-test/tasks.md
git add changes/99-test/tasks.md && git -c user.email=t@t -c user.name=t commit -qm "chore: init"
echo y > other.txt && git add other.txt
echo '{"tool_name":"Bash","tool_input":{"command":"git commit -m \"chore: work\""}}' \
  | node "$PROJ/.claude/hooks/git-guard.js"              # A1 預期：additionalContext 含 "tasks.md"
git add changes/99-test/tasks.md 2>/dev/null; echo "- [x] x" > changes/99-test/tasks.md; git add changes/99-test/tasks.md
echo '{"tool_name":"Bash","tool_input":{"command":"git commit -m \"chore: work\""}}' \
  | node "$PROJ/.claude/hooks/git-guard.js"              # A2 預期：無 tasks.md 提醒
cd "$PROJ" && rm -rf "$T"

# ── C / D / E 文件檢查 ────────────────────────────────────────────────
grep -c "commit 型別對照表" .claude/skills/deploy-release/SKILL.md   # 預期：≥ 1
grep -c "實際執行過一次" .claude/skills/workflow/SKILL.md            # 預期：≥ 1
grep -n "git tag:" changes/22-規則體系重構/spec.md | head -2          # 預期：gate 7.3 已改用 git tag: 計數
```

---

## 五、Tasks（先把本清單追加到 tasks.md，再逐項執行）

執行的第一步：將以下區塊**原封追加**到 `changes/22-規則體系重構/tasks.md` 末尾，
之後所有勾選都在 tasks.md 進行（進度唯一來源），本檔不再更新勾選狀態。

```markdown
## 7. 補強 — 紀律閘門（addendum-紀律補強.md）

- [ ] 7.1 git-guard.js：m_b_* commit 未帶 tasks.md → additionalContext 提醒（A 項）
- [ ] 7.2 git-guard.js：commit message 型別前綴格式閘 → deny（B 項）
- [ ] 7.3 deploy-release skill 補 commit 型別對照表（C 項）
- [ ] 7.4 workflow skill 補「spec 撰寫標準」兩條（D 項）
- [ ] 7.5 change 22 spec gate 7.3 指令修正（E 項）
- [ ] 7.6 addendum 第四節 gate 全 ✅（含 regression）
- [ ] 7.7 一個 commit（chore: 前綴、tasks.md 勾選同 commit）+ push
```

---

## 六、完成後回報格式

```
## Change 22 補強驗收報告
- 第四節 gate 結果：（逐項 ✅/❌ + 關鍵輸出）
- regression 確認：spec 7.2 既有測試（add -A deny / heredoc 誤判防護）全部維持通過
- 提醒使用者：型別前綴閘對使用者手動 commit 同樣生效
```
