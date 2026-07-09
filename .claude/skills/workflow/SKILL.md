---
name: workflow
description: 功能開發完整流程（新功能／修改計畫／執行計畫／測試功能／修 bug／功能上線 六個關鍵字流程與分支策略）。使用者說出任一關鍵字、或開始任何實作與計畫動作之前，必須先載入本 skill。
---

# 工作流規則 — 所有分支共用，每次 Edit/Write 自動注入

## 文件職責分工

| 文件 | 職責 | 內容範圍 |
|------|------|---------|
| `changes/NN-名稱/spec.md` | 該 change 的需求 + 技術設計 | 使用者需求、技術方案、邊界定義 |
| `changes/NN-名稱/tasks.md` | 該 change 的實作清單 | 可勾選的 task（`[ ]` / `[x]`），進度唯一來源 |

> 無全域 STATUS.md。進行中的 change 由分支本身（`m_b_*`）體現。
> 新 change 編號 = `changes/` 底下現存最大編號 + 1。

---

## 關鍵字觸發一覽

| 關鍵字 | 觸發動作 |
|--------|---------|
| **「新功能」** | 需求探索 → 前端 UI 直接畫 mockup → 使用者說「完成」→ 直接建 spec.md → 詢問是否建 task.md |
| **「修改計畫」** | 確認分支 → 只動 spec.md / tasks.md 文件 |
| **「執行計畫」** | 確認分支 → 蓋一層測一層（每個 task Unit Test 全綠才勾；section 完成跑 Integration/API Test） |
| **「修 bug」** | 從 main 切 hotfix，修完 merge main |
| **「測試功能」** | **Claude 自動觸發**（所有 task [x] + 最後 section Integration Test 全綠後）→ 完整測試 → 提醒切換 Cloudflare/Zeabur 追蹤分支 → 產出人眼測試清單 |
| **「功能上線」** | merge 到 main，刪分支 |

---

## 「新功能」完整流程

### 第一階段：需求探索（Explore）

1. Claude 主動詢問功能名稱（若未提供）
2. Claude 針對以下面向逐一提問，每次 **最多問 2～3 個問題**，不一次轟炸：
   - **目標使用者**：誰會用？什麼角色？
   - **核心情境**：使用者遇到什麼問題、想達成什麼？
   - **功能邊界**：這個功能做什麼、不做什麼？
   - **資料與 API**：需要新的資料表、欄位、或後端 API 嗎？
   - **限制與例外**：角色限制、邊界 case、錯誤處理？
3. **若功能涉及前端 UI 介面** → 直接畫出 ASCII mockup 讓使用者選擇，引發思考，不只是文字描述。
4. 使用者回答後繼續追問，直到需求足夠清晰
5. Claude 整理**需求摘要**（條列式），問：「需求是否完成？」
6. 使用者回覆「完成」→ 進入第二階段

### 第二階段：建立計畫與分支

7. 建立分支並推遠端：
   ```bash
   git checkout main
   git checkout -b m_b_功能名稱
   git push origin m_b_功能名稱
   ```

   > **前後端分支策略**：若功能同時涉及前端（`frontend/`）和後端（`server/`），建立兩個獨立分支：
   >
   > ```bash
   > git checkout main && git checkout -b m_b_功能名稱_backend && git push origin m_b_功能名稱_backend
   > git checkout main && git checkout -b m_b_功能名稱_frontend && git push origin m_b_功能名稱_frontend
   > ```
   >
   > - change 共用一份，tasks 中標註所屬分支（backend / frontend）
   > - 上線：依序 merge 到 main（後端先於前端）

8. **直接建立** `changes/NN-名稱/spec.md`（不來回詢問，從探索對話整理而來）
9. spec.md 完成後詢問使用者：「是否依照此文件建立 task.md？」
10. 使用者確認後建立 `tasks.md`
11. 告知使用者：「分支 `m_b_功能名稱` 已建立，說『執行計畫』開始實作」

---

## 「修改計畫」流程

> **第一步永遠是確認分支**

1. 確認對應分支：執行 `git branch --show-current`
2. 若在 `main` → **強制停止**：
   > ⛔ 目前在 `main`，請先切換到對應功能分支（`m_b_*`）再修改計畫。
3. 若在 `m_b_*` → 顯示：「目前在 `m_b_XXX`，確認繼續修改計畫？」
4. 使用者確認後：
   - 讀該 change 的 `spec.md` 與 `tasks.md`
   - 依序更新：`spec.md` → `tasks.md`
   - 禁止直接改 `tasks.md` 新增需求（需先改 `spec.md`）

---

## 「執行計畫」流程

> **第一步永遠是確認分支**
> **核心原則**：蓋一層測一層 — 每個 task 完成必跑 Unit Test，全綠才勾 [x] 進下一 task

