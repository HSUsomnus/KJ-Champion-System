# Change 25 — 三層流程補強（change 24 實地驗證發現的四個缺口）

> 由顧問 session（Claude Fable 5，`/規劃` 角色）產出，供 Sonnet `/實作` 直接執行。
> 來源：change 24 是三層流程（`/規劃` → `/實作` → 收尾員）首次實地驗證，流程整體跑通，
> 但過程暴露四個交接缺口（spec 找不到、簽章誤報重簽、收尾員 trailer 佔位、tag 補做指令
> 不自包含）。本 change 將四個缺口制度化修補，**零產品程式碼**，全部是 `.claude/` 規則文字。
> 所有 gate 指令均已由顧問對現狀實測，現狀值標注於各 gate 註解。
> 產出日期：2026-07-11

---

## 一、背景（change 24 驗證中的四個插曲與根因）

| # | 插曲 | 根因 | 修補 |
|---|---|---|---|
| 1 | Sonnet 開工找不到 spec，靠使用者人工傳話補救 | spec 在顧問分支上，而「怎麼取 spec」的指令又寫在 spec 裡（雞生蛋）；`/規劃` 交接訊息模板沒有內建取件指令 | Phase 1 |
| 2 | stop 時回報 4 個 commit「缺 SSH 簽章」，Sonnet rebase 重簽 4 個 commit | **誤報**。CCR 沙箱由平台自動配置簽章（`commit.gpgsign=true`），每個 commit 本來就有簽；但沙箱缺 `gpg.ssh.allowedSignersFile`，本地驗證一律報錯顯示 N——「無法驗證」被誤讀成「沒有簽」。重簽是白工且重簽後查了還是 N（這次安全純因未推送） | Phase 3、4 |
| 3 | 收尾員 commit 的 `Claude-Session` trailer 是佔位字串「session (CCR agent)」 | 子代理拿不到主 session 的 URL，收尾筆記四段裡也沒有這項素材 | Phase 1、2 |
| 4 | 使用者被指示 `git push origin v2.12.1`，在自己的 Codespace 執行失敗（`src refspec does not match any`） | tag 只存在沙箱本地（push 吃 403 從未到遠端），而補做指令假設了使用者端已有這個 tag。**403 fallback 指令沒有自包含** | Phase 3、4 |

四個缺口的共同主題：**跨環境交接時，交出去的資訊必須假設對方一無所有**——
新 session 沒有 spec、子代理沒有主對話記憶、使用者的 clone 沒有沙箱的本地狀態。

---

## 二、執行約束（Sonnet 必讀）

1. 分支：`git fetch origin claude/project-spec-review-95epn4 && git checkout -b m_b_三層流程補強 origin/claude/project-spec-review-95epn4 && git push -u origin m_b_三層流程補強`
   （顧問 spec 在該分支上，該分支已含最新 main）。
2. **不碰 `server/`、`frontend/` 任何檔案**。只改本 spec 指定的 5 個檔案 + tasks.md。
3. 修改一律「加字或替換指定段落」，**不得動到各檔其他既有內容的語意**。
4. 每個 Phase 一個 commit，型別前綴 `chore:` 或 `docs:` + trailer；tasks.md 勾選與該 Phase commit 同批。
5. 版本號定 **v2.12.2**（純規則類修補；寫入收尾筆記供收尾員使用）。
6. spec 未涵蓋的判斷點 → 停下來問使用者。

---

## 三、Phase 1 — `/實作`、`/規劃` command 補強（缺口 1、3）

### 1.1 `.claude/commands/規劃.md` — 停止點第 1 點替換

原文：

```
1. 輸出交接訊息：「規劃完成。請開新 session、切換 Sonnet，輸入 `/實作` 後說『執行計畫 change NN』。」
```

替換為：

```
1. 輸出交接訊息，**必須內含 spec 所在分支與起手式三行**（spec 通常尚未在 main 上，新 session 看不到）：
   「規劃完成。請開新 session、切換 Sonnet，輸入 `/實作` 後說『執行計畫 change NN』。
   spec 在分支 `<spec分支名>`，實作 session 起手式：
   git fetch origin <spec分支名>
   git checkout -b m_b_<功能名> origin/<spec分支名>
   git push -u origin m_b_<功能名>」
```

