# Core Rules — 每次 Edit/Write 自動注入

## 工作流（兩關鍵字）

### 「修改計畫」→ 只動文件，不動程式碼

1. 先讀 `openspec/STATUS.md` 確認當前位置
2. 依序更新：`proposal.md` → `design.md` → `tasks.md`
3. 最後更新 `openspec/STATUS.md`
4. 文件衝突時，以對話框最新指令為準
5. **禁止直接修改 `tasks.md` 新增需求**（需先更新 proposal.md）

### 「執行計畫」→ 使用者明確說才可動程式碼

1. 先讀 `openspec/STATUS.md` 確認當前執行位置
2. 讀取對應的 `tasks.md`，找到當前 task
3. **只執行未完成（`[ ]`）且前置任務已完成（`[x]`）的 task**
4. 依照 task 逐步實作
5. 完成後更新 `tasks.md`（勾選 `[x]`）與 `openspec/STATUS.md`

## 嚴禁行為

- ❌ 未看 STATUS.md 就直接動程式碼
- ❌ 使用者問診斷問題時順手實作（診斷 ≠ 授權修改）
- ❌ 跳過未完成的前置 task
- ❌ 只改程式碼不更新 tasks.md / STATUS.md

## 錯誤處理

- 只顯示實際錯誤內容（`err.message`、`err.code` 或 API 回傳訊息）
- 不自行加「失敗」「錯誤」等總結文字
- 功能失敗時不 fallback 成其他行為，只顯示錯誤

## Change 範圍控制

修改計畫時，區分兩種情況：

- **改 HOW（方法變了，範圍不變）**：合法，更新 design.md + tasks.md，change 不擴大
- **改 WHAT（範圍擴大）**：需判斷

**判斷準則**：修改計畫時若需新增超過 2 個 task → 停下來，詢問使用者是否應開新 change，不擅自擴大當前 change

## 需求變更

- 未經詢問不得自行改動使用者需求或實作方案
- 原方案有困難：先說明原因 + 提出替代方案 + 明確詢問使用者

## STATUS.md 當前 Change 格式（含手動操作步驟）

當 change 包含**外部平台操作**（Zeabur、Cloudflare Pages、LINE Console、git PR 等），STATUS.md 的「待完成」區塊**必須**顯示：

1. **負責人**：每個 task 標明「使用者手動」或「Claude 程式碼」
2. **操作平台**：在哪個 dashboard / 工具執行
3. **具體步驟**：關鍵點選路徑或指令（不需截圖層級，但要明確到「去哪裡按什麼」）

範例格式：
```
### ⬜ 待完成

- [ ] **025.3 Zeabur 建立正式後端服務**（使用者手動 — Zeabur Dashboard）
  1. Zeabur → Projects → 新增 Service → Git
  2. 選擇 repo，Branch 設為 `main`
  3. 記下產生的 domain（供 025.4、_worker.js 使用）

- [ ] **025.12 更新 _worker.js**（Claude 程式碼）
  - 等 025.3 完成，取得 URL 後由 Claude 修改
```

**規則：每個 task 必須以 `- [ ]` 或 `- [x]` 開頭，詳細步驟縮排在下方。**

此規則在**執行計畫**時套用，更新 STATUS.md 時需補齊操作細節。
