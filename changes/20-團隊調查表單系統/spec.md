# Change 20 — 團隊調查表單系統（KJ Survey）v4

> 版本沿革：v1 → v2（回應 `審查.md`）→ v3（回應 `審核.md`）→ **v4（本版，回應 `覆核.MD`：
> 4 阻斷歧義 + 4 實作缺口 + 4 驗證項）**。覆核判定「架構正確、只差規格收斂，不需另開 change、不需
> 動 schema、不需推翻架構」——v4 即把剩餘 HOW 全部**寫死到可機械實作**。本 spec 為唯一事實來源。
>
> DB 三表已建於 dev/prod/backup，schema 不動。原則不變：放棄舊 `[x]`、乾淨重規劃、保留已驗證 code。

## 背景（未變）

主系統對部分成員過於龐大；本功能是折中的獨立極簡調查表單。兩端不對稱：夥伴端免登入零打字；
管理者端求有力（篩選/匯出/揪未填）。範圍一次到位（含建立器）。

---

## 一、地基決策（2026-07-18 定案）

| # | 決策 |
|---|---|
| **D-A 認證** | Survey 真驗簽：LINE 官方 verify → 自簽短效 bearer JWT（記憶體，非 cookie） |
| **D-B token** | 建 draft 即發 token，不動 schema |
| **D-C 範圍** | 乾淨重規劃、保留已驗證 code |
| **D-D members 揭露** | 綁 published token + 只回 confirmed + 僅 `name`+`star_rank` |
| **D-E 濫用防護** | body size 上限 + rate limit + 重複送出並存 |
| **D-F OAuth state** | 簽章式 state：HMAC(`SESSION_SECRET`) + nonce + 10 分 exp + 一次性 |
| **D-G 撤權延遲** | `requireAdminSession` 每次重查 DB role；JWT 不放 role |
| **D-H callback origin（覆核 B-1）** | **經 Worker proxy**：callback 登記 `{FRONTEND_URL}/survey-api/admin-auth/line-callback`，token 交換 `redirect_uri` 用同一字串。**不用**後端裸 origin |
| **D-I nonce store（覆核 B-2）** | **process memory `Map`（單 instance）** + 10 分 TTL + callback 原子 consume；接受「服務重啟使未完成登入失效」。**前提：Survey 後端單 instance**（此規模成立；若日後多 instance 需指揮官改共享 store） |
| **D-J rate-limit 政策（覆核 B-3）** | `app.set('trust proxy', 1)`（Zeabur/CF 前有 proxy）；key = 已解析 client IP + form id；`windowMs`=15 分；`max`=10；超限 `429 {error:'too_many_requests'}`；無效 token → 仍按 IP 計，不因換 token 規避 |

---

## 二、三輪審核處置對照（摘要）

審查（B-1/B-2/H-1~3/D-1）、審核（B-1~3/H-1~5/M-1~4）已於 v2/v3 落實。**覆核（本版 v4）**：
B-1 callback origin→D-H；B-2 nonce store→D-I；B-3 rate-limit→D-J；B-4 tasks 排序→八節重排 + tasks 依執行順序；
H-1 驗證數值→六節；H-2 state 白名單→三節（無 returnMeta，防 open redirect）；H-3 transaction client 邊界→四節+tasks；
H-4 PUB 所有權拆分→八節 PUB-A~D；M-1~4→十節 milestone 驗證項。

---

## 三、後台認證（重建，Claude 親自）

### 前置依賴（H-1 審核）
`package.json`+lockfile 加 `jsonwebtoken`；`.env.example` 補 `LINE_CHANNEL_ID`/`LINE_CHANNEL_SECRET`/`APP_URL`/`FRONTEND_URL`/`SESSION_SECRET`/callback URL 並移除舊 header 註解；啟動缺 `SESSION_SECRET` 等 fail-fast；測試用獨立測試 secret。

