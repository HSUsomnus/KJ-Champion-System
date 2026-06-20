# 工作流規則 — 所有分支共用，每次 Edit/Write 自動注入

## OpenSpec 文件職責分工

| 文件 | 職責 | 內容範圍 |
|------|------|---------|
| `openspec/STATUS.md` | **路線圖導航**，每次對話的起點 | 所有 change 的編號、名稱、狀態（DONE / IN PROGRESS / ARCHIVED）、一句話說明。**不含 task 細節** |
| `openspec/changes/NN-名稱/spec.md` | 該 change 的需求 + 技術設計 | 使用者需求、技術方案、邊界定義 |
| `openspec/changes/NN-名稱/tasks.md` | 該 change 的實作清單 | 可勾選的 task（`[ ]` / `[x]`），含測試 task，進度唯一來源 |

> **原則**：task 進度只在 `tasks.md` 追蹤。STATUS.md 只更新 change 層級的狀態（整個 change 從 IN PROGRESS → DONE），不同步個別 task。

---

## 關鍵字觸發一覽

| 關鍵字 | 觸發動作 |
|--------|---------|
| **「新功能」** | 進入需求探索模式 → Claude 主動提問釐清需求 → 使用者說「完成」→ 生成計畫並切分支（見下方） |
| **「修改計畫」** | 確認分支 → 只動 OpenSpec 文件 |
| **「執行計畫」** | 確認分支 → 照 tasks 實作程式碼（**蓋一層測一層**：每個 task source + 對應 test 一起做、跑該層測試、全綠才勾 [x] 進下一 task；section milestone 跑全套 regression） |
| **「修 bug」** | 從 main 切 hotfix，視情況開 change |
| **「測試功能」** | **Claude 自動觸發**（m_b_* 實作 / 規範 task 全完成 + milestone regression 全綠後）→ merge dev → push → 使用者實機驗收。使用者打字為 fallback |
| **「功能上線」** | merge 到 main，關 change，刪分支 |
| **「格式化 dev」** | dev force-reset 至 main + 盤點確認 + 重寫 dev README（見下方） |

---

## 「新功能」完整流程

### 第一階段：需求探索（Explore）

1. Claude 主動詢問功能名稱（若未提供）
2. Claude 針對以下面向逐一提問，每次 **最多問 2～3 個問題**，不一次轟炸：
   - **目標使用者**：誰會用這個功能？什麼角色？
   - **核心情境**：使用者遇到什麼問題、想達成什麼？
   - **功能邊界**：這個功能做什麼、不做什麼？
   - **UI / 互動**：有沒有想像中的畫面或操作方式？
   - **資料與 API**：需要新的資料表、欄位、或後端 API 嗎？
   - **限制與例外**：角色限制、邊界 case、錯誤處理？
3. 使用者回答後 Claude 繼續追問，直到需求足夠清晰
4. Claude 最後整理**需求摘要**（條列式），問使用者：「需求是否完成？」
5. 使用者回覆「完成」→ 進入第二階段

### 第二階段：建立計畫與分支

6. 建立分支並推遠端：
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

7. 在 `openspec/changes/` 建立新 change 資料夾，依序產生：
   - `spec.md`（需求摘要 + 技術設計，從探索對話整理而來）
   - `tasks.md`（可勾選實作清單，含測試 task）
   - 更新 `openspec/STATUS.md`
8. 告知使用者：「分支 `m_b_功能名稱` 已建立，spec 已產生，說『執行計畫』開始實作」

---

## 「修改計畫」流程

> **第一步永遠是確認 change 與分支**

1. **若使用者未指定要修改哪個 change** → 讀 `openspec/STATUS.md`，列出所有 IN PROGRESS 的 change，詢問使用者：「請問要修改哪一個 change 計畫？」，等使用者回覆後才繼續
2. 確認對應分支：執行 `git branch --show-current`
3. 若在 `main` 或 `dev` → **強制停止**：
   > ⛔ 目前在 `[分支名]`，請先切換到對應功能分支（`m_b_*`）再修改計畫。
4. 若在 `m_b_*` → 顯示：「目前在 `m_b_XXX`，確認繼續修改計畫？」
5. 使用者確認後才繼續：
   - 讀該 change 的 `spec.md` 與 `tasks.md`
   - 依序更新：`spec.md` → `tasks.md`
   - 若 change 整體狀態有變（如從 IN PROGRESS → DONE）→ 才更新 `STATUS.md` 路線圖那一行
   - 禁止直接改 `tasks.md` 新增需求（需先改 `spec.md`）
   - **禁止把 task 細節寫進 STATUS.md**（STATUS.md 只記 change 層級狀態）

---

## 「執行計畫」流程

> **第一步永遠是確認 change 與分支**
> **核心原則**：蓋一層測一層 — 每個 task 完成必跑對應測試，全綠才勾 [x] 進下一 task，避免整棟蓋好才測時找不到問題在哪層

