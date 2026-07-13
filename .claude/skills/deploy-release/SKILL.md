---
name: deploy-release
description: 部署與 git 推送規則。執行 git push、merge、tag、功能上線、hotfix 上線、修改部署設定（_worker.js / zbpack / .env）之前，必須先載入本 skill。
---

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

**commit 型別對照表**（git-guard 強制前綴格式；型別選擇依此表）：

| 前綴 | 用於 |
|---|---|
| `feat` | 新增使用者可感知的功能 |
| `fix` | 修正錯誤行為（改之前是壞的） |
| `refactor` | 行為不變的結構調整 |
| `chore` | 規則、設定、hook、腳本、雜務 |
| `docs` | 純文件（README、spec、context） |
| `test` | 純測試變更 |

**commit trailer 慣例**（change 22 教訓制度化：補強期間兩個 commit 因繞 heredoc 限制丟失
trailer，模型可追溯性中斷）：每個 AI session 的 commit 訊息結尾必附兩行 trailer（使用者
手動 commit 不強制）：

```
Co-Authored-By: Claude <模型名> <noreply@anthropic.com>
Claude-Session: <session 連結>
```

多行訊息寫法：heredoc（首行須是「type: 標題」）或多個 `-m` 分段（最後一個 `-m` 放 trailer）。

---

## main 分支限制（原 main.md 內容，已併入本檔）

⚠️ 在 main 分支時：**任何修改都直接影響真實用戶，謹慎操作。**

- 不在 main 上直接開發，只接受從**功能分支**（`m_b_*`）或 `hotfix` merge 的驗證過內容
- **⛔ 絕不從 dev 分支 merge 回 main**（dev 含未批准上線的功能）
- WIP 代碼、未測試功能 → 禁止 push 到 main
- DB 是正式資料，任何 schema 變動需額外確認
- 不接受實驗性代碼

> 即時提醒由 rules-injector（`branch === 'main'` 時注入警告）+ git-guard（main 直接 commit 產品程式碼 → deny）承擔，本節只是規則文字本身的單一事實來源。推送流程見下方「推送到 main（正式上線）」，不重複列出。

### 前端建置資訊（main 正式環境）

- main 分支的正式前端：`frontend/`（React + Vite + PWA，`public/` 已於 v2.0.0 刪除）
- 部署至：Cloudflare Pages（`kj-champion-system.pages.dev`）
- Build command：`cd frontend && npm install && npm run build`，output：`frontend/dist`

---

## README 撰寫標準（原 readme.md 內容，已併入本檔；規則已降級，見下方說明）

**降級後規則（change 22 起）：只在「功能上線」merge 進 main 時，必須完整重寫 README.md；功能分支中途 push 不需要。**（原規則「不論哪個分支、不論改了什麼，push 前都要重寫」已取消，過度要求且與其他規則衝突。）

README 必須精確反映**該分支目前的實際狀態**，不得有過時資訊。

### 各分支 README 撰寫重點

- **`main`（正式上線）**：目前版本號、正式部署網址與架構、完整功能清單（只列已上線功能）、環境變數說明、本機開發啟動方式
- **`m_b_功能名稱`（功能分支）**：此分支正在開發的功能說明、功能目標與實作方式、如何在本機測試此功能、與 main 的差異點

### 撰寫標準

README 必須包含以下區塊（依分支性質調整內容）：

```
# 專案名稱

> 版本 | 分支 | 部署網址

## 部署架構
## 主要功能
## 環境變數
## 本機開發
## 專案結構
```

### 嚴禁

