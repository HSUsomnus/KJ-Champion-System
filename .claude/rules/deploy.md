# Deploy Rules — git 操作或觸碰設定檔時注入

## 所有分支共用（必做）

### 推送前必做
1. **完整重寫 `README.md`**（每次推送必做，不是選擇性）：
   - 重新撰寫技術架構、功能清單、專案結構、部署說明
   - 頂部版本號更新為本次版本
   - 確保反映目前程式碼實際狀態，刪除過時資訊
2. **機密檢查**：
   - 確認 `.gitignore` 包含：`.env`、`.env.backup`、`Key/`、金鑰 `*.json`
   - 執行 `git status`，確認機密檔案不在清單中
   - 搜尋：長 Token、`-----BEGIN PRIVATE KEY-----`、寫死帳號密碼
3. **列出推送項目清單給使用者確認**，未確認不得執行 `git push`

### git 指令規範

```bash
git add <具體檔案>   # 禁止 git add -A，避免意外加入機密
git commit -m "feat/fix/chore: ..."
```

---

## 推送到 dev（測試站）

```bash
git checkout dev
git merge m_b_功能名稱
git push origin dev
```

- README 重寫：✅ 必做（反映 dev 現況）
- 機密檢查：✅ 必做
- CHANGELOG 更新：選擇性
- **⛔ 絕不從 dev push 到 main**

---

## 規則類更新 — 直推 main

以下類型的變更屬於「規則 / 基礎建設」，可在任何分支 commit 後直接 cherry-pick 到 main 並 push：

- `.claude/` 內所有檔案（rules、commands、context、settings）
- `.gitignore`
- `scripts/` 中的工具腳本（非業務邏輯）
- `CLAUDE.md`、`CHANGELOG.md`

**不得直推 main 的變更**（必須走功能分支 → merge 流程）：

- 功能程式碼（`server/`、`frontend/`、`public/`）
- 資料庫相關（migrations、schema、seeds）
- 套件 / 依賴變更（`package.json`、`package-lock.json`）
- 部署設定（`_worker.js`、`vercel.json`、`zbpack.json`）
- 插件 / 第三方整合

### 直推流程

```bash
git add <規則檔案>
git commit -m "chore: 更新 ..."
git checkout main
git cherry-pick <commit hash>
git push origin main
# 同步到所有本機分支
git checkout dev && git merge main
for branch in $(git branch --list 'm_b_*'); do git checkout "$branch" && git merge main; done
git checkout <回到原分支>
```

README 重寫、CHANGELOG 更新：**不需要**（規則類更新不影響產品功能）。
機密檢查：仍然必做。

### main 推送後同步規則

**任何 push 到 main 之後，必須立即將 main merge 到所有其他分支**（`dev`、`m_b_*`），**包含遠端存在但本機未 checkout 的分支**，確保規則與基礎建設全域一致。此規則適用於所有 main 推送場景（規則直推、功能上線、hotfix）。

**⚠️ 執行前必須警告使用者：** merge 過程需要 checkout 各分支，若有 worktree 佔用的分支會先暫時移除 worktree，merge 完成後自動重建。請確認所有 worktree 內無未儲存的工作。

**`.claude/` 同步方式：** 不使用 post-checkout hook（已移除），改由 main merge 統一同步。

#### 同步流程（含遠端分支）

```bash
git fetch origin --prune
# 1. 同步 dev
git checkout dev && git merge main --no-edit && git push origin dev

# 2. 列出所有遠端 m_b_* 分支（不只本機）
for branch in $(git ls-remote --heads origin 'refs/heads/m_b_*' | sed 's|.*refs/heads/||'); do
  git checkout -B "$branch" "origin/$branch"
  git merge main --no-edit && git push origin "$branch"
done
git checkout main
```

#### 衝突處理策略

若 m_b_* 分支與 main 有衝突（最常見：`frontend/package.json`、`frontend/package-lock.json` 兩邊各加自己的 dep），預設用：

```bash
git merge main -X theirs --no-edit
```

`-X theirs` 在衝突時採 main 版本。**副作用**：分支自己加的 dep 會被覆蓋。執行後必須在報告中**明列哪些分支用了 -X theirs、被覆蓋了什麼**，提醒使用者下次接手該分支時補裝缺失的 dep（例如 `npm install <pkg> --save-dev`）。