### 1.2 `.claude/commands/實作.md` — 職責段之後加一段

在「## 語言與回報紀律」之前插入：

```
## spec 取得

工作區找不到該 change 的 `spec.md` → **先問使用者 spec 在哪個分支**，fetch 該分支切出
`m_b_*` 實作分支後再開工。不得自行猜測位置、不得要求先 merge spec 的 PR 進 main。
```

### 1.3 `.claude/commands/實作.md` — 收尾筆記四段改五段

停止點第 1 點中「內容四段：版本號、改動摘要（給 CHANGELOG 用）、學習日誌素材（…）、驗證結果摘要（gate 輸出重點）」
改為「內容五段」，在「版本號」之後插入「**主 session 連結**（本 session 的 URL，供收尾員 commit trailer 使用）」。

---

## 四、Phase 2 — 收尾員 trailer 來源修正（缺口 3）

`.claude/agents/收尾員.md` 兩處：

1. 職責步驟 1 的交接素材清單「版本號、改動摘要、學習日誌素材、驗證結果」
   改為「版本號、**主 session 連結**、改動摘要、學習日誌素材、驗證結果」。
2. 步驟 7 commit 範本中 `-m "Claude-Session: <本 session 連結>"` 改為
   `-m "Claude-Session: <收尾筆記提供的主 session 連結>"`，並在範本下方加一行：

   ```
   收尾筆記未提供連結 → trailer 寫「Claude-Session: (主 session 未提供連結)」並在回報中註明，不得自行編造 URL。
   ```

---

## 五、Phase 3 — deploy-release skill 補強（缺口 2、4）

`.claude/skills/deploy-release/SKILL.md`「⚠️ CCR 沙箱 git 限制」章節內兩處：

### 3.1 「tag push / 刪分支的正確流程」的 403 fallback 段補強

「**只有在收到 403 時**，才告知使用者手動補做」的「本機終端機：直接給指令」之後，加：

```
**403 fallback 指令必須自包含**：交給使用者的補做指令，必須假設對方在**全新 clone** 執行——
不得依賴沙箱本地狀態（本地 tag、本地分支、未推送的 commit）。tag 補做範本（SHA 必須明確給出）：

git fetch origin main
git tag vX.Y.Z <merge commit SHA>
git push origin vX.Y.Z

（change 24 教訓：沙箱本地 tag 推送吃 403 後，只給使用者 `git push origin vX.Y.Z` 一行，
使用者端沒有這個 tag，失敗 `src refspec does not match any`。）
```

### 3.2 章節末尾（403 操作表之後）加小節

```
### SSH 簽章與本地驗證（CCR 沙箱）

CCR 沙箱由平台自動配置 SSH commit 簽章（`commit.gpgsign=true`、金鑰平台代管），每個 commit 預設已簽。
但沙箱缺 `gpg.ssh.allowedSignersFile`，`git log --show-signature` 一律報錯並顯示 N——
這是「**無法驗證**」不是「沒有簽」。

⛔ 不得因本地顯示 N / 工具回報「缺簽章」而 rebase 重簽或重寫歷史（change 24 曾因此白工重簽
4 個 commit）；簽章真偽一律以 GitHub commit 頁的 Verified badge 為準。
```

---

## 六、Phase 4 — now.md 地雷區補兩條（缺口 2、4 的即時提醒層）

`.claude/now.md`「已知地雷」清單中：

1. 既有「**CCR 沙箱 git 403**」條目句尾補一句：
   「；**補做指令必須自包含**（tag 需先在使用者端建立並指明 SHA，見 deploy-release skill）」。
2. 其後新增一條：
   「- **CCR 沙箱簽章顯示 N 屬正常**：沙箱有平台自動 SSH 簽章但缺 allowedSignersFile 無法本地驗證，git log 顯示 N ≠ 沒簽；禁止為此重寫歷史，以 GitHub badge 為準」。

---

## 七、Phase 5 — 停止點與收尾

1. 寫收尾筆記 `changes/25-三層流程補強/收尾筆記.md`——**依 Phase 1.3 改好的新格式寫五段**
   （版本號 v2.12.2、主 session 連結、改動摘要、學習日誌素材、驗證結果摘要）。
   這本身就是缺口 3 修補的實地驗證。