- ❌ 複製上一次的 README 只改版本號
- ❌ 留有已移除功能的說明
- ❌ 留有已更換服務的舊網址
- ❌ 「功能上線」merge 進 main 前沒有更新 README

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
bash scripts/sync-branches.sh
git checkout <回到原分支>
```

README 重寫、CHANGELOG 更新：**不需要**（規則類更新不影響產品功能）。
機密檢查：仍然必做。
**`.claude/now.md` 更新：仍然必做**（main HEAD 變了就要更新，與本次規則變更同一個 commit）。

### 直推後刪功能分支（收尾必做，堵殭屍分支源頭）

若本次直推的內容原本在某條 `m_b_*`（或 CCR `claude/*`）功能分支上開發、且已 100% 進 main，
該功能分支上線後即成**殭屍分支**——與 workflow「功能上線＝merge + 刪分支」對齊，**規則類直推
也必須在同一批上線收尾中刪除來源分支**，差別只在直推不 merge、只 cherry-pick。

CCR 沙箱刪遠端分支會 403，一律交使用者於 Termius / PC 端執行自包含指令（見上方「tag push /
刪分支的正確流程」段的 403 fallback 原則）：

```
cd <repo 絕對路徑> && git push origin --delete <來源分支> && git fetch origin --prune
```

（change 28 教訓：change 26、27 兩次規則類直推都漏了這步，殭屍分支同內容不同 SHA 懸掛在遠端，
下次 `sync-branches.sh` 跑到時不是 conflict-stopped 卡關、就是被靜默灌一顆無意義的 merge commit。）

### main 推送後同步規則

**任何 push 到 main 之後，必須立即將 main merge 到所有 m_b_* 分支**，**包含遠端存在但本機未 checkout 的分支**，確保規則與基礎建設全域一致。此規則適用於所有 main 推送場景（規則直推、功能上線、hotfix）。

**⚠️ 執行前必須警告使用者：** merge 過程需要 checkout 各分支，若有 worktree 佔用的分支會先暫時移除 worktree，merge 完成後自動重建。請確認所有 worktree 內無未儲存的工作。

**`.claude/` 同步方式：** 不使用 post-checkout hook（已移除），改由 main merge 統一同步。

#### 同步流程（含遠端分支）

```bash
bash scripts/sync-branches.sh
```

唯一事實來源，涵蓋所有遠端 `m_b_*` 分支（不只本機）。驗證用途可先跑 `DRY_RUN=1 bash scripts/sync-branches.sh`。

#### 衝突處理策略（change 22 修訂：預設停下回報，不自動覆蓋）

若 m_b_* 分支與 main 有衝突（最常見：`frontend/package.json`、`frontend/package-lock.json` 兩邊各加自己的 dep），`scripts/sync-branches.sh` 預設行為是 **abort 該分支的 merge、記入失敗清單、停下交人工判斷**，不自動覆蓋分支內容。

只有在使用者已親自看過衝突內容、確認可以採 main 版本覆蓋時，才手動針對該次執行加上：

```bash
SYNC_STRATEGY=theirs bash scripts/sync-branches.sh
```

此模式下衝突分支才會用 `git merge main -X theirs --no-edit`。**副作用**：分支自己加的 dep 會被覆蓋。執行後必須在報告中**明列哪些分支用了 -X theirs、被覆蓋了什麼**，提醒使用者下次接手該分支時補裝缺失的 dep（例如 `npm install <pkg> --save-dev`）。

#### Bash 腳本陷阱

寫批次同步腳本時：

- ❌ `if git merge ... | tail -3` — `if` 取的是 pipeline **最後一個指令** 的 exit code，`tail` 永遠回傳 0，導致 merge 失敗也判定成功
- ✅ 改用 `git merge ... > /tmp/m.log 2>&1` 後直接 `if [ $? -eq 0 ]` 或 `if git merge ...; then`，輸出另外抓
- ❌ 用 `set -e` + 迴圈 — 一個分支失敗整個迴圈中斷，後面分支被跳過
- ✅ 每個分支 try/catch 化，失敗 abort 該次 merge 後繼續下個分支
- ✅ 最後用 `git rev-list --count "origin/<branch>..main"` 親自驗證每個分支 behind 數，**不可信任腳本內部的 SUCCESS 統計**

---

## 推送到 main（正式上線）

**功能分支 / hotfix merge 進 main 一律 `git merge --no-ff`**（保留分支結構供審計；fast-forward merge 會讓分支歷史在 `git log` 上消失，無法追溯是否走過功能分支流程）。

```bash
git merge --no-ff m_b_功能名稱
git push origin main
git tag X.Y.Z
git push --tags
```

> 功能上線的記錄類收尾（CHANGELOG / context / now.md）由收尾員子代理執行（模型分層工作證，change 23）。

### 上線確認訊息的指令紀律（v2.12.2 上線教訓）

給使用者的訊息中，**code block 只放「現在請你執行」的指令**：

- **預告類步驟**（agent 獲確認後要自己做的事）→ 用文字列點描述，**不放 code block**。
  手機上的 code block 就是「請執行」的視覺信號——v2.12.2 上線確認時把整套流程以指令碼
  預發，使用者照做，tag 在 merge commit 誕生前被提前打在舊 HEAD 上。
- **使用者手動步驟**（403 fallback 等）→ **輪到該步驟時才給**，一次一個 code block，
  前面固定寫「請你執行」，內容自包含（假設對方是全新 clone）。
- 確認階段只問「可以上線嗎？」＋文字描述流程；確認後 agent 自己執行，遇 403 才交出該步指令。

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

**403 fallback 指令必須自包含**：交給使用者的補做指令，必須假設對方在**全新 clone** 執行——
不得依賴沙箱本地狀態（本地 tag、本地分支、未推送的 commit）。tag 補做範本（SHA 必須明確給出）：

```
git fetch origin main
git tag vX.Y.Z <merge commit SHA>
git push origin vX.Y.Z
```

（change 24 教訓：沙箱本地 tag 推送吃 403 後，只給使用者 `git push origin vX.Y.Z` 一行，
使用者端沒有這個 tag，失敗 `src refspec does not match any`。）

### CCR 環境已知的 403 操作（供參考）

| 操作 | 結果 |
|---|---|
| `git push origin <tag>` | ❌ 403 |
| `git push origin --delete <branch>` | ❌ 403 |
| Push commit 到既有分支 | ✅ 通過 |
| `git push origin --force-with-lease` | ✅ 通過 |
| 建立新分支 | ✅ 通過 |

### SSH 簽章與本地驗證（CCR 沙箱）

CCR 沙箱由平台自動配置 SSH commit 簽章（`commit.gpgsign=true`、金鑰平台代管），每個 commit 預設已簽。
但沙箱缺 `gpg.ssh.allowedSignersFile`，`git log --show-signature` 一律報錯並顯示 N——
這是「**無法驗證**」不是「沒有簽」。

⛔ 不得因本地顯示 N / 工具回報「缺簽章」而 rebase 重簽或重寫歷史（change 24 曾因此白工重簽
4 個 commit）；簽章真偽一律以 GitHub commit 頁的 Verified badge 為準。