1. 確認對應分支：執行 `git branch --show-current`
2. 若在 `main` → **強制停止**：
   > ⛔ 目前在 `main`，請先切換到對應功能分支（`m_b_*`）再執行計畫。
3. 若在 `m_b_*` → 顯示：「目前在 `m_b_XXX`，確認繼續實作？」
4. 讀該 change 的 `tasks.md`，找到下一個未完成（`[ ]`）且前置已完成（`[x]`）的 task
5. **只實作當前 task，不跳躍、不超範圍**

### 每個 task 的內部流程（蓋一層測一層）

a. **寫 source code**（jsx / js / 後端 service 等，需要時可多輪 Edit）
b. **寫 Unit Test**（**Claude 主動，不等使用者要求**）：

   | task 類型 | 測試檔位置 |
   |---|---|
   | 新元件 `frontend/src/components/<dir>/Foo.jsx` | `<dir>/__tests__/Foo.test.jsx` |
   | 新 utility `frontend/src/utils/Foo.js` | `frontend/src/utils/__tests__/Foo.test.js` |
   | 新 API route / service（後端） | `server/routes/__tests__/` 或 `server/services/__tests__/` |
   | 純 spec/tasks 文件、規則檔、README | 跳過 |

c. **跑 Unit Test**（**Claude 自動跑，不等使用者要求**）：
   ```bash
   npm --prefix frontend run test:run     # 前端 vitest
   ```
d. **全綠才勾 [x]、更新 `tasks.md`、進下一 task**
e. **fail 時不勾、不進下一 task** — 先修

### Section milestone（一個 section 全勾後，如 1.x / 2.x 完成）

跑 **Integration / API Testing**（**Claude 自動跑**）：
- 前端：`npm --prefix frontend run test:e2e`（playwright，測跨元件互動）
- 後端：打實際 API endpoint，驗 response 與 DB 狀態

全綠 → 進下個 section；fail → 修。

### 為什麼 section milestone 不能省

Unit Test 只驗「這層自己對」，Integration Test 才能抓「單獨 OK、組合壞」的整合衝突。

**真實案例（change 12）**：vite@8 + vitest@4 各自測試都過，組合後 `Cannot read properties of undefined (reading 'config')`。根本原因是版本不相容，降 vitest 到 v3.2.4 解決。教訓：「前面驗過」≠「組合也驗過」。

### Fail 排查順序

1. 先看 fail 訊號落在哪（哪個 test 哪一行）
2. 起點：當前 task 引入了什麼新東西（新檔 / 新依賴 / 新設定）
3. 不要排除前面層 — 看當前 task 跟前面有什麼接觸（依賴版本、設定相容、API 假設）
4. 修完 → 重跑該層測試 → 通過才繼續

---

## 「測試功能」流程

> **觸發時機（自動為主）**：所有 task `[x]` + 最後 section Integration Test 全綠後，Claude 自動進入。使用者打「測試功能」為 fallback。

### 第一步：依改動範圍跑完整測試（Claude 自動）

| 改動範圍 | 測試項目 |
|---------|---------|
| 前端有改動 | `npm --prefix frontend run test:run`（確認沒有崩潰）+ `npm --prefix frontend run test:e2e` |
| 後端 / API 有改動 | 跑 API Integration Test（確認邏輯正確、server 沒崩潰） |
| 資料庫有改動 | 驗 migration 執行結果 + DB 連線狀態 |

任一 fail → **不繼續**，回當前分支修，重跑 → 通過才繼續。

### 第二步：切換測試環境追蹤此分支（Claude 輸出提醒，使用者手動執行）

```
⚡ 請手動切換測試環境追蹤此功能分支：

Cloudflare Pages（前端 dev 環境）
  1. Cloudflare Dashboard → Pages → kjcs-dev → Settings → Builds & Deployments
  2. Production branch 改為：m_b_功能名稱
  3. Trigger deploy → 等待部署完成

Zeabur（後端 dev 環境）
  1. Zeabur Dashboard → kj-champion-dev → kj-champion-dev → Settings → Git
  2. Branch 改為：m_b_功能名稱
  3. 重新部署 → 等待服務啟動
```

### 第三步：產出人眼測試清單

Claude 必須產出以下格式的測試清單：

```
## 測試清單 — [change 名稱]

### 自動化測試結果
- ✅ vitest Unit：X 個通過
- ✅ playwright Integration：X 個通過
- ✅ API Test：X 個通過

### 需要人眼確認的項目（請依序操作）

- [ ] **[項目名稱]**
  - 測試網址：https://kjcs-dev.pages.dev/[路徑]
  - 測試前準備：[如需要] DevTools → Application → Service Workers → Unregister
  - 操作步驟：
    1. [具體操作]
    2. 預期：[應該看到什麼]
    3. 實際：✅ 正常 / ❌ 異常（描述）

### 常見人眼確認項目（視 change 性質勾選）
- [ ] PWA install standalone 模式（Chrome 右上 install icon → 確認以獨立視窗開啟）
- [ ] 真實 LINE OAuth（登出 → 重新登入 → 確認 redirect 正確）
- [ ] Web Share API（手機點分享 → 確認原生分享面板出現）
- [ ] 跨裝置視覺（手機 PWA / 桌面 Chrome / iOS Safari）
- [ ] 視覺感受（顏色、字體渲染、動畫流暢度）
```

