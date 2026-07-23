# Change 20 — 團隊調查表單系統 Tasks（v4）

> v4：回應 `覆核.MD`。**tasks 依 spec 八節「唯一執行順序」重排**（覆核 B-4）：實作項在前、
> 部署/milestone 外部依賴移到最後且標非阻塞。標註 `[Codex CX-N]`/`[Claude]`/`[使用者]`。
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

## Section U：使用者外部依賴（**非阻塞離線實作**，dev milestone 前完成）

> 這些不擋 Section 1-7 的離線 code+jest（覆核 B-4 / M-4）；與實作並行，dev 實測前到位即可。

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
- [ ] **M.6** `[使用者]` Integration：建表單→分享→填寫(含被擋)→登入(非管理者被擋)→查看→篩選→未填名冊→匯出

---

## 執行前提醒

- **唯一順序**：AUTH → PUB-A → PUB-B → PUB-C → PUB-D → CX-1 → CX-2 → CX-3 → CX-4 → 前端 UI →（Section U 並行）→ Section M。每包 jest 綠 + 指揮官 review diff 才發下一包。
- **共用檔紀律**（spec 八節）：`server.js` 只 PUB-A + CX-1 動；`routes/admin.js` CX-1 建、CX-2/3/4 追加不覆蓋；`formService.js` 多包序列、每包先 pull。
- **Codex 通則**：先讀 `AGENTS.md`+`spec.md` 對應段，比照既有寫法，不 import 主系統 `server/`、不自行加套件（加套件回交 Claude），只跑該模組 jest，連續 2 次同錯停手交還。
- CCR/win32 連不到 Zeabur、跑不動 npm（`.claude/now.md`）：Section U/M 走使用者本機/Zeabur；後端 jest 走 VPS Codex，前端 vitest 走使用者 PC。