2. 呼叫收尾員子代理，prompt：「執行收尾，收尾筆記在 changes/25-三層流程補強/收尾筆記.md」。
3. 收尾員回報後檢查：(a) CHANGELOG 完整摘要維持 5 版（`grep -c "^git tag:"` = 5）；
   (b) **收尾員 commit 的 `Claude-Session` trailer 是否為收尾筆記提供的真連結**（缺口 3 驗證點）。
4. `git rm -r changes/25-三層流程補強` 單獨 `chore:` commit。
5. `rm -f .claude/.session-role`，向使用者總結並結束。
   上線 main 與 tag 依 deploy-release skill 流程走（使用者確認後執行；tag push 若 403，
   **給使用者的補做指令照 Phase 3.1 的自包含範本**——這是缺口 4 修補的實地驗證）。

---

## 八、驗證 gate（每 Phase 全 ✅ 才 commit；現狀值已由顧問實測）

### 8.1 Phase 1 gate

```bash
grep -c "起手式" .claude/commands/規劃.md      # 現狀 0 → 預期 ≥2（停止點模板含兩處）
grep -c "找不到" .claude/commands/實作.md      # 現狀 0 → 預期 ≥1（spec 取得段）
grep -c "session 連結" .claude/commands/實作.md # 現狀 0 → 預期 ≥1（收尾筆記第五段）
grep -c "四段" .claude/commands/實作.md         # 現狀 1 → 預期 0（已改五段）
```

### 8.2 Phase 2 gate

```bash
grep -c "session 連結" .claude/agents/收尾員.md  # 現狀 1 → 預期 ≥2（素材清單 + commit 範本）
grep -c "編造" .claude/agents/收尾員.md          # 現狀 0 → 預期 ≥1（缺連結 fallback 規則）
```

### 8.3 Phase 3 gate

```bash
grep -c "自包含" .claude/skills/deploy-release/SKILL.md          # 現狀 0 → 預期 ≥2
grep -c "allowedSignersFile" .claude/skills/deploy-release/SKILL.md  # 現狀 0 → 預期 ≥1
grep -c "src refspec" .claude/skills/deploy-release/SKILL.md     # 現狀 0 → 預期 ≥1（教訓案例入文）
```

### 8.4 Phase 4 gate

```bash
grep -c "allowedSignersFile" .claude/now.md    # 現狀 0 → 預期 1
grep -c "自包含" .claude/now.md                # 現狀 0 → 預期 1
# 常駐 token 迴歸（commands / agents / skill 本文不常駐；now.md 增兩行仍須 ≤ 3500）
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
print(f'常駐估算: {int(total)} tokens（門檻 3500）')
"
```

### 8.5 收尾後 gate（主 session 在收尾員回報後執行）

```bash
grep -c "^git tag:" .claude/CHANGELOG.md       # 預期 5（收尾員加 v2.12.2 後裁 v2.10.0）
grep -c "v2.12.2" .claude/now.md               # 預期 ≥1
ls .claude/context/v2.12.2.md                   # 預期：存在
git log -1 --format=%B $(git log --format=%h --grep="v2.12.2 上線準備" -1) | grep "Claude-Session"
# 預期：trailer 為真實 URL（含 session_ 字樣），非佔位字串——缺口 3 驗證點
```

### 8.6 總驗收

- [ ] 8.1–8.5 全 ✅（後面 Phase 完成後重跑前面 gate）
- [ ] 每 Phase 一個 commit + trailer（使用者手動 commit 例外，需揭露）
- [ ] 驗收報告：各 gate 結果、**缺口 3 與缺口 4 的實地驗證結論**、待使用者確認事項

---

## 九、使用者自辦事項

1. 上線 merge `--no-ff` 與 tag `v2.12.2` 依慣例確認後執行；tag push 403 時
   實作 session 會給自包含補做指令（本 change 的驗證點之一）。
2. 上線後 PC 刪除顧問分支與實作分支：
   `git push origin --delete claude/project-spec-review-95epn4 m_b_三層流程補強`。
3. 之後任何 session 再回報「commit 缺簽章」時，先想起：沙箱驗不了簽章，N ≠ 沒簽，
   到 GitHub commit 頁看 badge 才算數。