全項目 ✅ 才能進「功能上線」流程；任一 ❌ → 回分支修 → 重跑自動化 → 重新驗收。

### ⛔ 嚴禁

- 自動化測試 fail 時進行人眼驗收
- 跳過人眼驗收直接「功能上線」
- 功能上線後忘記把 Cloudflare/Zeabur 改回追蹤 `main`

---

## 「修 bug」流程（hotfix）

**hotfix 只用於修 main 上的 bug**（main 已上線出問題）。m_b_* 分支上的 bug 在該分支直接修，不要開 hotfix。

1. 從 main 切出 hotfix 分支：
   ```bash
   git checkout main
   git checkout -b hotfix/描述
   git push origin hotfix/描述
   ```
2. 在 hotfix 分支上修復（可多次 commit）
3. 修復完成後走 deploy.md 的「推送到 main」完整流程
4. 刪除 hotfix 分支：
   ```bash
   git branch -d hotfix/描述
   git push origin --delete hotfix/描述
   ```
5. 將 main sync 到所有 m_b_* 分支（deploy.md 同步規則）

#### ⛔ 嚴禁

- ❌ 直接在 main 上改功能程式碼
- ❌ 沒確認是 main 的 bug 就開 hotfix（m_b_* 分支的 bug 在該分支修）

---

## 「功能上線」流程

1. 確認該 change 的所有 tasks 皆為 `[x]`
2. **再次確認測試狀態**：詢問使用者：「請確認人眼驗收全部 ✅？」，明確回覆後才繼續
3. 執行 deploy.md 的推送流程（CHANGELOG / context / README / 機密檢查 / 使用者確認 / merge main / tag）
4. **詢問使用者**：「prod 上線功能正常嗎？」— 等明確回覆「正常」後才繼續
5. 刪除功能分支（本機 + 遠端）
6. **提醒使用者**：將 Cloudflare Pages 和 Zeabur dev 環境的追蹤分支改回 `main`

---

## Change 範圍控制

- **改 HOW**（方法變，範圍不變）：合法，更新 spec.md + tasks.md，change 不擴大
- **改 WHAT**（範圍擴大）：修改計畫時若需新增超過 2 個 task → 停下詢問使用者是否開新 change

---

## 分支架構

```
main      ← 正式上線，只接受 m_b_* / hotfix merge
  ├─ m_b_*            ← 純前端或純後端功能分支（直接作為測試環境）
  ├─ m_b_*_backend    ← 前後端功能的後端分支
  └─ m_b_*_frontend   ← 前後端功能的前端分支
hotfix/*  ← 緊急修復，從 main 切出，修完 merge 回 main
```

> dev 分支已廢除。Cloudflare Pages / Zeabur dev 服務直接追蹤功能分支進行測試。

---

## 嚴禁行為

- ❌ 未確認分支就動程式碼或文件
- ❌ 在 `main` 直接開發（`.claude/` 修改除外）
- ❌ 功能分支只建本機不 push 到遠端
- ❌ 診斷問題時順手實作（診斷 ≠ 授權修改）
- ❌ 只改程式碼不更新 `tasks.md`
- ❌ 使用 `git add -A`
- ❌ 將 `.claude/` 修改與功能程式碼混在同一個 commit

---

## .claude/ 特殊規則

**.claude/ 是全域設定，所有分支必須同步。main 是唯一來源。**

### 修改流程（任何分支皆同）

```bash
git add .claude/<修改的檔案>
git commit -m "chore: 更新 .claude/..."
git checkout main
git cherry-pick <commit hash>
git push origin main
git checkout <回到原分支>
```

### 同步機制

push main 後，立即執行 `bash scripts/sync-branches.sh`（唯一事實來源，見 deploy.md「同步流程」與「衝突處理策略」）。

---

## 錯誤處理

- 只顯示實際錯誤（`err.message`、`err.code` 或 API 回傳訊息）
- 功能失敗不 fallback 成其他行為，只顯示錯誤
- 不自行加「失敗」「錯誤」等總結文字

---

## 程式碼決策規範

實作涉及非直覺選擇時，在程式碼上方加註：

```js
// [設計決策] 簡短描述這個選擇
// 原因：為什麼不用更直覺的方式
// 若要修改：請先確認 spec.md 的技術設計區塊
```

適用：繞過 library 預設行為、刻意不用更簡單方案、與一般慣例不同的實作。
