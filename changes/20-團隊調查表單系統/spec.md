# Change 20 — 團隊調查表單系統（KJ Survey）

> 需求探索已於 CEO（Claude Web Chat）階段完成，產出 README.md / CLAUDE.md 兩份手冊（使用者已上傳，內容納入本 spec 整理）。本文件把手冊內容對應進本 repo 實際結構，並補齊手冊未指定的技術決策。

## 背景

主系統（康九冠軍夥伴系統）功能完整但對部分成員（含副總/紫星 李冠陞）過於龐大、有抵觸感。副總長期苦惱團隊突發事件的「調查」該怎麼做。本功能是**折中方案**：一套極簡調查表單工具，不強迫任何人學主系統。

### 核心理由（change 20 存在的目的）

**這套系統是副總（或副總指定的管理者）在團隊內「發佈任務、追蹤完成狀況」的工具。**

- 一張調查表單 = 一個發佈給團隊的任務。
- 副總／管理者只要登入本系統，就能看到自己發佈的每個任務目前「誰完成了、誰還沒完成」。
- 這**不是新增功能**，而是本 change 打從一開始的用途——只是過去的 spec 用「調查表單 + 未填名冊」的技術語言描述它，本次把定位講白。

核心哲學——**兩端不對稱**：
- 夥伴端：極簡，免登入，幾乎零打字，按按鈕即可。
- 管理者端：不追求簡單，追求有力，但目標裝置是**手機**（副總與開發者主要用手機看結果）。因此管理者端採**手機優先的儀表板**設計（打開即見完成進度），而非傳統寬螢幕後台。

需求來源真實明確（副總本人指定要用），故**不做「先驗證採用率」的最小功能**，範圍一次做到位（含表單建立器）。詳細決策理由見使用者上傳的 README.md，不重複列出。

---

## 範圍對應到本 repo（本 spec 新增的技術決策）

手冊內容（README.md / CLAUDE.md）已完整定義需求與資料結構，以下是手冊未明講、需要落地到「這個 repo 長怎樣」的具體決策：

### 1. 目錄結構

> **決策修正（2026-07-11）：後端由「獨立 `kj-survey-server/`」改為「併入主系統 `server/`」。**
> 原本切獨立服務的兩大理由——獨立 DB、未來新功能基礎——已自我瓦解：DB 早已改成共用同一個 PostgreSQL、LINE channel 也沿用主系統，真正「獨立」的只剩一層 Express 進程外殼。而「當未來新功能基礎」是投機理由，維護兩套後端的成本卻是確定的（兩份部署、兩個 Zeabur 服務、兩套 env、兩條監控）。故合併：省掉兩套部署，並可直接複用主後端的 pg pool 與 LINE 驗簽。代價是進程不再隔離，但 Express 路由層錯誤不會拖垮進程，且此為副總低流量工具，風險可接受。

- **後端**：survey 相關路由**併入既有 `server/`**，掛在 `server/routes/survey/*.js`（例如 `server/routes/survey/public.js`、`server/routes/survey/admin.js`、`server/routes/survey/adminAuth.js`），API 前綴 `/api/survey/*`。複用 `server/` 既有 pg pool 與 LINE 驗簽工具，不另起 Express app、不另建 `package.json`。survey 的 service 邏輯放 `server/services/survey/*.js`。
  - **不需要**獨立 DB、不需要獨立 Zeabur 專案、**不需要在 Zeabur 新增服務**——survey 路由隨主後端一起部署。
- **前端**：**不開新 repo、不開新 Cloudflare Pages 專案**，沿用既有 `frontend/`，新增路由與頁面：
  - `frontend/src/pages/survey/SurveyFill.jsx` → 路由 `/f/:token`（免登入，公開）
  - `frontend/src/pages/survey/SurveyAdmin.jsx` → 路由 `/admin`（獨立 LINE 登入閘門，不經過主系統 `ProtectedRoute`/`AuthContext`）
  - `frontend/src/services/surveyApi.js`（獨立 API 呼叫層，不共用 `api.js`，呼叫路徑前綴 `/api/survey/*`）
  - 原因：手冊明講「沿用主系統既有前端風格」「後台掛在現有系統網域下」，代表同一個前端部署、同一個網域。API 層獨立成 `surveyApi.js`（呼叫路徑與主系統分流在 `/api/survey/*` 前綴），但後端進程與主系統共用。

  路由掛法：`/f/:token` 與 `/admin` 都是**與 `/login` 同層的獨立 route**（不包在 `ProtectedRoute` 裡），因為：
  - `/f/:token` 必須免登入。
  - `/admin` 用自己的 LINE 登入流程（不落地 session），跟主系統的持久登入邏輯不同，不能共用 `AuthContext`。

