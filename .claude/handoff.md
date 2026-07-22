<!--
  .claude/handoff.md — 跨 session 交接檔（/打包 產生，/繼續 讀取）
  單次性文件：/繼續 讀完後這份內容就算消化完畢，不需要長期維護。
-->

## 1. 打包時間 + session 角色

2026-07-22（本次 session 內），session 角色：**engineer**（`.claude/.session-role` 內容為 `engineer`，沿用即可，不用重新打卡）。

## 2. 當前任務

change 20「團隊調查表單系統」（KJ Survey），分支 `m_b_調查表單`。
目標：把 `kj-survey-server`（獨立後端）+ `frontend/src/pages/survey/`（前台填表 + 後台管理）整套功能做完、測試綠燈，準備上線。

## 3. 已完成 / 進行中 / 下一步

**已完成（全部已 commit + push 到 `m_b_調查表單`，最新 commit `495439b`）：**

- Section 1-6（承接上次交接，未變動）：AUTH／PUB／Table1／未填名冊／匯出／建立器後端
- **Section 6 前端（20.35，本次新做）**：`FormBuilder.jsx`（欄位編輯器 key/label/type/required + searchable_select options 編輯、儲存草稿/發佈/複製分享連結三動作接 CX-4 三支 API）；抽出 `FormFieldsPreview.jsx`（把 `SurveyFill.jsx` 原本內嵌的 `SearchableSelect`/`YesNoField`/文字欄位渲染邏輯搬出來，加 `readOnly` 模式），`SurveyFill.jsx` 與建立器預覽共用同一份渲染邏輯，沒有另寫一份；`SurveyAdmin.jsx` 依表單 `status` 切換「Table/未填名冊 tabs」或「建立器畫面」；`FormsSidebar.jsx` 補「+ 新增」入口。vitest 8 案例（`FormBuilder.test.jsx`）+ 全套 63 案例綠燈。
- **Section 7（20.36-20.37，本次新做）**：20.36 純驗證——`_worker.js` 既有的 `/survey-api/*` 前綴代理與 404→SPA fallback 邏輯本來就是通用邏輯，已涵蓋 `/survey-api/admin-auth/*` 子路徑與 `/f/:token`、`/admin` 兩條前端路由，**沒有改程式碼**。20.37——README 補齊 KJ Survey 子系統整段說明（部署架構圖、主要功能表、`kj-survey-server` 專屬環境變數表、本機開發指令、專案結構樹、獨立 Zeabur 部署段落）。

**進行中**：無。

**下一步**：Section 1-7（所有 `[Claude]` task）已**全數完成**，change 20 的程式碼與測試部分收工。剩下的是 tasks.md 裡全部標記 `[使用者]` 的兩段，**不是 Claude 能繼續做的**：

- **Section U（U.1-U.4）**：Survey dev/prod 服務網址 + Root Directory=`kj-survey-server/`＋start command、環境變數（DB 內網、LINE_CHANNEL_ID/SECRET、APP_URL/FRONTEND_URL、SESSION_SECRET）、LINE Developers 登記 callback URL、dev DB 種子 40 人罕用字
- **Section M（M.1-M.6）**：使用者在 dev 環境部署好之後的人眼驗收（認證撤權、送出濫用防護、未填名冊分組、匯出開檔、隱私接受度、端到端 integration）

下次接手時機：使用者完成 Section U 部署設定後，若 Section M 驗收發現 bug 再回來修；或使用者決定要規劃 merge main 時再開新 session。目前沒有排定的下一個 Claude task。

## 4. 工作區狀態

```
$ git status --short
 M .claude/now.md
?? .agents/
?? .codex/
?? changes/30-AI工作流Token與中斷恢復補丁/
```

處置建議：

- `.claude/now.md` 是本次 /打包 更新的檔案，會與這份 handoff 一起 commit + push，不用額外處理。
- `.agents/`、`.codex/` 沿用上次交接的結論：session 開始前就存在，Codex CLI 本機設定/快取，不要動、不要加進任何 commit。
- **`changes/30-AI工作流Token與中斷恢復補丁/`（本次 session 新出現的 untracked 目錄）**：內含 `spec.md`/`tasks.md`/`補丁報告.md`，是**另一個 session**（規劃 AI 工作流 token/中斷恢復議題）留在這個工作區的規劃輸出，**不屬於 change 20 範圍**。其 spec 第一節明講「禁止在目前分支執行本補丁」「待 change 20 merge main 後另開 `m_b_AI工作流Token中斷恢復` 分支實作」。這是別人的在製品，不是本 session 產物，**不要 commit、不要刪除**，處置方式（何時 commit、要不要獨立分支）留給使用者決定。

## 5. 關鍵決策與注意事項

- **`FormFieldsPreview.jsx` 是這次重構出的共用元件**：原本 `SurveyFill.jsx` 內嵌一份 `SearchableSelect`/`YesNoField` 渲染邏輯，現在抽到 `frontend/src/pages/survey/FormFieldsPreview.jsx`，`SurveyFill.jsx`（互動填表）與 `FormBuilder.jsx`（唯讀預覽）共用同一份，差異只靠 `readOnly` prop 控制（disabled 樣式、不開下拉選單）。往後如果要再改欄位渲染邏輯（例如加新 field type），只需要改這一個檔案，兩邊都會同步。
- **建立器 UI 的 searchable_select 只支援 static `options.values`**，不支援 `options.source='survey_members'`（member-sourced 是給 Phase 1 固定表單「推薦人」欄位用的內建型態，spec 五節的驗證規則也只針對 static values 定數值上限，沒提 member-sourced），這是刻意的範圍收斂，不是遺漏。
- **`SurveyAdmin.jsx` 的 tab 切換邏輯**：新增了 `builderActive = creatingNew || selectedForm?.status === 'draft'` 這個判斷——選到 draft 表單、或按「+新增」時，畫面整個換成 `FormBuilder`（不顯示 Table/未填名冊 tabs 和匯出鈕）；表單一旦發佈（`status='published'`），畫面自動換回 Table/未填名冊 tabs。這是本次自己設計的整合方式，spec 沒有規定 UI 版面細節，只規定功能要有（欄位編輯器/預覽/發佈鈕/連結/複製）。
- **20.36 沒有 commit 對應的程式碼改動**：純驗證性質的 task，diff 是 0，跟 20.37（README）合併成同一個 commit（`495439b`）一起收。
- **README 沒有寫死版本號**：change 20 還沒上線 main，KJ Survey 相關段落一律用「change 20」標註，不是「vX.Y.Z」，避免預先猜測上線時的版本號（版本號由收尾流程在真正上線時決定）。
- **後端這次沒有任何改動**（`kj-survey-server/` 完全沒碰），不需要提醒使用者重啟本機伺服器；前端測試前若要看畫面才需重開 dev server。

## 6. 給 /繼續 的第一個動作

讀完這份交接檔、跑 `git log --oneline -3` 確認分支 HEAD 在 `495439b`。change 20 的 Claude 端工作目前**沒有排定的下一步**——先跟使用者確認 Section U（Zeabur/LINE Developers 外部設定）進度到哪，或是否有新需求/bug 要處理，不要自行推測開始做什麼。