#### Bash 腳本陷阱

寫批次同步腳本時：

- ❌ `if git merge ... | tail -3` — `if` 取的是 pipeline **最後一個指令** 的 exit code，`tail` 永遠回傳 0，導致 merge 失敗也判定成功
- ✅ 改用 `git merge ... > /tmp/m.log 2>&1` 後直接 `if [ $? -eq 0 ]` 或 `if git merge ...; then`，輸出另外抓
- ❌ 用 `set -e` + 迴圈 — 一個分支失敗整個迴圈中斷，後面分支被跳過
- ✅ 每個分支 try/catch 化，失敗 abort 該次 merge 後繼續下個分支
- ✅ 最後用 `git rev-list --count "origin/<branch>..main"` 親自驗證每個分支 behind 數，**不可信任腳本內部的 SUCCESS 統計**

---

## 推送到 main（正式上線）

```bash
git push origin main
git tag X.Y.Z
git push --tags
```

**全部必做：**

1. 更新 `CHANGELOG.md`（最上方加入新版本，舊版保留）
2. 建立 `.claude/context/vX.Y.Z.md`（本版詳細上下文）
3. README 完整重寫
4. 機密檢查
5. 使用者**明確確認**後才執行（最高確認要求）
6. `git tag X.Y.Z && git push --tags`

---

## ⚠️ Claude Code Remote (CCR) 沙箱 git 限制

**環境判定**：`env` 含 `CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE` 或 `CCR_TEST_GITPROXY=1`，或 `git remote -v` 指向 `127.0.0.1:<port>/git/...`。此時 Claude 所在沙箱的 git 流量經 CCR 本機 git proxy 轉發到 GitHub。

**已驗證的拒絕操作**（HTTP 403）：

| 操作 | refspec | 結果 |
|---|---|---|
| `git push --tags` / `git push origin <tag>` | `refs/tags/*` 新增 | ❌ 403 |
| `git push origin --delete <branch>` | `... → 0000...`（刪除） | ❌ 403 |

**已驗證的合法操作**（不受限）：

- Push commit 到既有分支（含 main、dev、m_b_*、hotfix/*）
- 建立新分支（`refs/heads/*` 新增）
- Fetch / pull
- **`git push origin <branch> --force-with-lease`**（branch ref force update）— 2026-04-13 執行 dev 格式化驗證通過，**不會 403**。推測 `--force` 同樣通過，但非破壞性場景仍優先用 `--force-with-lease`
- `git push origin <new-branch>`（建立新分支）

### 遇到 403 時的 Claude 行為規則

1. **不可因為 bash 最後一行出現 `Everything up-to-date` 就認為成功** — 必須用 `git ls-remote --tags origin` 與 `git ls-remote --heads origin` 親自驗證
2. 推完 main 後 **必須主動告知** 使用者：
   - tag 未建立在遠端
   - hotfix / 要刪的分支仍在遠端
3. 提供給使用者 **兩種手動補做方式**：
   - **本機終端機**（指令直給）：
     ```bash
     git tag X.Y.Z <commit>
     git push origin X.Y.Z
     git push origin --delete <branch>
     ```
   - **手機 / 電腦瀏覽器**（GitHub Web UI）：
     - Tag：`github.com/<owner>/<repo>/releases/new` → Choose a tag 輸入版本號 → Create new tag on publish → Publish release
     - 刪分支：`github.com/<owner>/<repo>/branches` → Your branches → 🗑️
4. 使用者完成後，Claude 以 `git fetch origin --prune --tags` 同步並 `ls-remote` 驗證

### 為什麼 CCR 封鎖這些操作

tag 與 ref 刪除是典型的「release / 破壞性」寫入，沙箱封鎖是為避免：
- AI 誤觸發下游 release pipeline（CI/CD 綁 tag 事件）
- AI 誤刪使用者的 feature 分支導致工作遺失

branch force update **未被封鎖**，推測理由：force push 本身不觸發 release pipeline，且「格式化 dev」這類合理場景需要它。這是刻意的安全設計，不是 bug，不要嘗試繞過被封鎖的部分。
