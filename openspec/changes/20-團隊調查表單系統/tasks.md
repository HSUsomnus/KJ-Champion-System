# Change 20 — 團隊調查表單系統 Tasks

> 分支：`claude/new-feature-pz95p1`（本次由執行環境指定為單一分支，前後端不拆 `_backend`/`_frontend` 兩支，與 `workflow.md` 建議的雙分支模式不同，屬本次例外）。

## Section 0：DB Migration（人工，Zeabur Console）

- [x] **20.0** 產生 `kj-survey-server/migrations/001_init_survey_tables.sql`（建 `survey_members` / `survey_forms` / `survey_submissions` + 40 人種子 + Phase 1 固定表單）
- [ ] **20.0a** 使用者到 dev Console 貼上執行：`kj-champion-dev` → `postgresql-dev` → Console
- [ ] **20.0b** 使用者到 prod Console 貼上執行：`kj-champion` → `postgresql` → Console
- [ ] **20.0c** 使用者到 backup Console 貼上執行：`kj-champion` → `postgresql-backup` → Console
- [ ] **20.0d** dev 執行後人工核對種子名單罕用字與推薦人歸屬（發佈前必做，見 spec.md 已知限制）

---

## Section 1：`kj-survey-server` 後端骨架

- [x] **20.1** `kj-survey-server/package.json`：express、pg、jsonwebtoken（LINE ID token 驗簽用）、exceljs、dotenv
- [x] **20.2** `kj-survey-server/.env.example`：`DATABASE_URL`（dev 用 `DEV_DATABASE_URL` 等價值，prod 用內網連線字串）、`LINE_CHANNEL_ID`、`LINE_CHANNEL_SECRET`、`APP_URL`、`FRONTEND_URL`、`PORT`
- [x] **20.3** `kj-survey-server/server.js`：Express 入口 + DB pool（比照 `server/` 現有 pg pool 寫法）
- [x] **20.4** `GET /health`：DB 連線檢查（比照 `server/routes/debug.js` 精神，簡化版）
- [x] **20.5** Unit test：health check 回 200 + DB 連線成功訊息（`npx jest` 於 `kj-survey-server/` 全綠）
- [ ] **20.6** Section milestone：部署 dev 服務（`kj-champion-dev` 專案內新服務，使用者手動建立），打 `/health` 確認連上 dev DB（**待使用者建立 Zeabur 服務才能跑**）

---

## Section 2：前台填表（`/f/:token`）

### 後端
- [x] **20.7** `GET /forms/:token`：查 `survey_forms`（`status='published'`），回傳 `fields`；查無 / draft → 統一 404 友善錯誤（不洩漏是哪種原因）
- [x] **20.8** `GET /members`：回傳 `survey_members`（姓名/推薦人下拉用）
- [x] **20.9** `POST /forms/:token/submit`：寫入 `survey_submissions`；`name`/`recommender` 為新姓名時（不在 `survey_members` 內）先寫入 `survey_members`（`status='pending'`）再存 submission
- [x] **20.10** Unit test（`kj-survey-server`）：token 有效/無效、新姓名寫入 pending、既有姓名不重複寫入，共 11 case 全綠

### 前端
- [x] **20.11** `frontend/src/services/surveyApi.js`：`getFormByToken`、`getMembers`、`submitForm`（呼叫 `/survey-api/*`）
- [x] **20.12** `frontend/src/pages/survey/SurveyFill.jsx`：依 `fields` 動態 render（`searchable_select`/`yesno`/`text`），送出後顯示成功頁
- [x] **20.13** `App.jsx` 新增路由 `{ path: '/f/:token', element: <SurveyFill /> }`（與 `/login` 同層，不經 `ProtectedRoute`）
- [x] **20.14** vitest：`SurveyFill` render 正確欄位數、token 無效顯示錯誤、送出呼叫 API 正確 payload，3 case 全綠（`npx vitest run` 全專案 15 test 全綠）
- [ ] **20.15** Section milestone：dev 環境实测，手機瀏覽器開 `/f/:token` 走一次完整送出流程（**待 Zeabur dev 服務 + DB migration 執行後才能跑**）

---

## Section 3：後台認證骨架

- [ ] **20.16** `kj-survey-server`：LINE Login OAuth 起始 + callback 路由（比照 `server/routes/auth.js` 精神，獨立實作不 import 主系統程式碼）
- [ ] **20.17** LINE ID token **後端驗簽**（驗證 JWT 簽章來自 LINE 官方，絕不信前端傳值）
- [ ] **20.18** 驗簽通過後 `SELECT role FROM members WHERE line_id = $1`，確認 `role ∈ {管理者, 負責人, 開發者}`
- [ ] **20.19** Session 設計：**只存記憶體**（如簽發短效期 JWT 存 httpOnly cookie，不落地 localStorage；關頁重開需重登，符合手冊鐵律）
- [ ] **20.20** Unit test：驗簽失敗擋下、role 不足擋下、role 足夠放行三個 case
- [ ] **20.21** 管理者綁定 LINE ID 的專屬設定連結（寫入 `survey_members` 或另建輕量對照，設計依實作時定案）
- [ ] **20.22** 前端：`frontend/src/pages/survey/SurveyAdmin.jsx` 骨架 + 登入閘門（未通過導去 LINE 登入，不共用主系統 `AuthContext`）
- [ ] **20.23** `App.jsx` 新增路由 `{ path: '/admin', element: <SurveyAdmin /> }`（與 `/login` 同層）
- [ ] **20.24** Section milestone：dev 環境用非管理者 LINE 帳號測試被擋、管理者帳號測試放行

