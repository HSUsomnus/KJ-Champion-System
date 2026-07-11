# Change 20 — 團隊調查表單系統 Tasks

> 分支：`claude/new-feature-pz95p1`（本次由執行環境指定為單一分支，前後端不拆 `_backend`/`_frontend` 兩支，與 `workflow.md` 建議的雙分支模式不同，屬本次例外）。

> **⚠️ 策略修訂（2026-07-11，見 spec.md）**：
> 1. **後端合併**：獨立的 `kj-survey-server/` 併入主系統 `server/`（路由 `server/routes/survey/*.js`、API 前綴 `/api/survey/*`）。已完成的 Section 1–3 後端程式碼需**搬遷**（見新增 Section M）。
> 2. **後台改手機優先儀表板**：Section 4–7 依此重定位（尚未動工，成本低）。側邊欄＝任務清單、首屏＝完成狀況。
> 3. **圖片上傳審核**：定位為管理者自建表單的可選 `upload` 欄位，**不進本次固定表單**，建置排 Phase 2。
> 4. **Zeabur 新服務需求取消**：後端合併後無需新增服務，原 20.6 milestone 作廢。

## Section 0：DB Migration（人工，Zeabur Console）

- [x] **20.0** 產生 `kj-survey-server/migrations/001_init_survey_tables.sql`（建 `survey_members` / `survey_forms` / `survey_submissions` + 40 人種子 + Phase 1 固定表單）
- [x] **20.0a** 使用者到 dev Console 貼上執行：`kj-champion` → `postgresql-dev` → Console（40 人 + 表單，token: `3b30e527e45f4f0ca19396e721391af2`）
- [x] **20.0b** 使用者到 prod Console 貼上執行：`kj-champion` → `postgresql` → Console（40 人 + 表單，token: `5fd6de200cad4a3c85e401f69eb43928`）
- [x] **20.0c** 使用者到 backup Console 貼上執行：`kj-champion` → `postgresql-backup` → Console（40 人 + 表單，均完成）
- [ ] **20.0d** dev 執行後人工核對種子名單罕用字與推薦人歸屬（發佈前必做，見 spec.md 已知限制）

---

## Section M：後端合併進 `server/`（2026-07-11 策略修訂新增）

> 把原 `kj-survey-server/` 的程式碼搬進主系統 `server/`，複用主後端 pg pool 與 LINE 驗簽。原 Section 1–3 的 `[x]` 是在獨立服務下完成的，搬遷後需在新位置重跑測試才算數。

- [ ] **20.M1** 將 survey 路由搬入 `server/routes/survey/*.js`（`public.js` 前台、`admin.js` 後台、`adminAuth.js` 認證），API 前綴改 `/api/survey/*`；掛進 `server/server.js`
- [ ] **20.M2** survey service 邏輯搬入 `server/services/survey/*.js`；DB 改用 `server/` 既有 pg pool（移除獨立 pool / 獨立 `server.js` 入口）
- [ ] **20.M3** LINE 驗簽改複用 `server/` 既有工具（不再獨立實作一份）；survey 後台 session 模型維持獨立（短效 JWT／記憶體，關頁重登）
- [ ] **20.M4** 相依套件（`exceljs`、`jsonwebtoken` 等）併入主 `server/package.json`（若主專案已有則沿用）；刪除 `kj-survey-server/` 目錄與其 `package.json`/`.env.example`
- [ ] **20.M5** 前端 `surveyApi.js` 呼叫路徑 `/survey-api/*` → `/api/survey/*`
- [ ] **20.M6** 搬遷後重跑後端 unit test（原 Section 1–3 測試）全綠；`GET /api/survey/health` 於本機 / dev 回 200
- [ ] **20.M7** 移除 `_worker.js` 的 `/survey-api/*` 代理段（見 20.47 修訂）

---

## Section 1：survey 後端骨架（原 `kj-survey-server`，已搬入 `server/`，見 Section M）

- [x] **20.1** ~~`kj-survey-server/package.json`~~ 相依套件併入主 `server/package.json`（見 20.M4）；原始清單：express、pg、jsonwebtoken、exceljs、dotenv
- [x] **20.2** ~~`kj-survey-server/.env.example`~~ 改複用 `server/` 既有 env（`DATABASE_URL` / `DEV_DATABASE_URL` / `LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET`），不另建（見 20.M2/20.M3）
- [x] **20.3** ~~`kj-survey-server/server.js` 入口 + 獨立 pool~~ 改掛進 `server/server.js`、複用主 pool（見 20.M1/20.M2）
- [x] **20.4** `GET /health` → 改 `GET /api/survey/health`：DB 連線檢查（比照 `server/routes/debug.js` 精神）
- [x] **20.5** Unit test：health check 回 200 + DB 連線成功訊息（搬遷後於 `server/` 重跑，見 20.M6）
- [x] ~~**20.6** Section milestone：dev 服務已部署（獨立 Zeabur 服務）~~ **作廢**：後端合併後隨主後端部署，無獨立 Zeabur 服務