### URL（D-H，全程一致，dev/prod 各一組佔位待 Section 0 校準）
- 瀏覽器登入入口：`{FRONTEND_URL}/survey-api/admin-auth/line-login`
- LINE 登記 callback（= token 交換 `redirect_uri`）：`{FRONTEND_URL}/survey-api/admin-auth/line-callback`（**經 Worker proxy 去前綴 → 後端 `/admin-auth/line-callback`**）
- 範例 dev：`https://kjcs-dev.pages.dev/survey-api/admin-auth/line-callback`；prod：`https://kj-champion-system.pages.dev/survey-api/admin-auth/line-callback`
- 成功返回：`{FRONTEND_URL}/admin#token=<jwt>`；失敗：`{FRONTEND_URL}/admin?authError=<code>`

### state（D-F + H-2 審核：白名單，防 open redirect）
- **state payload schema 僅 `{ nonce, iat, exp }`**（**不含任何使用者可控 return URL / origin**）。成功/失敗目的地由後端 `FRONTEND_URL` 固定組出 `/admin`，state 不參與決定 redirect 目標。
- 產生：`state = base64url(payload) + '.' + HMAC-SHA256(payload, SESSION_SECRET)`。
- nonce 存 process memory `Map<nonce,{exp}>`（D-I），10 分 TTL，定時清理。
- callback 驗：簽章正確 + 未過期 + **nonce 存在且原子 consume（驗證前刪除，重放第二次即失敗）**；任一失敗導 `?authError=`，不洩細節。

### 驗簽 + JWT + middleware
1. callback 以 code 換 id_token（`redirect_uri` = D-H 登記值）→ LINE `oauth2/v2.1/verify` 驗簽。
2. `sub` → `SELECT role FROM members WHERE line_id=$1` → `role ∈ {管理者,負責人,開發者}`。
3. 通過 → 自簽 JWT（exp 4h，payload `lineId`，不放 role）→ `/admin#token=`。
4. 前端讀 fragment → 記憶體存 → 清 fragment → 帶 `Authorization: Bearer`。
5. `requireAdminSession`：驗 JWT 簽章+exp → 取 lineId → **重查 DB role**（D-G）→ 掛 req.admin；401/403。廢棄 `requireAdminRole.js`。

---

## 四、前台（`/f/:token`，保留骨架 + 硬化）

### 送出驗證（H-2 審核，見六節 schema）
`validateAnswers(form, answers)` 純函式：object、required 齊全、key 白名單、`yesno∈{'yes','no'}`、static select∈`options.values`、text≤500。失敗 → **400 `{ error:'validation_failed', field, reason }`**，不寫 DB。

### transaction（H-3 審核，client 邊界）
「查 form → 建 pending members → 寫 submission」用**單一 client**：`pool.connect()` 取 client → `BEGIN` → 全程同一 client → error 一律 `ROLLBACK`（保留原 error 主體）→ `finally client.release()`。**`getPublishedFormByToken`/`listMembers` 等 helper 在 transaction 內須接受傳入 client 參數，不得回頭用全域 pool**（避免假 transaction）。

### 濫用防護（D-E + D-J）
`express.json({ limit:'32kb' })`；`express-rate-limit`（Claude 加套件）依 D-J 政策掛 `/forms/:token/submit`；`trust proxy` 設定。同名重複送出**並存**（Table 1 多筆、匯出全列；attendance 只判「至少一筆」）；管理者刪除 submission 本版不做（已知限制）。

### members（D-D）
`GET /forms/:token/members`（綁 token）：無效/非 published→404；只回 `status='confirmed'`；**僅 `name`+`star_rank`**。舊無 token 全欄 `/members` + `listMembers()` **重建**。

### 其餘
`SurveyFill.jsx` 重驗保留；token 無效/非 published/不存在→統一友善錯誤。

---

## 五、後台（`/admin`，全部經 `requireAdminSession`）

側邊欄列 forms 切換；Table 1 全展開 ✅/❎ + 篩選（星等/課程按鈕、推薦人下拉選單，單條件互斥，同鈕取消／下拉選回「全部」清空；姓名不篩選，M.3 驗收後改版）；
未填名冊（confirmed 母數、recommender 分組 + 進度條）；建立器見下。