1. **若使用者未指定要執行哪個 change** → 讀 `openspec/STATUS.md`，列出所有 IN PROGRESS 的 change，詢問使用者：「請問要執行哪一個 change 計畫？」，等使用者回覆後才繼續
2. 確認對應分支：執行 `git branch --show-current`
3. 若在 `main` 或 `dev` → **強制停止**：
   > ⛔ 目前在 `[分支名]`，請先切換到對應功能分支（`m_b_*`）再執行計畫。
4. 若在 `m_b_*` → 顯示：「目前在 `m_b_XXX`，確認繼續實作？」
5. 使用者確認後才繼續：
   - 讀該 change 的 `tasks.md` 確認當前執行位置
   - 找到下一個未完成（`[ ]`）且前置已完成（`[x]`）的 task
   - **只實作當前 task，不跳躍、不超範圍**

### 每個 task 的內部流程（蓋一層測一層）

a. **寫 source code**（jsx / js / 後端 service 等，需要時可多輪 Edit）
b. **同步寫 / 補對應測試**（依 task 類型，**Claude 主動，不等使用者要求**）：
   | task 類型 | 測試檔位置 | 測試類型 |
   |---|---|---|
   | 新元件 `frontend/src/components/<dir>/Foo.jsx` | `<dir>/__tests__/Foo.test.jsx` | vitest unit |
   | 新 utility `frontend/src/utils/Foo.js` | `frontend/src/utils/__tests__/Foo.test.js` | vitest unit |
   | 改 page 流程（含表單、彈窗、跳轉等使用者互動） | `frontend/e2e/<spec>.spec.js`（新或補 case） | playwright e2e |
   | 改既有元件 / utility | 跑既存 test 檔，必要時補 case | vitest |
   | 純 OpenSpec 文件、規則檔、README | — | 跳過此步 |
c. **跑該層測試**（**Claude 自動跑，不等使用者要求**）：
   - vitest 全跑（3 秒）：`npm --prefix frontend run test:run`
   - 或指定檔加速：`npm --prefix frontend run test:run -- <檔路徑>`
   - 涉及 page 流程：`npm --prefix frontend run test:e2e`
d. **全綠才勾 [x]、更新 `tasks.md`、進下一 task**（STATUS.md 不在此更新，只有 change 整體完成時才動）
e. **fail 時不勾、不進下一 task** — 先修

### Section milestone（一個 section 全勾後，如 1.x / 2.x / 3.x 完成）

跑**全套** regression（**Claude 自動跑**）：
- `npm --prefix frontend run test:run`（vitest 全部）
- `npm --prefix frontend run test:e2e`（playwright 全部，視 change 性質）

全綠 → 進下個 section；fail → 修。

### 為什麼 milestone 不能省（整合衝突 catch）

單檔測試只能驗「這層自己對」，**不能驗「這層 + 前面層」的組合對**。Section milestone 跑全套就是抓「**單獨 OK、組合壞**」的整合衝突。

**真實案例（12 change 7.1 task）**：
- 前面 vite@8 用了好幾個月 ✅
- 7.1 task 加 `vitest@4` + 寫 3 行 sanity test
- vitest run 立刻 fail：`Cannot read properties of undefined (reading 'config')`
- 排查方向：sanity test 3 行不可能錯，問題在 **vitest@4 與 vite@8 整合不相容**
- 修法：降 vitest 到 `v3.2.4`
- 教訓：「前面驗過」≠「組合也驗過」

### Fail 排查順序

1. **先看 fail 訊號落在哪**（哪個 test 哪一行）
2. **起點**：當前 task 引入了什麼新東西（新檔 / 新依賴 / 新設定）
3. **不要排除前面層** — 看當前 task 跟前面有什麼接觸（依賴版本、設定相容、API 假設）
4. **但範圍仍縮在「當前 task 接觸的鄰近結構」** — fail 訊號告訴你 trigger 是哪個，不必從頭排查整棟
5. 修完該層 → 重跑該層測試 → 通過才繼續

---

## 「測試功能」流程

> **觸發時機（自動為主）**：
> - **自動**：Claude 偵測到 m_b_* 上實作 / 規範 task 全 [x]，且最後一個 section milestone 全綠 → 自動進入此流程，**不需使用者打「測試功能」**
> - **手動**：使用者打「測試功能」明確要求（fallback）
>
> **核心分工**：m_b_* 跑**自動化測試**（Vitest + Playwright，邏輯 / 視覺 inline style 對錯）；dev 站做**真實環境手動驗收**（PWA install、視覺感受、跨裝置、真實 API）。兩軌互補。

### 第零步：確認 change（手動觸發時）

**若使用者未指定要測試哪個 change** → 讀 `openspec/STATUS.md`，列出所有 IN PROGRESS 的 change，詢問使用者：「請問要測試哪一個 change？」，等使用者回覆後才繼續。

### 第一步：自動化測試 + 產出測試報告（Claude 自動跑）

```bash
npm --prefix frontend run test:run     # vitest 全部
npm --prefix frontend run test:e2e     # playwright 全部（純後端 change 可跳過）
```