---

## Section 4：後台 Table 1（資料檢視 + 篩選）

- [ ] **20.25** `GET /admin/forms`：列出所有 `survey_forms`（側邊欄用，需登入）
- [ ] **20.26** `GET /admin/forms/:id/submissions`：該表單所有 `survey_submissions`（需登入）
- [ ] **20.27** 側邊欄元件：列出表單、點選切換
- [ ] **20.28** Table 1 元件：全展開表格，是非型狀態 ✅/❎
- [ ] **20.29** 篩選模式：欄位標題/姓名變按鈕（推薦人欄不變）；點姓名→篩「推薦人=該人+本人」；點課程欄→篩 Yes；點星等→篩該星等；同鈕再點取消；單條件互斥
- [ ] **20.30** vitest：篩選邏輯（姓名/課程欄/星等三種篩選 + 取消）
- [ ] **20.31** Section milestone：dev 環境跑一輪篩選操作，確認結果正確

---

## Section 5：未填名冊

- [ ] **20.32** `GET /admin/forms/:id/attendance`：後端算好「已填/未填」+ 按推薦人分組 + 各組進度（全名單比對 `survey_members` vs `survey_submissions.answers.name`）
- [ ] **20.33** 前端「未填名單」切換鈕：已填資料 ⇄ 點名表
- [ ] **20.34** 點名表 UI：按推薦人分組，組標題進度條（`▓▓▓▓░░ 8/12`），組內姓名+星等+✅/❎
- [ ] **20.35** Unit test（後端）：分組/比對/進度計算正確性
- [ ] **20.36** Section milestone：dev 環境確認未填名冊分組與進度與種子資料手算結果一致

---

## Section 6：匯出

- [ ] **20.37** `GET /admin/forms/:id/export.csv`：後端直出 CSV
- [ ] **20.38** `GET /admin/forms/:id/export.xlsx`：後端用 `exceljs` 直出
- [ ] **20.39** 前端匯出按鈕（CSV / Excel 各一顆）
- [ ] **20.40** Section milestone：dev 環境下載兩種格式，人工開檔確認資料正確

---

## Section 7：Table 2 表單建立器

- [ ] **20.41** `POST /admin/forms`（建 draft）、`PATCH /admin/forms/:id`（編輯欄位）、`POST /admin/forms/:id/publish`（draft→published，若無 token 則產生）
- [ ] **20.42** 前端建立器 UI：手打欄位（key/label/type/options）
- [ ] **20.43** 預覽：套用 `SurveyFill` 的 render 邏輯，唯讀模式預覽
- [ ] **20.44** 發佈鈕 + 發佈後顯示連結 + 複製連結按鈕
- [ ] **20.45** vitest：建立器欄位增刪、預覽渲染、發佈後 token 顯示
- [ ] **20.46** Section milestone：dev 環境手動建一張新表單、發佈、用產生的連結實際填一次

---

## Section 8：`_worker.js` 代理 + 收尾

- [x] **20.47** `frontend/public/_worker.js` 新增 `/survey-api/*` 代理規則（prod/dev 依 hostname 判斷，比照 `resolveBackend()`）— 提前於 Section 2 一併完成，讓前台在 dev 服務建好後可直接動
- [ ] **20.48** 確認 `/f/:token` 與 `/admin` 在 `_worker.js` 靜態資源 fallback 邏輯下正常走 SPA（非 `/api/*`、非 `/survey-api/*` 的路徑要 fallback 到 `index.html`）
- [ ] **20.49** Integration test：dev 環境完整跑一次「建表單 → 分享連結 → 填寫 → 後台查看 → 篩選 → 未填名冊 → 匯出」全流程
- [ ] **20.50** README.md 更新（依 `readme.md` 規則，推送前必做）

---

## 執行前提醒

- Section 1 起「Section milestone」都需要 dev 服務先部署（見 spec.md 待確認事項 #1，使用者需在 Zeabur 手動新增服務）。服務尚未建立前，Section 1-2 的程式碼可以先寫，但無法跑 milestone 驗證。
- CCR 沙箱連不到 Zeabur（`.claude/now.md` 已知地雷），所有「Section milestone」與 DB Console 操作都需使用者本機或 Zeabur Dashboard 執行，Claude 只能出指令/程式碼。