### 建立器 form 驗證（H-4 審核 + H-1 覆核：精確數值）
- `title`：非空、≤ 200 字。
- `fields`：陣列、**≤ 50 個**。
- field `key`：regex `^[a-z][a-z0-9_]*$`、≤ 40 字、**同表單內唯一**。
- field `label`：非空、≤ 100 字。
- `type ∈ {text, searchable_select, yesno}`（`upload` Phase 2、**不可發布**）。
- static `searchable_select` `options.values`：陣列、≤ 100 項、單項 ≤ 100 字、**去重、不允許空字串**。
- `patchForm`：空 object → 400（無可改）；未知欄位/`null` → 400 `{error:'invalid_form', field, reason}`；找不到 id → 404；**published 表單不可 patch → 409**。
- `publishForm`：找不到 id → 404；**空 fields 不可 publish → 400**；已 published 再 publish → 不重產 token、回現狀。
- 驗證失敗統一 body：`{ error, field?, reason }`。

### 匯出（M-2 審核）
CSV：依 fields 欄序、逸出逗號/引號/換行、**公式字首 `= + - @` 前置 `'` 中和**；xlsx `exceljs`。不做 Google Sheet。

---

## 六、欄位 / answer schema（唯一定義）

| type | 必要屬性 | answer 合法型態 |
|---|---|---|
| `text` | key,label | string ≤ 500 |
| `yesno` | key,label | `'yes'`\|`'no'` |
| `searchable_select` | key,label,options | string；static：∈`options.values`；member-sourced：`options.source='survey_members'` |
| `upload` | — | — Phase 2 預留，不 render、不可發布 |

- **legacy `required` 相容**：缺 `required` → 視為 `true`（同現有 `SurveyFill` 全必填）。建立器可編輯 `required` 存入 fields JSON。
- Phase 1 固定表單 8 欄沿用，視為全 required。

---

## 七、既有 code 去留

`config/db.js`/`server.js`/`health.js` 保留（重驗，補共用 async error middleware，M-3 審核）；`formService.js` 保留+擴充；
`routes/members.js`+`listMembers()` **重建**（D-D）；migration+三庫保留（不動 schema）；`SurveyFill.jsx`+`surveyApi.js`(前台) 保留(重驗)；
`adminAuth.js(/me)`/`requireAdminRole.js`/`adminAuthService.js` 重建（真驗簽+JWT+`requireAdminSession`）；`SurveyAdmin.jsx`(登入) 重建。

> M-4 覆核：靜態掃描仍見 v1/v2 舊模式（header 認證、無 token members、舊 env）**屬預期**——它們已列重建/更新 task；
> 真正 gate 是對應 task 完成後的 jest + diff review，不因掃到舊 code 判 spec 未落實。

---

## 八、Codex 委派 + 執行順序（覆核 B-4 重排 + H-4 拆包）

分工依 `AGENTS.md`：Codex 做機械性後端純函式 + jest；**認證/UI/部署/DB/加套件一律 Claude 或使用者**。

### 兩道 gate（M-4 審核）
- **實作 gate**：spec v4 各決策 + deps/env 更新完成即過 → 離線 code+jest 不被部署卡住。
- **milestone gate**：服務 URL/env/DB/部署完成 → 才跑 dev integration。

