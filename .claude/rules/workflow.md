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

---

## 「新增功能」完整流程

1. 詢問功能名稱（若未提供）
2. 建立分支並推遠端：
   ```bash
   git checkout main
   git checkout -b m_b_功能名稱
   git push origin m_b_功能名稱
   ```
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

## 「功能上線」流程

1. 確認所有 tasks 皆為 `[x]`
2. 執行 deploy.md 的推送流程
3. 將 STATUS.md 的 change 標為 DONE
4. 刪除功能分支

---

## Change 範圍控制

- **改 HOW**（方法變，範圍不變）：合法，更新 design.md + tasks.md，change 不擴大
- **改 WHAT**（範圍擴大）：修改計畫時若需新增超過 2 個 task → 停下詢問使用者是否開新 change

---

## 分支架構

```
main      ← 正式上線，只接受 m_b_* / hotfix merge
  └─ m_b_*  ← 功能分支，對應一個 OpenSpec change
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