執行完畢後，Claude **必須產出測試報告**，格式如下：

```
## 測試報告 — [change 名稱]

### 自動化測試結果
- ✅ vitest：X 個通過 / ❌ X 個失敗
  - ❌ [失敗項目名稱]：[原因]
- ✅ playwright e2e：X 個通過 / ❌ X 個失敗
  - ❌ [失敗項目名稱]：[原因]

### 需要人眼測試的項目（請依序操作）

- [ ] **[項目名稱]**
  - 測試環境：[kjcs-dev.pages.dev](https://kjcs-dev.pages.dev)
  - 測試前準備：DevTools → Application → Service Workers → Unregister
  - 測試步驟：
    1. 開啟 [URL] 或操作 [動作]
    2. 預期結果：[描述應該看到什麼]
    3. 實際填寫：✅ 正常 / ❌ 異常（描述）

- [ ] **[其他項目]**
  ...

### 自動化無法涵蓋的常見項目（視 change 性質勾選適用）
- [ ] PWA install standalone 模式（Chrome 桌面右上 install icon → 點擊安裝 → 確認以獨立視窗開啟）
- [ ] 真實 LINE OAuth（登出 → 重新登入 → 確認 redirect 正確）
- [ ] Web Share API（手機點分享 → 確認原生分享面板出現）
- [ ] 跨裝置視覺（手機 PWA / 桌面 Chrome / iOS Safari 各看一遍）
- [ ] 視覺感受（顏色協調、字體渲染、動畫流暢度）
```

任一自動化 fail → **不繼續**，回 m_b_* 修，重跑全套 → 通過才繼續。

### 第二步：詢問是否 merge dev

Claude 產出測試報告後，**詢問使用者**：
> 「自動化測試已通過，以上人眼測試清單請你依序完成。完成後告訴我，我再 merge dev 讓你到 [kjcs-dev.pages.dev](https://kjcs-dev.pages.dev) 做最終驗收。是否現在 merge dev？」

使用者確認後才執行：

```bash
git checkout dev
git pull origin dev
git merge origin/m_b_功能名稱 --no-edit
# 更新 dev README「dev 分支獨有」段落（依 .claude/rules/readme.md dev 分支格式）
git push origin dev   # ← push 前 Claude 必須給使用者列改動清單，獲口頭 OK 才執行
```

### 第三步：dev 站最終手動驗收（使用者執行）

使用者依照測試報告的人眼清單，在 [kjcs-dev.pages.dev](https://kjcs-dev.pages.dev) 逐項確認。

**測試前必做**：DevTools → Application → Service Workers → Unregister，避免舊 SW 快取干擾。

全項目 ✅ 才能進「功能上線」流程；任一 ❌ → 回 m_b_* 修 → 重跑自動化 → 重新 merge dev → 重新驗收。

### ⛔ 嚴禁

- 自動化測試 fail 時直接 merge dev
- 跳過 dev 站手動驗收直接「功能上線」（自動化不能取代人眼）
- 在 dev 上修問題（dev 是測試環境，修了沒同步回 m_b_* 下次合會把 bug 再帶回來。詳見「修 bug」流程 B 路徑）

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

1. **若使用者未指定要上線哪個 change** → 讀 `openspec/STATUS.md`，列出所有 IN PROGRESS 的 change，詢問使用者：「請問要上線哪一個 change？」，等使用者回覆後才繼續
2. **再次確認測試狀態**：詢問使用者：「請確認你已完成 dev 站人眼驗收，所有測試項目皆 ✅？」，使用者明確回覆「完成」後才繼續
3. 確認該 change 的所有 tasks 皆為 `[x]`
4. 執行 deploy.md 的推送流程（CHANGELOG / context / README / 機密檢查 / 使用者明確確認 / merge main / tag）
5. 將 `openspec/STATUS.md` 的 change 標為 DONE
6. 刪除功能分支（本機 + 遠端）

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

- **改 HOW**（方法變，範圍不變）：合法，更新 spec.md + tasks.md，change 不擴大
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
- ❌ 只改程式碼不更新 `tasks.md`（STATUS.md 只在 change 整體狀態變動時才更新）
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

---

## 雙裝置工作流（PC + 手機 Claude Code Web）

- **PC**：複雜重構、實機 UI 驗證、跑 `npm test` / `pg_dump`、tag 建立、刪分支（手機 CCR 沙箱會 403）
- **手機**：駕駛等候時段主力產出、新功能 scaffolding、OpenSpec 文件、小修
- **同步管道是 git**：兩裝置進度靠 GitHub 主分支 / `.claude/now.md` / OpenSpec STATUS 共享，不靠 Claude session 記憶

---

## 程式碼決策規範

實作涉及非直覺選擇時，在程式碼上方加註：

```js
// [設計決策] 簡短描述這個選擇
// 原因：為什麼不用更直覺的方式
// 若要修改：請先確認 spec.md 的技術設計區塊
```

適用：繞過 library 預設行為、刻意不用更簡單方案、與一般慣例不同的實作。