### 工作包（PUB 依覆核 H-4 拆成不重疊所有權子包）
| 包 | 內容 | 所有權檔案 |
|---|---|---|
| **AUTH**（Claude） | 三節：deps/env/state/verify/JWT/middleware/前端登入 | `package.json`、`.env.example`、`routes/adminAuth.js`、`middleware/requireAdminSession.js`、`services/adminAuthService.js`、`SurveyAdmin.jsx`、`surveyApi.js`(admin 部分) |
| **PUB-A**（Claude） | deps(`express-rate-limit`)、rate-limit 設定、`trust proxy`、body limit、async error middleware | `package.json`、`server.js` |
| **PUB-B**（Codex） | `validateAnswers` + 送出 transaction（client 邊界）+ jest | `services/formService.js`(+helper client 參數)、其 test |
| **PUB-C**（Codex） | members 重建（綁 token/confirmed/最小欄位）+ jest | `services/formService.js`(members 查詢)、`routes/forms.js`(members route)、其 test |
| **PUB-D**（Claude） | 送出/ members route 接線 + 前端配合 + integration | `routes/forms.js`(送出)、`SurveyFill.jsx`、`surveyApi.js`(前台) |
| **CX-1**（Codex） | admin 讀取 + 建 `routes/admin.js` + server.js 唯一註冊 | `routes/admin.js`(新)、`server.js`(註冊行)、`formService.js`、test |
| **CX-2**（Codex） | `computeAttendance`(confirmed) + attendance route | `services/attendanceService.js`(新)、`routes/admin.js`(追加)、test |
| **CX-3**（Codex） | 匯出 CSV(公式中和)/xlsx | `services/exportService.js`(新)、`routes/admin.js`(追加)、test |
| **CX-4**（Codex） | 建立器 create(token)/patch/publish + form 驗證 | `formService.js`、`routes/admin.js`(追加)、test |
| 前端（Claude） | 側邊欄/Table1/篩選/未填名冊/建立器 UI/匯出鈕 | `frontend/` |
| 部署/milestone（使用者） | Section 0 + dev 實測 | — |

> 共用檔紀律：`server.js` 只 PUB-A 與 CX-1 動（PUB-A 掛中介、CX-1 加 `/admin` 註冊，兩者不同區塊）；`routes/admin.js` CX-1 建、CX-2/3/4 追加不覆蓋；`formService.js` 多包動 → **序列**，每包先 pull 最新。

### 唯一執行順序（機械可循，不靠解讀例外）
AUTH → PUB-A → PUB-B → PUB-C → PUB-D → CX-1 → CX-2 → CX-3 → CX-4 → 前端 UI → milestone。
每包 jest 綠 + 指揮官 review diff 才發下一包。

---

## 九、Sub-agent 平行執行配置

Claude 自身 sub-agent **單線**（共用 `server.js`/`routes/admin.js`/`formService.js`/`SurveyAdmin.jsx`，且認證屬安全核心，平行只增衝突）；Codex 跨進程**序列**點狀委派，每包指揮官 gate；收尾全完成後才交收尾員（Haiku）。

## 十、驗證 gate（誰跑 + M-1~3 覆核驗證項）

| Gate | 執行者 | 方式 / 驗證項 |
|---|---|---|
| 後端 jest（每包） | Claude(AUTH/PUB-A) / Codex(純函式包) | `cd kj-survey-server && npx jest <模組>` |
| 前端 vitest | 使用者 PC | `cd frontend && npx vitest run` |
| milestone（dev） | 使用者/Zeabur | Survey dev 服務 + `SESSION_SECRET` 到位後手動 |

milestone 須額外人眼驗證（覆核 M-1~3）：① confirmed 名單經 token 分享後仍全揭露 → 使用者確認可接受（M-1）；
② **F5/PWA reload/crash 後登出**屬預期非 bug，須實測（M-2）；③ 同名兩筆 submission → attendance `filled` 不會變 2、進度不超過 total（列入 CX-2 jest + milestone，M-3）。

> 規劃者說明：本機 win32 + CCR 沙箱 npm/node 不可用（`.claude/now.md`），jest/vitest 規劃者未在本機實跑；
> 後端 jest 由 VPS Codex/使用者跑、前端 vitest 由使用者 PC 跑並回報綠燈。環境限制下的誠實標註。

## 十一、commit 與驗收

每包由指揮官 review 後 commit，訊息標 `(auth)`/`(pub-x)`/`(codex CX-N)`；不要求 Codex 自行 commit/push。
不以 commit 數驗收；**使用者手動 commit 屬正常例外**，不得為湊數 squash/拆分。驗收看 tasks 勾選 + jest/vitest 綠 + review + dev milestone。
