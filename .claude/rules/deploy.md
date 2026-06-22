# Deploy Rules — git 操作或觸碰設定檔時注入

## Zeabur 雙專案部署架構（v2.1.0 起）

| 環境 | Zeabur 專案 | 服務 | 公網 |
|---|---|---|---|
| **prod** | `kj-champion` | `postgresql`（內網 only）+ `kj-champion-system`（後端，main branch） | DB 公網**關閉**、後端公網開（Cloudflare Pages 走後端公網入口） |
| **dev** | `kj-champion-dev` | `postgresql-dev`（公網開）+ `kj-champion-dev`（後端，m_b_* 功能分支） | 全部開（PC + Cloudflare Pages preview 都連得到） |

dev 後端 URL：`kj-champion-dev.zeabur.app`（v2.1.0 起，舊 `kj-champion-system-dev.zeabur.app` 已廢棄）

→ 前端 `_worker.js` 的 `resolveBackend()` 依 hostname 判斷 prod / dev 後端入口。

---

## 所有分支共用（必做）

### 推送前必做
1. **更新 `.claude/now.md`**（推 main 前強制 — 不論完整版本上線、hotfix、或規則類直推都適用）：
   - 「最近推送」段落寫本次推送內容摘要（一兩句）
   - `.claude/now.md` 變更與本次推送變更同一個 commit（不要分兩個 commit），避免 main 上 now.md 永遠落後
   - **此規則的存在原因**：使用者反覆糾正過「main HEAD 變了 now.md 沒跟上」，下次新對話一開啟讀到落後的 now.md 會誤判進度
2. **完整重寫 `README.md`**（每次「功能上線到 main」必做，不是選擇性。規則類直推 main 不需要）：
   - 重新撰寫技術架構、功能清單、專案結構、部署說明
   - 頂部版本號更新為本次版本
   - 確保反映目前程式碼實際狀態，刪除過時資訊
3. **機密檢查**：
   - 確認 `.gitignore` 包含：`.env`、`.env.backup`、`Key/`、金鑰 `*.json`
   - 執行 `git status`，確認機密檔案不在清單中
   - 搜尋：長 Token、`-----BEGIN PRIVATE KEY-----`、寫死帳號密碼
4. **列出推送項目清單給使用者確認**，未確認不得執行 `git push`

### git 指令規範

```bash
git add <具體檔案>   # 禁止 git add -A，避免意外加入機密
git commit -m "feat/fix/chore: ..."
```

---

## 規則類更新 — 直推 main

以下類型的變更屬於「規則 / 基礎建設」，可在任何分支 commit 後直接 cherry-pick 到 main 並 push：

- `.claude/` 內所有檔案（rules、commands、context、settings）
- `.gitignore`
- `scripts/` 中的工具腳本（非業務邏輯）
- `CLAUDE.md`、`CHANGELOG.md`

**不得直推 main 的變更**（必須走功能分支 → merge 流程）：

- 功能程式碼（`server/`、`frontend/`）
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
# 同步到所有 m_b_* 分支
for branch in $(git branch --list 'm_b_*'); do git checkout "$branch" && git merge main; done
git checkout <回到原分支>
```

README 重寫、CHANGELOG 更新：**不需要**（規則類更新不影響產品功能）。
機密檢查：仍然必做。
**`.claude/now.md` 更新：仍然必做**（main HEAD 變了就要更新，與本次規則變更同一個 commit）。

### main 推送後同步規則

**任何 push 到 main 之後，必須立即將 main merge 到所有 m_b_* 分支**，**包含遠端存在但本機未 checkout 的分支**，確保規則與基礎建設全域一致。此規則適用於所有 main 推送場景（規則直推、功能上線、hotfix）。

**⚠️ 執行前必須警告使用者：** merge 過程需要 checkout 各分支，若有 worktree 佔用的分支會先暫時移除 worktree，merge 完成後自動重建。請確認所有 worktree 內無未儲存的工作。

**`.claude/` 同步方式：** 不使用 post-checkout hook（已移除），改由 main merge 統一同步。

#### 同步流程（含遠端分支）

```bash
git fetch origin --prune
# 列出所有遠端 m_b_* 分支（不只本機）
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

1. **更新 `.claude/now.md`**（main HEAD + 本版重點，與本次推送同 commit）
2. 更新 `CHANGELOG.md`（最上方加入新版本，舊版保留）
3. 建立 `.claude/context/vX.Y.Z.md`（本版詳細上下文）
   - **命名規則**：必須加 `v` 前綴（`v2.1.0.md`，不是 `2.1.0.md`）
   - **強制同步**：`.claude/context/vX.Y.Z.md` 必須與 `git tag vX.Y.Z` **在同一次 push 前建立**，不得事後補建
   - context 檔建立後加入 git add，與 CHANGELOG / `.claude/now.md` 合為同一個 commit，再 push → tag
   - **必填段落**（依序）：
     1. **背景**：為什麼要做這個版本？使用者原始需求 / 痛點 / 觸發原因
     2. **改動檔案**：每個新增/修改/刪除的檔案，一行說明「為什麼改這個」（不只是「改了什麼」）
     3. **關鍵設計決策**（有的話）：非直覺的選擇、取捨說明、為什麼不用更簡單的方案
     4. **學習日誌**（本版遇到的坑）：每個問題一節，格式固定：
        ```
        ### 問題 N：[標題]
        **遇到的問題**：[現象/錯誤]
        **試過的方法**：[每個方法 + 為什麼沒用]
        **最終解法**：[具體做法]
        **根本原因**：[為什麼會發生]
        ```
        沒遇到問題的版本可省略此段；有問題必填，這是最有價值的記錄
     5. **驗證結果**：怎麼確認功能正常（日誌截圖、測試輸出、手動驗收步驟）
     6. **後續注意**（有的話）：未處理的風險、後續版本需留意的事
4. README 完整重寫
5. 機密檢查
6. 使用者**明確確認**後才執行（最高確認要求）
7. `git tag vX.Y.Z && git push --tags`（注意：tag 名稱必須加 `v` 前綴）

---

## ⚠️ CCR 沙箱 git 限制（僅限 CCR 環境）

**環境判定**：`env` 含 `CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE` 或 `CCR_TEST_GITPROXY=1`，或 `git remote -v` 指向 `127.0.0.1:<port>/git/...`。**非 CCR 環境（本機 Claude Code desktop / VS Code extension）不受此限制。**

### tag push / 刪分支的正確流程

**預設行為（含非 CCR 環境）**：Claude 直接執行，不預先叫使用者手動：

```bash
git tag vX.Y.Z <commit>
git push origin vX.Y.Z
git push origin --delete <branch>
```

執行後用 `git ls-remote --tags origin` / `git ls-remote --heads origin` 驗證是否成功。

**只有在收到 403 時**，才告知使用者手動補做：
- **本機終端機**：直接給指令
- **GitHub Web UI**：Tag → Releases → Create new tag；刪分支 → Branches → 🗑️

### CCR 環境已知的 403 操作（供參考）

| 操作 | 結果 |
|---|---|
| `git push origin <tag>` | ❌ 403 |
| `git push origin --delete <branch>` | ❌ 403 |
| Push commit 到既有分支 | ✅ 通過 |
| `git push origin --force-with-lease` | ✅ 通過 |
| 建立新分支 | ✅ 通過 |
