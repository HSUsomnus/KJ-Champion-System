# Change 24 — 收尾清理（記錄檔小掃尾）

> 由顧問 session（Claude Fable 5，`/規劃` 角色）產出，供 Sonnet `/實作` 直接執行。
> 來源：change 22 + 23 上線後的顧問總驗收（2026-07-11），核心目標全數達成，
> 本 change 只處理驗收發現的 4 個掃尾項，**零產品程式碼**。
> 所有 gate 指令均已由顧問對現狀實測過一次，現狀值標注於各 gate 註解。
> 產出日期：2026-07-11

---

## 一、背景（驗收發現的 4 個掃尾項）

| # | 問題 | 處理 |
|---|---|---|
| 1 | `.claude/CHANGELOG.md` 完整摘要版有 6 版（規則：近 5 版）——v2.12.0 收尾時漏裁 v2.8.1 | Phase 1 |
| 2 | `.claude/now.md` 過時：change 20 仍寫舊分支名 `claude/new-feature-pz95p1`、「spec 需搬到 changes/」（實際已改名 `m_b_調查表單` 且已搬完）；change 19/22/23 的 ✅ DONE 行已由 context 檔承載，違反 now.md「已解決必須移除」自身規則 | Phase 2 |
| 3 | `changes/22`、`changes/23` 資料夾仍在 main，兩者已 DONE——依 change 22 Phase 5.1 確立的原則（已完成 change 資料夾刪除，歷史由 git + context 檔承載）符合刪除條件 | Phase 3 |
| 4 | 遠端殘留分支 `claude/change-22-review-9se4p5`（與 main 差 0 commit）| 使用者自辦（CCR 刪遠端分支會 403）|

**附帶目的**：本 change 是 change 23 上線後第一個新 change，全程走
`/規劃` → `/實作` → 收尾員流程，即 change 23 第八節第 4 項要求的**三層交接實地驗證**。
特別驗證點：收尾員新增 v2.12.1 摘要時，**必須自行執行裁切**（上次 v2.12.0 收尾漏做的正是這一步）。

---

## 二、執行約束（Sonnet 必讀）

1. 分支：`git fetch origin claude/project-spec-review-95epn4 && git checkout -b m_b_收尾清理 origin/claude/project-spec-review-95epn4 && git push -u origin m_b_收尾清理`
   （顧問 spec 在該分支上，從它起分支即帶入本 spec；已含 main 全部內容，與 main 差距僅本 spec commit）。
2. **不碰 `server/`、`frontend/` 任何檔案**（role-guard 與 git-guard 都會攔，也本來就無需求）。
3. 只做搬移、裁切、刪除與指定的文字更新，**禁止改寫任何規則語意**。
4. 每個 Phase 一個 commit，型別前綴 `docs:` 或 `chore:`，結尾附 trailer
   （`Co-Authored-By` + `Claude-Session`）；tasks.md 勾選與該 Phase commit 同批。
5. spec 未涵蓋的判斷點 → 停下來問使用者。
6. 版本號定為 **v2.12.1**（純記錄檔修正，比照 hotfix 尾碼；寫入收尾筆記供收尾員使用）。

---

## 三、Phase 1 — CHANGELOG 補裁切

`.claude/CHANGELOG.md` 中 v2.8.1 的完整摘要區塊（第 45–48 行一帶：標題 + `git tag:` 行 + 摘要，
含前後 `---` 分隔線其一）壓縮為一行索引，格式比照既有索引行：

```markdown
## [v2.8.1] - 2026-06-21 — hotfix：Zeabur 映像 promise-retry 缺失，engines 加 "npm": "10"（詳見 .claude/context/v2.8.1.md）
```

完成後完整摘要版恰為 5 版（v2.12.0 / v2.11.0 / v2.10.1 / v2.10.0 / v2.9.0）。
（v2.9.0 不在本 Phase 裁——留給收尾員新增 v2.12.1 時依規則自行裁切，這是實地驗證點。）

## 四、Phase 2 — now.md 更新

`.claude/now.md`「當前 Change」段落，共四處：

1. 刪除 change 19 的 ✅ DONE 行。
2. 刪除 change 22 的 ✅ DONE 行。
3. 刪除 change 23 的 ✅ DONE 行（其中「下一個新 change 須實地驗證完整流程」的待辦
   由本 change 執行本身兌現，收尾員會在「最近推送」記錄驗證結果）。
4. change 20/21 行改寫為（分支已改名、spec 已搬完，僅保留仍然成立的提醒）：

   ```
   change 20「團隊調查表單系統」— 分支 `m_b_調查表單`，待復工。`claude/new-session-k97gfv`（AI員工後端橋接）復工時編號改 21。兩者復工時 `.claude/` 相關衝突一律取 main 版本。
   ```

change 12 行與「已知地雷」「最近推送」「環境特殊狀態」段落**一字不動**
（最近推送由收尾員維護，不在本 Phase 範圍）。

## 五、Phase 3 — 刪除已完成 change 資料夾

```bash
git rm -r changes/22-規則體系重構 changes/23-模型分層工作證
```