---

## Section 2：前台填表（`/f/:token`）

### 後端
- [x] **20.7** `GET /forms/:token`：查 `survey_forms`（`status='published'`），回傳 `fields`；查無 / draft → 統一 404 友善錯誤（不洩漏是哪種原因）
- [x] **20.8** `GET /members`：回傳 `survey_members`（姓名/推薦人下拉用）
- [x] **20.9** `POST /forms/:token/submit`：寫入 `survey_submissions`；`name`/`recommender` 為新姓名時（不在 `survey_members` 內）先寫入 `survey_members`（`status='pending'`）再存 submission
- [x] **20.10** Unit test（`kj-survey-server`）：token 有效/無效、新姓名寫入 pending、既有姓名不重複寫入，共 11 case 全綠

### 前端
- [x] **20.11** `frontend/src/services/surveyApi.js`：`getFormByToken`、`getMembers`、`submitForm`（呼叫路徑 `/survey-api/*` → 修訂為 `/api/survey/*`，見 20.M5）
- [x] **20.12** `frontend/src/pages/survey/SurveyFill.jsx`：依 `fields` 動態 render（`searchable_select`/`yesno`/`text`），送出後顯示成功頁
- [x] **20.13** `App.jsx` 新增路由 `{ path: '/f/:token', element: <SurveyFill /> }`（與 `/login` 同層，不經 `ProtectedRoute`）
- [x] **20.14** vitest：`SurveyFill` render 正確欄位數、token 無效顯示錯誤、送出呼叫 API 正確 payload，3 case 全綠（`npx vitest run` 全專案 15 test 全綠）
- [ ] **20.15** Section milestone：dev 環境实测，手機瀏覽器開 `/f/:token` 走一次完整送出流程（DB migration 已執行；後端合併後隨主後端 dev 部署即可跑，不再等獨立 Zeabur 服務）

---

## Section 3：後台認證骨架

- [x] **20.16** LINE Login OAuth 起始 + callback 路由（原 `kj-survey-server/routes/adminAuth.js` → 搬入 `server/routes/survey/adminAuth.js`，見 20.M1；驗簽改複用主後端工具，見 20.M3）
- [x] **20.17** LINE ID token **後端驗簽**（呼叫 LINE 官方 `/oauth2/v2.1/verify` 端點驗簽，絕不信前端傳值；合併後複用 `server/` 既有驗簽實作）
- [x] **20.18** 驗簽通過後 `SELECT role FROM members WHERE line_id = $1`，確認 `role ∈ {管理者, 負責人, 開發者}`
- [x] **20.19** Session 設計：簽發短效期（4 小時）JWT 存 httpOnly + Secure + SameSite=Lax cookie，不設 Max-Age（session cookie，關瀏覽器即失效），不落地 localStorage
- [x] **20.20** Unit test：驗簽/角色比對/session 簽發驗證/middleware 放行擋下，共 15 個 case（`adminAuthService.test.js` + `requireAdminSession.test.js` + `adminAuth.test.js`）全綠
- [x] ~~**20.21** 管理者綁定 LINE ID 的專屬設定連結~~ **已因架構簡化變得不必要**：因 DB 改共用（見 spec.md），角色比對直接查主系統既有 `members.role`，凡是在主系統已經是管理者/負責人/開發者的人，自動就有後台權限，不需要另外在 KJ Survey 綁定一次 LINE ID
- [x] **20.22** 前端：`frontend/src/pages/survey/SurveyAdmin.jsx` 骨架 + 登入閘門（未通過導去 LINE 登入，不共用主系統 `AuthContext`，4 個 vitest 全綠）
- [x] **20.23** `App.jsx` 新增路由 `{ path: '/admin', element: <SurveyAdmin /> }`（與 `/login` 同層）
- [ ] **20.24** Section milestone：dev 環境用非管理者 LINE 帳號測試被擋、管理者帳號測試放行（合併後 `SESSION_SECRET` 設在主後端 dev 環境變數）

---

> **Section 4–7 設計前置**：後台為手機優先儀表板，動任何 UI 前載入 `uidesign` skill；進度視覺化（進度條/彙總）載入 `dataviz` skill。API 前綴一律 `/api/survey/admin/*`（合併後）。

## Section 4：側邊欄（任務清單）+ 首屏完成狀況儀表板（副總核心，打開即見）

