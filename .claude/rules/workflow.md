# 工作流規則 — 所有分支共用，每次 Edit/Write 自動注入

## 關鍵字觸發一覽

| 關鍵字 | 觸發動作 |
|--------|---------|
| **「新增功能 [名稱]」** | 切分支 + 開 OpenSpec change（見下方） |
| **「修改計畫」** | 確認分支 → 只動 OpenSpec 文件 |
| **「執行計畫」** | 確認分支 → 照 tasks 實作程式碼 |
| **「修 bug」** | 從 main 切 hotfix，視情況開 change |
| **「測試功能」** | merge 功能分支到 dev，push |
| **「功能上線」** | merge 到 main，關 change，刪分支 |
| **「格式化 dev」** | dev force-reset 至 main + 盤點確認 + 重寫 dev README（見下方） |

---

## 「新增功能」完整流程

1. 詢問功能名稱（若未提供）
2. 建立分支並推遠端：
   ```bash
   git checkout main
   git checkout -b m_b_功能名稱
   git push origin m_b_功能名稱
   ```

   > **前後端分支策略**：若功能同時涉及前端（`frontend/`）和後端（`server/`），
   > 必須建立兩個獨立分支，避免測試修改時程式碼互相污染：
   >
   > ```bash
   > git checkout main
   > git checkout -b m_b_功能名稱_backend
   > git push origin m_b_功能名稱_backend
   > git checkout main
   > git checkout -b m_b_功能名稱_frontend
   > git push origin m_b_功能名稱_frontend
   > ```
   >
   > - OpenSpec change 共用一份，tasks 中標註所屬分支（backend / frontend）
   > - 測試：各自 merge 到 dev 驗證，**後端先驗證，通過後才驗證前端**
   > - 上線：依序 merge 到 main（後端先於前端）

3. 在 `openspec/` 建立新 change：`proposal.md` → `design.md` → `tasks.md` → `STATUS.md`
4. 告知使用者：「分支 `m_b_功能名稱` 已建立，OpenSpec change 已開，說『執行計畫』開始實作」

---

## 「修改計畫」流程

> **第一步永遠是確認分支**

1. 執行 `git branch --show-current`
2. 若在 `main` 或 `dev` → **強制停止**：
   > ⛔ 目前在 `[分支名]`，請先切換到對應功能分支（`m_b_*`）再修改計畫。
3. 若在 `m_b_*` → 顯示：「目前在 `m_b_XXX`，確認繼續修改計畫？」
4. 使用者確認後才繼續：
   - 讀 `openspec/STATUS.md` 確認當前 change
   - 依序更新：`proposal.md` → `design.md` → `tasks.md` → `STATUS.md`
   - 禁止直接改 `tasks.md` 新增需求（需先改 `proposal.md`）

---

## 「執行計畫」流程

> **第一步永遠是確認分支**

1. 執行 `git branch --show-current`
2. 若在 `main` 或 `dev` → **強制停止**：
   > ⛔ 目前在 `[分支名]`，請先切換到對應功能分支（`m_b_*`）再執行計畫。
3. 若在 `m_b_*` → 顯示：「目前在 `m_b_XXX`，確認繼續實作？」
4. 使用者確認後才繼續：
   - 讀 `openspec/STATUS.md` 確認當前執行位置
   - 找到下一個未完成（`[ ]`）且前置已完成（`[x]`）的 task
   - **只實作當前 task，不跳躍、不超範圍**
   - 完成後更新 `tasks.md`（勾 `[x]`）與 `STATUS.md`

---

## 「修 bug」流程（hotfix）

### ⚠️ 第一步永遠是「判斷 bug 來源」— 決定走哪條路徑

**hotfix 只用於修 main 上的 bug**（main 已上線出問題）。dev 上發現的問題**不要修 dev**，要追溯到引入 bug 的 m_b_* 分支去修，再 merge 回 dev 重測。**理由：m_b_* 分支的 bug 沒修就 merge main 會出大事，必須在源頭修才能確保 dev → main 路徑安全**。

#### 判斷決策樹

收到 bug 報告或在 dev 看到問題時，先做這個檢查：