- **DB**：**不建新 DB、不建新 Zeabur 專案**。三張表直接建在**既有 PostgreSQL**（沿用 `database.md` 既有 dev/prod 雙庫架構）：
  - dev：`kj-champion-dev` 專案 → `postgresql-dev`
  - prod：`kj-champion` 專案 → `postgresql`
  - 表名加 `survey_` 前綴（`survey_members` / `survey_forms` / `survey_submissions`），避免跟主系統既有 `members` 表撞名。
  - survey 路由既已併入 `server/`，直接沿用主後端既有的 DB 連線（`DATABASE_URL` / `DEV_DATABASE_URL`），**無任何新增 Zeabur 服務或連線設定的需求**。

### 2. `_worker.js` 不需新增代理規則（因後端合併）

原本規劃 survey 用獨立後端時，需在 `_worker.js` 新增 `/survey-api/*` → 獨立 Zeabur 後端的代理。**後端合併進 `server/` 後，survey API 前綴改為 `/api/survey/*`，直接落在現有 `/api/*` 代理規則底下，指向同一個主系統 Zeabur 後端。故 `_worker.js` 無需任何新增。**

> 若功能分支上已提前寫入 `/survey-api/*` 代理段（見 tasks 20.47），合併時需**移除**該段，並確認 `surveyApi.js` 呼叫路徑改為 `/api/survey/*`。

### 3. 後台權限比對（因 DB + 後端皆共用而簡化）

手冊要求後台需讀主系統「以 LINE ID 為核心的會員/權限資料」。已確認主系統 schema（`database/schema.sql` + `server/migrations/add_member_role.sql`）：`members.line_id`、`members.role`（`一般人` / `管理者` / `負責人` / `開發者`）。

survey 路由既已併入 `server/`，連的就是主後端**同一個 PostgreSQL**，不需要額外的內部 API，直接下 SQL 查詢即可：

```sql
SELECT role FROM members WHERE line_id = $1
```

- survey 後台登入流程（`server/routes/survey/adminAuth.js`）：LINE ID token 驗簽通過後，直接查 `members.role`，確認 `role ∈ {管理者, 負責人, 開發者}` 才放行。
- 只唯讀既有 `members` 表，不寫入、不動其結構，符合「過渡期不碰主系統既有資料表結構」的鐵律。

### 4. LINE Login 憑證（手冊列為「必須停下回報」，本 spec 已解法）

**沿用主系統既有 LINE Login channel**（`LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET`，同一個 LINE channel），不必使用者另外去 LINE Developers 開新 channel。後端已合併，survey 路由**直接複用 `server/` 既有的 LINE 驗簽工具與環境變數**，不必另填一份 `.env`。

> survey 後台 session 仍維持自己的模型（短效期 JWT／記憶體 session，關頁重登，不共用主系統 `AuthContext` 的持久登入），只是驗簽這一段共用主後端既有實作。

理由：手冊本身沒說要新 channel，只說「因為夥伴本就用 LINE」；沿用同一 channel 對使用者無新開銷，且登入體驗一致。**若使用者希望用獨立 channel，需另外提供 Channel ID/Secret**——本 spec 先以「沿用既有」為預設，執行時遇到才回頭確認。

### 5. 種子資料匯入方式

比照 `database.md` 既有模式：Claude 產生 SQL migration（建表 + 40 人 INSERT），使用者到 Zeabur Console 貼上執行（Claude 無法直連 dev/prod DB 公網）。因是全新表、不影響既有資料，仍依 `database.md` 規則同時提供 **dev / prod / backup** 三份：
- dev：`kj-champion-dev` → `postgresql-dev` → Console
- prod：`kj-champion` → `postgresql` → Console
- backup：`kj-champion` → `postgresql-backup` → Console

