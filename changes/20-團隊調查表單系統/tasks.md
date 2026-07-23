# Change 20 — 團隊調查表單系統 Tasks（v5）

> v5：保留 v4 對 `覆核.MD` 的處置，並依 spec 十二節加入表單建立器、草稿預覽與填寫頁重新設計。
> 實作項在前，部署/milestone 外部依賴置後且標非阻塞。標註 `[Codex CX-N]`/`[Claude]`/`[使用者]`。
> 數值/HOW 全在 `spec.md` v4 寫死，實作者不需自補。分支 `m_b_調查表單`。
>
> Section 1-7（AUTH → PUB → Table1 → 未填名冊 → 匯出 → 建立器前後端 → `_worker.js` 確認 + README）
> 全數完成。**剩下只有 Section U（使用者外部依賴）與 Section M（dev milestone）**，兩者皆非阻塞、
> 由使用者離線完成，不需 Claude 繼續動手。

## Section A：實作 gate（規格已定案）

- [x] **A.1** spec v4 已把覆核 B-1~4 / H-1~4 / M-1~4 全部寫死（callback origin/nonce store/rate-limit 政策/tasks 排序/驗證數值/state 白名單/transaction client 邊界/PUB 拆包）

---

## Section 1：AUTH（Claude 親自，spec 三節）

### 前置依賴（H-1 審核）
- [x] **20.1** `[Claude]` 重驗 `config/db.js`/`server.js`/`health.js` + 新增共用 async error middleware（M-3）；既有 route 包 asyncHandler，補 DB failure 路徑 jest
- [x] **20.2** `[Claude]` `package.json`+lockfile 加 `jsonwebtoken`；`.env.example` 補 LINE_CHANNEL_ID/SECRET/APP_URL/FRONTEND_URL/SESSION_SECRET/callback URL（移除舊 header 註解）
- [x] **20.3** `[Claude]` 啟動缺 `SESSION_SECRET` 等必要 secret → fail-fast；測試用獨立測試 secret