```
1. git diff origin/main..origin/dev -- <出問題的檔案>
   → 兩邊一樣？                    → bug 在 main，走 A 路徑（hotfix）
   → 不一樣？dev 比 main 新？      → bug 來自某個合進 dev 的 m_b_*，走 B 路徑（修 m_b_*）

2. 若 dev 比 main 新：用 git log / git blame 找到 bug 從哪個 m_b_* 進來的：
   git log --oneline origin/main..origin/dev -- <檔案>
   → 看哪個 m_b_*_* 分支的 commit 引入了 bug
```

#### A 路徑：bug 來自 main → hotfix

1. 從 main 切出 hotfix 分支：
   ```bash
   git checkout main
   git checkout -b hotfix/描述
   git push origin hotfix/描述
   ```
2. 在 hotfix 分支上修復 bug（可能多次 commit）
3. 修復完成後走 deploy.md 的「推送到 main」完整流程（CHANGELOG / context / README / 機密檢查 / 使用者確認 / merge / tag）
4. 刪除 hotfix 分支（本機 + 遠端）：
   ```bash
   git branch -d hotfix/描述
   git push origin --delete hotfix/描述
   ```
5. 將 main 同步到所有其他本機分支（`dev`、`m_b_*`）：
   ```bash
   git checkout dev && git merge main
   for branch in $(git branch --list 'm_b_*'); do git checkout "$branch" && git merge main; done
   git checkout main
   ```

> **注意**：步驟 3～5 是連續動作，hotfix 合併 main → 刪除 hotfix → main 同步到其他分支。不要在 hotfix 尚未刪除時就開始同步。

#### B 路徑：bug 來自 m_b_*（dev 上發現的）→ 修對應 m_b_* 分支

1. 找到引入 bug 的 m_b_* 分支：
   ```bash
   git log --oneline origin/main..origin/dev -- <檔案> | head
   # 看哪個 m_b_*_*  的 commit 引入問題
   ```
2. 切到該 m_b_* 分支修復：
   ```bash
   git checkout m_b_有bug的功能分支
   git pull
   # 修 → commit → push
   ```
3. 重新 merge m_b_* 到 dev 重測：
   ```bash
   git checkout dev
   git merge m_b_有bug的功能分支
   git push origin dev
   ```
4. dev 重新驗證
5. **完全不要動 main、不要切 hotfix**，因為這個 bug 還沒進 main，只在 dev/m_b_* 範圍

#### ⛔ 嚴禁

- ❌ 在 dev 上直接修（dev 是測試環境，修了沒同步回 m_b_*，下次 m_b_* merge 會把 bug 再帶回來）
- ❌ 用 hotfix 修 m_b_* 引入的 bug（hotfix 是給 main 的）
- ❌ 沒判斷 bug 來源就動手

---

## 「功能上線」流程

1. 確認所有 tasks 皆為 `[x]`
2. 執行 deploy.md 的推送流程
3. 將 STATUS.md 的 change 標為 DONE
4. 刪除功能分支

---

## 「格式化 dev」流程

> **哲學**：dev 是測試環境，壞掉很正常。不修復、不深究，直接重置最快。
> dev 的歷史本來就是拋棄式的（規則已禁止 dev merge 回 main），所以歸零無損失。

### Claude 主動觸發條件

偵測到以下任一情況時，**Claude 必須主動建議使用者**執行「格式化 dev」，不要浪費時間 debug：

- dev 上出現可能導致整個專案崩潰的錯誤（白屏、React Router ErrorBoundary 連環觸發、PWA Service Worker 快取錯配等）
- dev 累積大量 hotfix merge 殘留 / debug commit / 已廢棄實驗歷史
- bundle chunk 新舊錯配（某 API 方法「理論上存在但執行時找不到」這類徵兆）
- 功能分支 merge 後 dev 出現無關領域的壞掉（幾乎必定是歷史污染）

**不要嘗試在 dev 上修復這類問題** — 所有 dev 專屬的修復都是丟棄物，正確的修復應該在對應的 `m_b_*` 或 `hotfix` 分支上做。

### 執行流程

```bash
# 0. 先盤點（確認無資料損失）
git fetch origin --prune
git log origin/main..origin/dev --no-merges --oneline
# 對每個領先 commit 確認：
#   - 存在於某個 m_b_* 分支（安全） ✅
#   - 內容已合進 main（安全，只是歷史訊息會消失） ✅
#   - 僅活在 dev 且 main 無等價檔案 → ⚠️ 停下，cherry-pick 到新分支保留再繼續

# 1. 格式化
git checkout dev
git fetch origin
git reset --hard origin/main
git push origin dev --force-with-lease

# 2. 更新 dev 專屬 README（功能分支總表歸零）
#    依 .claude/rules/readme.md 的 dev 分支格式撰寫

# 3. 更新 NOW.md — 記錄格式化原因、HEAD SHA、待重新合入的 m_b_* 清單

# 4. 普通 commit + push dev
```