---

## 資料結構（沿用手冊定義，逐字對齊）

三張表，建在既有 PostgreSQL（dev: `postgresql-dev`／prod: `postgresql`），表名加 `survey_` 前綴避免撞名：

### `survey_members`（KJ Survey 自己的名單庫，與主系統 `members` 是兩張獨立表）
- `id`, `name`, `star_rank`（enum: 白/綠/橙/紅/紫）, `recommender_name`（字串，v1 不正規化關聯）, `status`（`confirmed`/`pending`）, `created_at`

### `survey_forms`（一張調查表單一筆）
- `id`, `title`, `token`（隨機不可猜字串，前台連結用，不可流水號）, `fields`（JSON 陣列 `{ key, label, type, options? }`）, `status`（`draft`/`published`）, `created_at`

### `survey_submissions`（一筆填寫一筆）
- `id`, `form_id`, `answers`（JSON）, `review_status`（Phase 2 預留，Phase 1 留空）, `reviewer_note`（Phase 2 預留）, `created_at`

欄位型態：`text` / `searchable_select`（可搜尋下拉，找不到選「其他」手動輸入入庫 pending）/ `yesno`（大按鈕二選一）/ `upload`（Phase 2 預留，本次不 render）。

---

## Phase 1 固定表單欄位

寫入一筆 `survey_forms`（`status = published`）：

| key | label | type | 備註 |
|---|---|---|---|
| name | 姓名 | searchable_select | 讀 survey_members；其他→手動輸入→入庫 pending |
| star_rank | 夥伴星等 | searchable_select | 白/綠/橙/紅/紫 |
| recommender | 推薦人 | searchable_select | 讀 survey_members |
| join_master | 天驥加盟主 | yesno | |
| tree_finance_d2 | 財務進化樹Day2 | yesno | |
| tree_path | 實踐路徑樹 | yesno | |
| tree_abundance | 富足人生樹 | yesno | |
| tree_decode | 人生解碼樹 | yesno | |

---

## 前台（`/f/:token`）

- 免登入，動態依 `survey_forms.fields` render。手機零打字體驗。
- 送出寫入 `survey_submissions`；`name`/`recommender` 選「其他」時新名字寫入 `survey_members`（`status = pending`）。
- token 無效 / 表單非 published / 不存在 → 統一友善錯誤頁，不洩漏細節（不區分「token 錯」與「表單被下架」）。

---

## 後台（`/admin`）— 手機優先儀表板

> **設計定位**：管理者端目標裝置是**手機**。放棄「傳統寬螢幕、資訊愈多愈好」的後台思維，改採**手機優先的儀表板**：打開就看到當前任務的完成進度，切任務、看細節都是儀表板卡片＋單欄流的操作，桌面則自然拉寬為多欄。設計時載入 `uidesign` skill（Warm Minimal 設計系統），進度視覺化載入 `dataviz` skill。

### 認證（甲案）
1. 開 `/admin` → 強制 LINE 登入（沿用主系統 channel）。
2. 取得 LINE ID → 後端**驗簽**（絕不信前端傳值）。
3. 直接查同一個 DB 的 `SELECT role FROM members WHERE line_id = $1`，確認角色 ∈ {管理者, 負責人, 開發者}。
4. 通過才放行；session **只存記憶體，不落地**（不寫 localStorage），關頁重開需重登。

### 側邊欄 = 任務清單（切換器）
- 列出所有 `survey_forms`。**一張調查表單 = 一個進行中的任務**，側邊欄即是「目前團隊有哪些任務」的清單。
- 顯示目前任務數量；點選任一任務即切換主視圖到該任務的完成狀況。
- 手機上收合為抽屜／頂部下拉，桌面上固定為左側欄。

### 首屏 = 完成狀況儀表板（副總核心需求，打開即見）
- 打開後台、選定一個任務後，**首屏預設就是「誰完成／誰沒完成」的進度視圖**，不需要額外點擊。
- 應填名單 = 整份 `survey_members`（甲案全名單比對）；出現在該任務 `survey_submissions.answers.name` = 已完成。
- 比對鍵：`survey_submissions.answers.name` vs `survey_members.name`（靠前台姓名下拉保證寫法一致）。
- 呈現：按推薦人分組的進度卡片，組標題含進度條（如 `李冠陞 ▓▓▓▓░░ 8/12`），組內列出姓名 + 星等 + ✅/❎。手機上為單欄堆疊卡片，桌面上多欄排列。
- 頂部彙總：整體完成率（已完成／應填總數）一眼可見。