依據：change 22 spec Phase 5.1 確立的原則——已完成 change 的歷史由 git 與
`.claude/context/vX.Y.Z.md` 承載，資料夾是重複與搜尋污染源。
`changes/24-收尾清理/`（本 change）保留至收尾完成，於 Phase 4 停止點後自刪（見下）。

## 六、Phase 4 — 停止點與收尾（三層交接實地驗證）

1. 寫收尾筆記 `changes/24-收尾清理/收尾筆記.md`，四段：
   版本號 **v2.12.1**、改動摘要（給 CHANGELOG 用）、學習日誌素材（沒遇到坑就寫「無」）、
   驗證結果摘要（第七節 gate 輸出重點）。
2. 呼叫收尾員子代理（Agent tool，名稱「收尾員」），prompt：
   「執行收尾，收尾筆記在 changes/24-收尾清理/收尾筆記.md」。
3. 收尾員回報後，**主 session 驗證收尾員是否正確裁切**（7.4 gate）——
   若 `grep -c "^git tag:"` 不是 5，代表收尾員又漏裁，主 session 補裁 v2.9.0 並在驗收報告揭露。
4. 最後一步：`git rm -r changes/24-收尾清理` 單獨一個 `chore:` commit
   （spec / tasks 歷史由 git 承載；收尾筆記已由收尾員刪除、context 檔承載）。
5. `rm -f .claude/.session-role`，向使用者總結（含收尾員回報轉述、
   三層交接驗證結果、待使用者執行的指令清單）並結束。

---

## 七、驗證 gate（每 Phase 全 ✅ 才 commit；現狀值已由顧問實測）

### 7.1 Phase 1 gate

```bash
grep -c "^git tag:" .claude/CHANGELOG.md      # 現狀 6 → 預期 5
grep -n "v2.8.1" .claude/CHANGELOG.md | head -2 # 預期：僅一行索引（含「詳見 .claude/context/v2.8.1.md」），無 git tag: v2.8.1 行
```

### 7.2 Phase 2 gate

```bash
grep -c "new-feature-pz95p1" .claude/now.md   # 現狀 1 → 預期 0
grep -c "DONE" .claude/now.md                  # 現狀 3 → 預期 0
grep -c "m_b_調查表單" .claude/now.md          # 現狀 0 → 預期 1
grep -c "m_b_統一彈出訊息系統" .claude/now.md  # 預期 ≥1（change 12 行不得誤刪）
```

### 7.3 Phase 3 gate

```bash
ls changes/                                    # 預期：僅 24-收尾清理
ls changes/22-規則體系重構 changes/23-模型分層工作證 2>&1  # 預期：兩者皆 No such file
```

### 7.4 Phase 4 / 收尾後 gate（主 session 在收尾員回報後執行）

```bash
grep -c "^git tag:" .claude/CHANGELOG.md      # 預期 5（收尾員加 v2.12.1 後必須裁 v2.9.0；若 6 = 漏裁，補裁並揭露）
grep -c "v2.12.1" .claude/CHANGELOG.md        # 預期 ≥1
ls .claude/context/v2.12.1.md                  # 預期：存在
grep -c "收尾筆記" changes/ -r 2>/dev/null | grep -v ":0" | wc -l  # 預期 0（收尾筆記已刪）
grep -c "v2.12.1" .claude/now.md               # 預期 ≥1（最近推送已更新）
# 常駐 token 迴歸（change 22 目標不得回退）
python3 -c "
import re, glob
files = ['CLAUDE.md', '.claude/now.md']
total = 0
for f in files:
    s = open(f, encoding='utf-8').read()
    cjk = len(re.findall(r'[一-鿿]', s)); total += cjk*1.5 + (len(s)-cjk)/4
for f in glob.glob('.claude/skills/*/SKILL.md'):
    s = open(f, encoding='utf-8').read()
    desc = s.split('---')[1] if s.count('---') >= 2 else ''
    cjk = len(re.findall(r'[一-鿿]', desc)); total += cjk*1.5 + (len(desc)-cjk)/4
print(f'常駐估算: {int(total)} tokens（門檻 3500；現狀 3168，本 change 只減不增）')
"
```

### 7.5 總驗收

- [ ] 7.1–7.4 全 ✅（後面 Phase 完成後重跑前面 gate）
- [ ] `git log --oneline main..HEAD`：spec commit + 每 Phase 一個 + 收尾員一個 + 自刪一個
      （使用者手動 commit 例外，需在報告揭露）
- [ ] 全部 commit 帶型別前綴 + trailer
- [ ] 驗收報告：各 gate 結果、**三層交接實地驗證結論**（收尾員有沒有自己把裁切做對）、
      待使用者確認事項

---

## 八、使用者自辦事項

1. 在 PC 刪除遠端殘留分支：`git push origin --delete claude/change-22-review-9se4p5`
   （與 main 差 0 commit，純殘留；CCR 沙箱會 403）。
2. 本 change merge 進 main（`--no-ff`）與 tag `v2.12.1` 依慣例由使用者確認後執行。
3. merge 後順手刪除已完成的顧問分支：`git push origin --delete claude/project-spec-review-95epn4`、
   `git push origin --delete m_b_收尾清理`（PC 執行）。