### 盤點檢查清單（Claude 執行格式化前必跑）

對每個 `origin/main..origin/dev` 的非 merge commit 驗證：

```bash
for h in <commit-hashes>; do
  git branch -r --contains $h
done
```

| 狀態 | 判定 | 行動 |
|---|---|---|
| 活在 `m_b_*` 遠端分支 | ✅ 安全 | 格式化後重新 merge |
| 活在 `main`（透過其他路徑已進去） | ✅ 安全 | 無需處理 |
| 僅在 dev 且 main 無等價檔案 | ⚠️ 會遺失 | **停下告知使用者**，決定是否保留 |

### 格式化後回報使用者

1. dev 新 HEAD SHA
2. 所有 `m_b_*` 分支的去留清單（全部保留）
3. Cloudflare Pages 預期會觸發新 deployment（解掉 SW 快取問題）
4. 提醒使用者清 Service Worker 驗證

---

## Change 範圍控制

- **改 HOW**（方法變，範圍不變）：合法，更新 design.md + tasks.md，change 不擴大
- **改 WHAT**（範圍擴大）：修改計畫時若需新增超過 2 個 task → 停下詢問使用者是否開新 change

---

## 分支架構

```
main      ← 正式上線，只接受 m_b_* / hotfix merge
  ├─ m_b_*            ← 純前端或純後端功能分支
  ├─ m_b_*_backend    ← 前後端功能的後端分支
  └─ m_b_*_frontend   ← 前後端功能的前端分支
dev       ← QA 測試，絕不 merge 回 main
hotfix    ← 緊急修復，從 main 切出
```

---

## 嚴禁行為

- ❌ 未確認分支就動程式碼或文件
- ❌ 在 `main` 或 `dev` 直接開發（`.claude/` 修改除外）
- ❌ 將 `dev` merge 回 `main`
- ❌ 功能分支只建本機不 push 到遠端
- ❌ 診斷問題時順手實作（診斷 ≠ 授權修改）
- ❌ 只改程式碼不更新 `tasks.md` / `STATUS.md`
- ❌ 使用 `git add -A`
- ❌ 將 `.claude/` 修改與功能程式碼混在同一個 commit

---

## .claude/ 特殊規則

**.claude/ 是全域設定，所有分支必須同步。main 是唯一來源。**

### 修改流程（任何分支皆同）

任何分支上只要修改了 `.claude/` 內的任何檔案，**立即單獨處理**：

```bash
git add .claude/<修改的檔案>
git commit -m "chore: 更新 .claude/..."
git checkout main
git cherry-pick <commit hash>
git push origin main          # ← 必須立即 push，確保遠端同步
git checkout <回到原分支>
```

### 同步機制

- **來源**：`main` 是 `.claude/` 的唯一真實來源，永遠只從 main 傳播，不逆流
- **同步方式**：push main 後，立即將 main merge 到所有本機分支（取代舊的 post-checkout hook）
- **確保所有分支一致**：修改後必須 push main，再執行全分支 merge

---

## 錯誤處理

- 只顯示實際錯誤（`err.message`、`err.code` 或 API 回傳訊息）
- 功能失敗不 fallback 成其他行為，只顯示錯誤
- 不自行加「失敗」「錯誤」等總結文字

---

## STATUS.md 格式（含手動操作步驟）

當 change 包含**外部平台操作**（Zeabur、Cloudflare Pages、LINE Console 等），STATUS.md 的「待完成」區塊必須標明：

1. **負責人**：「使用者手動」或「Claude 程式碼」
2. **操作平台**：在哪個 dashboard 執行
3. **具體步驟**：明確到「去哪裡按什麼」

```
### ⬜ 待完成

- [ ] **025.3 Zeabur 建立正式後端服務**（使用者手動 — Zeabur Dashboard）
  1. Zeabur → Projects → 新增 Service → Git
  2. 選擇 repo，Branch 設為 `main`
  3. 記下產生的 domain（供後續步驟使用）

- [ ] **025.12 更新 _worker.js**（Claude 程式碼）
  - 等 025.3 完成，取得 URL 後由 Claude 修改
```