### 資料檢視（次要視圖，可從首屏切入）
- 從完成狀況切到「明細」即看到該任務的逐筆填寫資料。
- 手機優先呈現：每筆一張卡片（非寬表格橫向捲動）；桌面可展開為表格。
- 「篩選」：欄位標題與每個姓名可點（推薦人欄位不可點）。
  - 點姓名 → 篩「推薦人=該人」+ 本人。
  - 點課程/樹欄位 → 篩該欄 Yes。
  - 點星等 → 篩該星等。
  - 同鈕再點 = 取消篩選（單條件，新條件取代舊條件）。
- 是非型狀態一律 ✅/❎。

### 表單建立器（發佈新任務）
- 手打欄位設定（key/label/type/options）。
- 預覽（夥伴視角渲染）。
- 發佈（`draft`→`published`，產生 token）＝**發佈一個新任務**。
- 發佈後顯示連結 + 複製連結按鈕。
- 供**其他管理者**建立各自的調查表單／任務用；可用的欄位型態含 `upload`（見下方審核說明）。

### 匯出
- CSV：後端直出。
- Excel：後端用 `exceljs` 直出。
- **不做 Google Sheet 匯出**（手冊明確捨棄）。

---

## 種子資料：40 人名單

灌入 `survey_members`（`status = confirmed`），星等保留「紅」（目前無人）。名單內容見使用者上傳的 CLAUDE.md 表格（40 筆，逐字沿用，不重複貼於此）。

**發佈前必做**：請使用者核對 OCR 罕用字與推薦人歸屬（手冊已標註此為留意事項）。

---

## 圖片上傳審核（管理者自建表單的可選能力，Phase 2 才實作）

**定位釐清（2026-07-11）**：圖片上傳審核是**其他管理者用表單建立器建自己的調查表單時**可加入的一種欄位型態（`upload`）＋審核流程，用途是「推薦人可能代被推薦人操作，需要佐證審核」。

- 它**不屬於開發者手上這張固定表單（Phase 1 那 8 欄）**，不要混進去。本次固定表單維持乾淨、不含上傳。
- 它是表單建立器工具箱的一部分，供管理者按各自需求選用。
- **建置時機**：排在核心（發佈任務 + 完成狀況追蹤 + 建立器）上線之後（Phase 2）。本次（Phase 1）只確保資料結構欄位存在（`survey_submissions.review_status` / `reviewer_note`、`fields` 支援 `upload` 型態的資料形狀），**UI 與 R2 儲存不做**。
- Phase 2 完整內容：`upload` 型態前台 render、Cloudflare R2 儲存、`review_status` 審核流程、（選配）LINE 推播通知。

> 若使用者要提前把此能力拉進 Phase 1，需另行告知（涉及 R2 儲存與審核 UI，屬額外工程量）。

---

## 已知限制（沿用手冊）

1. `survey_members` 與主系統 `members` 過渡期不同步（不影響安全，後台鑰匙全靠主系統 `role` 比對）。
2. 40 人種子名單需人工核對罕用字。
3. 單條件篩選，不疊加。
4. 未填名冊採全名單比對，不可指定部分應填對象。
5. 推薦人為字串比對，未正規化關聯。

---

## 待使用者提供 / 確認（執行前必做）

1. ~~**Zeabur 新服務**~~ **已取消**（2026-07-11）：後端合併進 `server/` 後，survey 路由隨主後端一起部署，**無需在 Zeabur 新增任何服務或連線設定**。
2. **確認沿用主系統既有 LINE Login channel**（本 spec 預設方案）——若要獨立 channel 請另行提供 Channel ID/Secret。
3. ~~spec.md 第 1～4 節技術決策~~ 已由使用者確認直接開始（2026-07-08）。
4. **策略調整已確認**（2026-07-11）：後端合併進 `server/`、管理者端改手機優先儀表板、圖片上傳審核定位為管理者自建表單的可選能力（不進本次固定表單）。詳見各節修訂。