### OAuth + state + JWT（spec 三節，全數值已定死）
- [x] **20.4** `[Claude]` `GET /admin-auth/line-login`：state payload `{nonce,iat,exp}` + HMAC 簽章；nonce 進 process memory Map(10m TTL)；導 LINE authorize，`redirect_uri`=`{FRONTEND_URL}/survey-api/admin-auth/line-callback`（D-H）
- [x] **20.5** `[Claude]` `GET /admin-auth/line-callback`：驗 state（簽章/exp/**原子 consume nonce**）→ code 換 id_token（redirect_uri 同上）→ LINE `oauth2/v2.1/verify`；error/缺 code/state 失敗 → `{FRONTEND_URL}/admin?authError=`
- [x] **20.6** `[Claude]` 驗簽 sub → 查 members.role → 自簽 JWT（exp 4h，payload lineId，不放 role）→ `/admin#token=`
- [x] **20.7** `[Claude]` `middleware/requireAdminSession.js`：驗 JWT 簽章+exp → **重查 DB role**（D-G）→ req.admin；廢棄 `requireAdminRole.js`
- [x] **20.8** `[Claude]` jest：state 成功/缺/竄改/過期/**重放(consume 後第二次失敗)**、LINE 驗簽成敗、角色比對、JWT 簽發/驗證、middleware 放行/擋(無/過期/竄改/已撤權)、**state 不含 return URL → 無 open redirect**
- [x] **20.9** `[Claude]` `SurveyAdmin.jsx` 登入改造：讀 `#token`→記憶體存→清 fragment→帶 Bearer；未登入導 `{FRONTEND_URL}/survey-api/admin-auth/line-login`；`authError` 顯示
- [x] **20.10** `[Claude]` `surveyApi.js` admin 請求改帶 Bearer（移除 X-Line-User-Id）；vitest

---

## Section 2：PUB（前台硬化，覆核 H-4 拆不重疊子包）

### PUB-A（Claude：infra/套件）
- [x] **20.11** `[Claude]` `server.js`：`express.json({limit:'32kb'})`、`app.set('trust proxy',1)`、加 `express-rate-limit`（依 D-J：key=client IP+form id、window 15m、max 10、429 JSON）掛 `/forms/:token/submit`

### PUB-B（Codex：送出驗證 + transaction）
- [x] **20.12** `[Codex CX-PUB-B]` `validateAnswers(form,answers)` 純函式（六節 schema：required 齊全/key 白名單/yesno∈{yes,no}/static∈options.values/text≤500；缺 required 視為 true）
- [x] **20.13** `[Codex CX-PUB-B]` 送出 transaction：`pool.connect()` client → BEGIN → 全程同 client → error ROLLBACK(保留原 error) → finally release；`getPublishedFormByToken`/`listMembers` helper 接受傳入 client（不回頭用 pool）
- [x] **20.14** `[Codex CX-PUB-B]` jest：各驗證 pass/fail、transaction rollback（pending 寫入後 submission 失敗 → 無孤兒 pending）、helper 用傳入 client

### PUB-C（Codex：members 重建）
- [x] **20.15** `[Codex CX-PUB-C]` `GET /forms/:token/members`：綁 published token（無效/非 published→404）、只回 confirmed、僅 name+star_rank
- [x] **20.16** `[Codex CX-PUB-C]` jest：無 token/無效 token→404、只回 confirmed、欄位白名單（無 id/status/recommender/pending）

### PUB-D（Claude：接線 + 前端）
- [x] **20.17** `[Claude]` `routes/forms.js` 送出路由接 validateAnswers+transaction（失敗 400 `{error,field,reason}`）；`SurveyFill.jsx`/`surveyApi.js` 改帶 token 取名單

---

## Section 3：後台 Table 1 讀取 + UI

- [x] **20.18** `[Codex CX-1]` 建 `routes/admin.js`：`GET /admin/forms`、`GET /admin/forms/:id/submissions`（過 `requireAdminSession`）；`server.js` 唯一註冊 `app.use('/admin',...)`
- [x] **20.19** `[Codex CX-1]` jest：無 bearer→401、非管理者→403、管理者→200+筆數
- [x] **20.20** `[Claude]` 側邊欄列 forms 切換
- [x] **20.21** `[Claude]` Table 1 全展開 ✅/❎
- [x] **20.22** `[Claude]` 篩選：點欄位表頭彈出選單（星等/推薦人/各課程 yesno 欄皆可篩，選「全部」清空，單條件互斥）+ vitest——M.3 驗收時使用者兩輪要求改版：v1 拿掉姓名鈕、推薦人改下拉（`fcbd711`／`6861158`），v2 再改成篩選直接做在表頭上（`SubmissionsTable.jsx` 全面重寫，`ColumnHeader` 元件 + 點外部關閉選單）

---

## Section 4：未填名冊（confirmed 母數）

- [x] **20.23** `[Codex CX-2]` `attendanceService.js` `computeAttendance`（應填=confirmed、已填=精確比對、recommender 分組+進度、無推薦人歸一組、**同名兩筆 filled 不變 2**）
- [x] **20.24** `[Codex CX-2]` `GET /admin/forms/:id/attendance`（過 `requireAdminSession`）追加 `routes/admin.js`（勿重複註冊/覆蓋）
- [x] **20.25** `[Codex CX-2]` jest：pending 不計母數、分組/進度、未填 false、罕用字精確、無推薦人分組、**同名重複不超 total**（M-3 覆核）
- [x] **20.26** `[Claude]` 切換鈕 + 點名表 UI（分組/進度條/姓名星等✅❎）

---

## Section 5：匯出（M-2）

- [x] **20.27** `[Codex CX-3]` `exportService.js`：`toCsv`（欄序/逸出/**公式字首中和**）、`toXlsxBuffer`（exceljs）
- [x] **20.28** `[Codex CX-3]` `GET /admin/forms/:id/export.csv`/`.xlsx`（過 `requireAdminSession`，Content-Type/Disposition）追加 `routes/admin.js`
- [x] **20.29** `[Codex CX-3]` jest：欄序、yesno、逸出、**公式中和**、xlsx buffer 非空
- [x] **20.30** `[Claude]` 匯出鈕（CSV/Excel，blob 帶 bearer）

---

## Section 6：表單建立器（D-B token + H-4 驗證，數值見 spec 五節）

- [x] **20.31** `[Codex CX-4]` `formService.js`：`createDraftForm`（建即產 token，status=draft）、`patchForm`、`publishForm`（只切 status 不重產）
- [x] **20.32** `[Codex CX-4]` form 驗證（title≤200；fields 陣列≤50；key `^[a-z][a-z0-9_]*$`≤40 唯一；label≤100；type∈{text,searchable_select,yesno}；options.values≤100 項/≤100 字/去重/非空；patch 空/未知/null→400；published patch→409；空 fields publish→400；無 id→404）
- [x] **20.33** `[Codex CX-4]` `POST /admin/forms`、`PATCH /admin/forms/:id`、`POST /admin/forms/:id/publish`（過 `requireAdminSession`）追加 `routes/admin.js`
- [x] **20.34** `[Codex CX-4]` jest：draft 有 token+draft、patch 只改帶入、publish 切 published 不重產、已 published 再 publish 不變、各 form 驗證 fail、published patch→409、空表單 publish→400
- [x] **20.35** `[Claude]` 建立器 UI（欄位 key/label/type/options/required）+ 預覽（SurveyFill 唯讀）+ 發佈鈕/連結/複製 + vitest

---

## Section 7：`_worker.js` + 收尾

- [x] **20.36** `[Claude]` 確認 `_worker.js` `/survey-api/*`（含 `/survey-api/admin-auth/*`）代理 + SPA fallback（`/f/:token`、`/admin`→index.html）——既有通用邏輯已涵蓋，無需改動程式碼
- [x] **20.37** `[Claude]` README.md 更新（推送前必做）

---

## Section 8：表單建立器與填寫頁重新設計（v5）

> 規格依據：`spec.md` 十二節；視覺參考：`新增表單重新設計線框圖.md`。依 20.38 → 20.46 順序執行，
> 每項完成 source、對應測試與 review 後才能勾選。

- [x] **20.38** `[Claude]`（原標 Codex CX-5，直接自己做）新增受 `requireAdminSession` 保護的 `GET /admin/members`：沿用既有 `listConfirmedMembers`（已存在，只回 confirmed 的 `{name,star_rank}`）；jest 涵蓋成功、空名冊、未登入、撤權與 DB error（`buildApp` 補掛 `errorHandler` 才能測到 500 分支）；不動 schema/migration
- [x] **20.39** `[Claude]` `surveyApi.getAdminMembers()` + `useAdminMembers` hook（loading/error/empty/retry 四態，供 20.41/20.44 消費）；`getMembersByToken`（公開端點）未動、既有測試仍全綠；vitest 15 案例（API client 1 + hook 4，另加既有 surveyApi 案例回歸）
- [x] **20.40** `[Claude]` `FormFieldsPreview.jsx` 每題各自一張卡片（`questionCardStyle`）+ 必填星號（`required!==false`）；`SurveyFill.jsx` 標題區改獨立卡片、修正 `validate()` 舊版忽略 `required` 的 bug（`required:false` 可留空、legacy 缺 `required` 仍必填）；新增 `FormFieldsPreview.test.jsx` + `SurveyFill.test.jsx` 補兩案例，vitest 全套 77 案例綠
- [x] **20.41** `[Claude]` `FormBuilder.jsx` 全面重製：移除舊版左右分欄常駐預覽（設計原則 1），改單欄標題卡＋問題卡；一次一題展開編輯、其餘顯示摘要卡（點摘要卡切換焦點）；key 維持手動輸入、永遠可見（**未採用之前線框圖討論的「自動產生+隱藏」，依 spec.md 十二節 12.1「key 不自動產生、不隱藏」為準**）；source 切換明確產生 `{source:'static',values:[...]}` 或 `{source:'survey_members'}`（修正舊版少 `source` 導致後端驗證會擋的 bug）；vitest 12 案例（含新增：焦點/摘要切換、兩種 source 序列化）。**排序/複製/刪除確認 Dialog 留給 20.42、獨立互動預覽留給 20.44**，不在本項範圍
- [x] **20.42** `[Claude]` 原生 HTML5 drag（把手 `⋮⋮` dragstart + 卡片 dragover/drop，不引入拖曳套件）＋鍵盤上移/下移（▲▼按鈕，disabled 邊界）＋複製題目（key 原樣保留會重複，inline error 立即標示，不靜默改寫）＋刪除確認 Dialog。**專案沒有共用 `useConfirm()`/Feedback 元件**（change 12 已於 2026-07-11 封存廢除，非「尚未實作」），改仿 `ConfirmLeaveDialog.jsx` 視覺規範做 `DeleteQuestionDialog.jsx` 僅供本頁用，不冒充全站共用元件；vitest 全套 85 案例綠、build 通過
- [x] **20.43** `[Claude]` dirty 追蹤（`FormBuilder` 內比對目前 title/fields 序列化 vs 最近一次成功儲存快照）；`useDirtyGuard` 用 `useBlocker` 攔截應用程式內導航 + `beforeunload` 攔重整/關閉；`onDirtyChange` 回報給 `SurveyAdmin`，切換表單/新增/登出改走 `guardedAction`，dirty 時彈 `ConfirmLeaveDialog`（沿用既有元件，餵一個相容 `{state,reset,proceed}` 的假 blocker，不用重寫對話框）；成功儲存才清 dirty、失敗保留。FormBuilder.test.jsx／SurveyAdmin.test.jsx 補 router 包裝（`useBlocker` 需要 data router）+ dirty 相關案例，vitest 全套 91 案例綠、build 通過
- [x] **20.44** `[Claude]` 新增 `FormPreview.jsx`（獨立於編輯狀態，直接吃 `FormBuilder` 目前未儲存的 title/fields）+ Pill Tab「問題編輯／預覽」切換；用 `useAdminMembers`（20.39）載入真實 confirmed 名單，loading/error(+重試)/empty 皆有 inline 狀態；共用 `FormFieldsPreview`（20.40）非唯讀模式可實際操作，送出鈕固定 disabled 不建立 submission；預覽用條件渲染掛載/卸載，切走再切回即重置答案。新增 `FormPreview.test.jsx`（6 案例）+ `FormBuilder.test.jsx` 補 2 案例（tab 切換、重開重置答案），vitest 全套 99 案例綠、build 通過
- [x] **20.45** `[Claude]` `validateForPublish()` 鏡射後端 `formService.js` 五節規則（title/key 格式唯一/label/static 選項非空不重複），發布前先本地驗證；有錯誤不開確認對話框、inline 顯示、自動展開第一個錯誤題目並捲動聚焦；驗證通過才開 `PublishConfirmDialog`（不可逆確認，取消不呼叫 API）；已發佈表單題目改乾淨唯讀摘要（拿掉 disabled input，只留 label+題型，也拿掉拖曳/排序/複製/刪除等編輯專用操作）。新增 `PublishConfirmDialog.jsx`；vitest 補 4 案例（標題/key 錯誤擋下、驗證通過取消不送 API、已發佈乾淨摘要），全套 102 案例綠、build 通過
- [x] **20.46** `[Claude]` 移除 `SurveyAdmin.jsx` 固定 `width=1280` viewport 覆寫；側邊欄+內容改 `flex flex-col md:flex-row`（`FormsSidebar` 寬度改 `w-full md:w-[200px]`）、頁面 padding 響應式（`p-4 md:p-8`），避免 360–375px 非必要水平捲動；新增共用 `useDialogA11y` hook（開啟記住觸發焦點+聚焦第一顆按鈕、Escape 等同取消、關閉還焦點給觸發元素），套進 `DeleteQuestionDialog`／`PublishConfirmDialog`／既有共用 `ConfirmLeaveDialog`（後者為既有跨頁共用元件，此為新增能力非破壞性變更）；排序操作（拖曳+上移/下移，20.42 已完成）本來就是原生 `<button>` 可鍵盤操作。補 2 個 Escape 焦點回歸案例（FormBuilder 刪除確認、SurveyAdmin 離頁攔截），vitest 全套 104 案例綠（含 4 次全套重跑穩定）、build 通過

---

## Section U：使用者外部依賴（**非阻塞離線實作**，dev milestone 前完成）

> 這些不擋 Section 1-8 的離線 code+jest/vitest（覆核 B-4 / M-4）；與實作並行，dev 實測前到位即可。

- [x] **U.1** `[使用者]` Survey dev/prod 服務網址 + Root Directory=`kj-survey-server/` + start command（dev：`kj-survey-dev.zeabur.app`，建於 `kj-champion-dev` 專案內）
- [x] **U.2** `[使用者]` 環境變數：DB 內網、LINE_CHANNEL_ID/SECRET、APP_URL/FRONTEND_URL、強隨機 SESSION_SECRET、callback URL（dev 已填齊，`PORT=8080` 對齊 Zeabur 容器埠）
- [x] **U.3** `[使用者]` LINE Developers 登記 dev/prod callback URL（= `{FRONTEND_URL}/survey-api/admin-auth/line-callback`，與程式完全一致）——**沿用主系統既有 LINE Login Channel（`2008916605`）而非獨立新建**，屬使用者本次明確決定，與 spec/README 原「獨立於主系統 Channel」描述不同，待收尾一併記錄
- [x] **U.4** `[使用者]` dev DB 種子 40 人罕用字 + 推薦人歸屬人工核對（`survey_members` 表已存在 40 筆，內容與 `001_init_survey_tables.sql` 種子完全吻合，使用者已核對組織圖無誤）

---

## Section M：dev milestone（U 完成後，使用者）

- [x] **M.1** `[使用者]` 認證：非管理者被擋、管理者放行、**撤權後 token 立即失效**、**F5/PWA reload/crash 後需重登（預期非 bug，M-2 覆核）**——過程中發現並修復 PWA Service Worker 攔截 LINE callback 導致誤入前台的 bug（見 `診斷報告.md` + commit `2949cf3`）；撤權驗證：F5 重整後立即被擋，切 Tab/看已載入資料不觸發新請求故不會即時反應（設計如此，非漏洞）
- [x] **M.2** `[使用者]` 前台送出：非法值/超量/超頻被擋（400/429）；正常送出寫入——直接打 API 驗證：正常送出 200、非法 star_rank/缺必填皆 400、連續 11 次請求第 11 次準確被 429 擋下（15 分鐘 10 次額度）；過程中補了 Table 檢視「複製連結」按鈕（commit `fcbd711`）
- [x] **M.3** `[使用者]` 未填名冊分組/進度與手算一致、pending 未進母數、同名重複不超 total（M-3 覆核）——母數 40（不含 pending 測試甲）、推薦人分組正確、已填/未填狀態正確；驗收過程中兩輪改版 Table 1 篩選 UI（commit `6861158`/`5f183f7`/`821db01`）
- [x] **M.4** `[使用者]` 匯出 CSV/xlsx 開檔確認（含公式中和）——CSV/Excel 皆正常開啟，欄序與檔名（表單標題）正確
- [x] **M.5** `[使用者]` confirmed 名單經分享 token 仍全揭露 → 人眼確認可接受（M-1 覆核隱私驗收）——使用者確認此揭露方式為原始需求，可接受
- [ ] **M.6** `[使用者]` v5 Integration：建立含 text/yesno/static select/member select 與 required/optional 的新表單 → 驗證重複 key、空標題、空/重複選項會被擋 → 排序/鍵盤移動、複製、取消與確認刪除 → 修改後逐一驗證切換表單/新增/登出/離頁攔截 → 儲存草稿 → 預覽以真實 confirmed 名冊搜尋且不產生 submission → 取消一次發布後再確認發布 → 分享連結 → 公開頁逐題填寫並驗證 required 被擋、optional 可空 → 管理者登入查看/篩選/未填名冊/匯出；同時人眼驗證 1280px、平板、375px、360px 無功能遺失與非必要水平捲動

---

## 執行前提醒

- **唯一順序**：AUTH → PUB-A → PUB-B → PUB-C → PUB-D → CX-1 → CX-2 → CX-3 → CX-4 → 舊版前端 UI → CX-5 → v5 前端 UI →（Section U 並行）→ Section M。每包 jest/vitest 綠 + 指揮官 review diff 才發下一包。
- **共用檔紀律**（spec 八節/十二節）：`server.js` 只 PUB-A + CX-1 動；`routes/admin.js` CX-1 建、CX-2/3/4/5 追加不覆蓋；`formService.js` 多包序列、每包先 pull。
- **Codex 通則**：先讀 `AGENTS.md`+`spec.md` 對應段，比照既有寫法，不 import 主系統 `server/`、不自行加套件（加套件回交 Claude），只跑該模組 jest，連續 2 次同錯停手交還。
- CCR/win32 連不到 Zeabur、跑不動 npm（`.claude/now.md`）：Section U/M 走使用者本機/Zeabur；後端 jest 走 VPS Codex，前端 vitest 走使用者 PC。