- [ ] **20.25** `GET /api/survey/admin/forms`：列出所有 `survey_forms`（側邊欄＝任務清單用，需登入）
- [ ] **20.26** `GET /api/survey/admin/forms/:id/attendance`：後端算好「已完成/未完成」+ 按推薦人分組 + 各組進度 + 整體完成率（全名單比對 `survey_members` vs `survey_submissions.answers.name`）
- [ ] **20.27** 側邊欄元件：列出任務（表單）、顯示任務數、點選切換；手機收合為抽屜/下拉，桌面固定左欄
- [ ] **20.28** 首屏儀表板元件：選定任務後**預設顯示完成進度**——頂部整體完成率 + 按推薦人分組的進度卡片（組標題進度條 `▓▓▓▓░░ 8/12`，組內姓名+星等+✅/❎）；手機單欄堆疊、桌面多欄
- [ ] **20.29** vitest：分組/比對/進度計算正確性 + 儀表板依 attendance 資料正確渲染
- [ ] **20.30** Section milestone：dev 環境用種子資料驗證進度與手算一致，手機視窗確認首屏即見完成狀況

---

## Section 5：明細檢視 + 篩選（次要視圖，從首屏切入）

- [ ] **20.31** `GET /api/survey/admin/forms/:id/submissions`：該任務所有 `survey_submissions`（需登入）
- [ ] **20.32** 明細元件：手機每筆一張卡片（非寬表格橫向捲動）、桌面可展開為表格；是非型狀態 ✅/❎
- [ ] **20.33** 篩選模式：欄位標題/姓名可點（推薦人欄不變）；點姓名→篩「推薦人=該人+本人」；點課程欄→篩 Yes；點星等→篩該星等；同鈕再點取消；單條件互斥
- [ ] **20.34** vitest：篩選邏輯（姓名/課程欄/星等三種篩選 + 取消）
- [ ] **20.35** Section milestone：dev 環境跑一輪篩選操作，確認結果正確

---

## Section 6：匯出

- [ ] **20.36** `GET /api/survey/admin/forms/:id/export.csv`：後端直出 CSV
- [ ] **20.37** `GET /api/survey/admin/forms/:id/export.xlsx`：後端用 `exceljs` 直出
- [ ] **20.38** 前端匯出按鈕（CSV / Excel 各一顆）
- [ ] **20.39** Section milestone：dev 環境下載兩種格式，人工開檔確認資料正確

---

## Section 7：表單建立器（發佈新任務，供管理者用）

- [ ] **20.40** `POST /api/survey/admin/forms`（建 draft）、`PATCH /api/survey/admin/forms/:id`（編輯欄位）、`POST /api/survey/admin/forms/:id/publish`（draft→published，若無 token 則產生）
- [ ] **20.41** 前端建立器 UI：手打欄位（key/label/type/options）；欄位型態含 `text`/`searchable_select`/`yesno`（`upload` 為 Phase 2，見 spec.md）
- [ ] **20.42** 預覽：套用 `SurveyFill` 的 render 邏輯，唯讀模式預覽
- [ ] **20.43** 發佈鈕 + 發佈後顯示連結 + 複製連結按鈕
- [ ] **20.44** vitest：建立器欄位增刪、預覽渲染、發佈後 token 顯示
- [ ] **20.45** Section milestone：dev 環境手動建一張新表單（任務）、發佈、用產生的連結實際填一次

---

## Section 8：`_worker.js` + 收尾

- [x] ~~**20.47** `_worker.js` 新增 `/survey-api/*` 代理規則~~ **改為移除**（見 20.M7）：後端合併後 `/api/survey/*` 走既有 `/api/*` 代理，不需獨立代理段
- [ ] **20.48** 確認 `/f/:token` 與 `/admin` 在 `_worker.js` 靜態資源 fallback 邏輯下正常走 SPA（非 `/api/*` 的路徑要 fallback 到 `index.html`）
- [ ] **20.49** Integration test：dev 環境完整跑一次「建任務（表單）→ 分享連結 → 填寫 → 後台首屏看完成狀況 → 切明細 → 篩選 → 匯出」全流程
- [ ] **20.50** README.md 更新（依 `readme.md` 規則，推送前必做）

---

## 執行前提醒

- 後端合併後，Section milestone 隨主後端 dev 部署即可跑，**不再需要在 Zeabur 手動新增服務**。DB migration（Section 0）已執行完成。
- CCR 沙箱連不到 Zeabur（`.claude/now.md` 已知地雷），所有「Section milestone」與 DB Console 操作都需使用者本機或 Zeabur Dashboard 執行，Claude 只能出指令/程式碼。
- 建議實作順序：先做 **Section M（後端合併）** 讓架構歸位，再往 Section 4（儀表板）推進。
