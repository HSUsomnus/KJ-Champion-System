<!--
  .claude/handoff.md — 跨 session 交接檔（/打包 產生，/繼續 讀取）
  單次性文件：/繼續 讀完後這份內容就算消化完畢，不需要長期維護。
-->

## 1. 打包時間 + session 角色

2026-07-22 21:25，session 角色：**engineer**（`.claude/.session-role` 內容為 `engineer`，沿用即可，不用重新打卡）。

## 2. 當前任務

change 20「團隊調查表單系統」（KJ Survey），分支 `m_b_調查表單`。
目標：把 `kj-survey-server`（獨立後端）+ `frontend/src/pages/survey/`（前台填表 + 後台管理）整套功能做完、測試綠燈，準備上線。

## 3. 已完成 / 進行中 / 下一步

**已完成（全部已 commit + push 到 `m_b_調查表單`，最新 commit `fbd01e2`）：**
- Section 1 AUTH（20.1-20.10）：真驗簽 LINE OAuth + 自簽 JWT + requireAdminSession
- Section 2 PUB（20.11-20.17）：送出濫用防護 + validateAnswers + transaction + members 端點 + 前台接線
- Section 3（20.18-20.22）：後台 Table 1 讀取 API + 側邊欄/表格/篩選 UI
- Section 4（20.23-20.26）：未填名冊 attendance 計算 + 點名表 UI
- Section 5（20.27-20.30）：CSV/xlsx 匯出（含公式中和防注入）+ 匯出鈕
- Section 6 後端（20.31-20.34）：表單建立器 create/patch/publish + 完整驗證規則 + 三支路由

**進行中**：無（上一個 task 20.31-20.34 已收尾 commit）。

**下一步**：**20.35**（Section 6 前端，`[Claude]` 自己做，不委派）——建立器 UI：
- 欄位編輯器（key/label/type/options/required，type 只能 text/searchable_select/yesno）
- 預覽（重用 `SurveyFill.jsx` 唯讀模式）
- 發佈鈕 + 分享連結顯示 + 複製連結按鈕
- vitest

之後還有：
- Section 7（20.36-20.37）：確認 `_worker.js` 代理設定 + README 更新（推送前必做）
- Section U/M：使用者外部依賴（部署網址/env/LINE callback 登記/dev DB 種子）+ dev milestone 人眼驗收，**非阻塞、不用等**

## 4. 工作區狀態

```
$ git status --short
?? .agents/
?? .codex/
```

處置建議：這兩個是**本 session 開始前就存在**的 untracked 目錄（Codex CLI 本機設定/快取），不是本 session 產物，**不要動、不要加進任何 commit**，維持原樣即可。工作區本身乾淨，沒有待 commit 的異動。

## 5. 關鍵決策與注意事項

- **本機桌機可直接調度 Codex CLI，不用開 VPS**：這是本 session 的重大發現，已寫進 `.claude/now.md`「環境特殊狀態」。往後委派 Codex 套件直接 `codex exec -s workspace-write "..."` 在 repo root 執行即可，不需要先跑 `/vps新對話`。
- **委派 Codex 後一定要人工 review，不能照單全收**：這個 session 委派了 7 個 Codex 套件（PUB-B/C、CX-1~4），其中 3 次 review 抓到問題：
  - PUB-B：新姓名寫入 pending member 的 `star_rank` 誤寫成 DB CHECK constraint 不允許的 `'無'`（合法值只有白/綠/橙/紅/紫），已修正回 `'白'`。
  - Section 3 UI 整合時發現 CX-1 的 `listForms()` 漏選 `fields` 欄位，導致前端拿不到欄位定義無法渲染表格，已補上。
  - Section 4 UI 整合時發現 `attendanceService` 漏傳 `star_rank`，點名表顯示不出星等，已補上。
  - CX-4：`formService.js`/`routes/admin.js`/`admin.test.js` 三處都用「先 export/mock 一半、後面再補齊」的寫法（技術上不是 bug，但是脆弱寫法），已重構成單一個 `module.exports`，純重構不改行為。
  這個模式（Codex 產出功能通常正確，但容易漏欄位/有風格瑕疵）值得繼續留意，**不要因為 jest 全綠就跳過人工看 diff**。
- **20.35 建立器 UI 開工前，先看現有元件可重用什麼**：`frontend/src/pages/survey/admin/` 底下已有 `FormsSidebar.jsx`、`SubmissionsTable.jsx`、`AttendanceRoster.jsx`、`ExportButtons.jsx` 四個元件，風格（Warm Minimal，色票見 uidesign skill）已經統一，新的建立器 UI 元件要延續同一套視覺語言。`SurveyFill.jsx` 目前是给夥伴端填表用的頁面，「預覽」要求重用它的唯讀模式，不要另外重寫一份渲染邏輯。
- **後端有多次改動，本機測試前記得重啟 kj-survey-server**（`server.js`、`formService.js`、`routes/admin.js` 等都動過）。
- **CX-4 新增的三支 API 契約**（20.35 前端會直接用到）：
  - `POST /admin/forms` body `{title, fields?}` → 201 `{success:true,data:<draft表單>}` / 400 `{error:'invalid_form',field,reason}`
  - `PATCH /admin/forms/:id` body 只能有 `title`/`fields` 兩個 key → 200 成功 / 400 invalid_form / 404 找不到 / 409 已發佈不可編輯
  - `POST /admin/forms/:id/publish` 無 body → 200（含已發佈過的冪等情況）/ 404 / 400（空 fields）
  三支都走 `adminRequest`/`downloadAdminExport` 同一套 Bearer 機制（`surveyApi.js` 已有 `adminRequest` 可直接複用，只差新增 `createAdminForm`/`patchAdminForm`/`publishAdminForm` 這幾個 wrapper）。

## 6. 給 /繼續 的第一個動作

讀完這份交接檔、跑 `git log --oneline -5` 確認分支 HEAD 在 `fbd01e2` 之後沒有落後，接著直接開工 **task 20.35**：先讀 `changes/20-團隊調查表單系統/spec.md` 第五節「建立器 form 驗證」跟第八節 CX-4 那行對照的前端範圍，再動手寫建立器 UI（不用再問使用者要不要做，這是排定好的下一步）。
