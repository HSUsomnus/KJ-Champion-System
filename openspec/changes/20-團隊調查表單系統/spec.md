# Change 20 — 團隊調查表單系統（KJ Survey）

> 需求探索已於 CEO（Claude Web Chat）階段完成，產出 README.md / CLAUDE.md 兩份手冊（使用者已上傳，內容納入本 spec 整理）。本文件把手冊內容對應進本 repo 實際結構，並補齊手冊未指定的技術決策。

## 背景

主系統（康九冠軍夥伴系統）功能完整但對部分成員（含副總/紫星 李冠陞）過於龐大、有抵觸感。副總長期苦惱團隊突發事件的「調查」該怎麼做。本功能是**折中方案**：獨立一套極簡調查表單工具，不強迫任何人學主系統。

核心哲學——**兩端不對稱**：
- 夥伴端：極簡，免登入，幾乎零打字，按按鈕即可。
- 管理者端：不追求簡單，追求有力（篩選直覺、匯出齊全、資料清楚、揪出未填名單）。

需求來源真實明確（副總本人指定要用），故**不做「先驗證採用率」的最小功能**，範圍一次做到位（含表單建立器）。詳細決策理由見使用者上傳的 README.md，不重複列出。

---

## 範圍對應到本 repo（本 spec 新增的技術決策）

手冊內容（README.md / CLAUDE.md）已完整定義需求與資料結構，以下是手冊未明講、需要落地到「這個 repo 長怎樣」的具體決策：

### 1. 目錄結構

- **後端**：新增獨立目錄 `kj-survey-server/`（獨立 Express app，自己的 `package.json`），不寫進既有 `server/`。原因：手冊明確要求「API 切開」「獨立於主系統的新 Zeabur 專案」，混進 `server/` 會讓兩套系統耦合部署。
- **前端**：**不開新 repo、不開新 Cloudflare Pages 專案**，沿用既有 `frontend/`，新增路由與頁面：
  - `frontend/src/pages/survey/SurveyFill.jsx` → 路由 `/f/:token`（免登入，公開）
  - `frontend/src/pages/survey/SurveyAdmin.jsx` → 路由 `/admin`（獨立 LINE 登入閘門，不經過主系統 `ProtectedRoute`/`AuthContext`）
  - `frontend/src/services/surveyApi.js`（獨立 API 呼叫層，不共用 `api.js`，呼叫路徑前綴 `/survey-api/*`）
  - 原因：手冊明講「沿用主系統既有前端風格」「後台掛在現有系統網域下」，代表同一個前端部署、同一個網域，只是路由與 API 層分開。

  路由掛法：`/f/:token` 與 `/admin` 都是**與 `/login` 同層的獨立 route**（不包在 `ProtectedRoute` 裡），因為：
  - `/f/:token` 必須免登入。
  - `/admin` 用自己的 LINE 登入流程（不落地 session），跟主系統的持久登入邏輯不同，不能共用 `AuthContext`。

- **DB**：全新 PostgreSQL（獨立於主系統的 `members`/`events`），需使用者在 Zeabur 開新專案 `kj-survey`，內含 `postgresql`（新）+ `kj-survey-server`（新後端服務）。**這一步需要使用者在 Zeabur Dashboard 操作**（Claude 無法建立 Zeabur 專案），完成後把連線字串回填進 `kj-survey-server/.env`。

### 2. `_worker.js` 新增代理規則

現有 `frontend/public/_worker.js` 只代理 `/api/*` → 主系統 Zeabur 後端。新增一段：`/survey-api/*` → KJ Survey 的 Zeabur 後端（prod / dev 依 hostname 判斷，比照現有 `resolveBackend()` 寫法）。

```
ZEABUR_SURVEY_BACKEND_PROD = 'https://kj-survey.zeabur.app'       // 待建立後確認實際網址
ZEABUR_SURVEY_BACKEND_DEV  = 'https://kj-survey-dev.zeabur.app'   // 待建立後確認實際網址
```

### 3. 後台權限比對（手冊列為「必須停下回報」，本 spec 已解法）

手冊要求後台需讀主系統「以 LINE ID 為核心的會員/權限資料」。已確認主系統 schema（`database/schema.sql` + `server/migrations/add_member_role.sql`）：`members.line_id`、`members.role`（`一般人` / `管理者` / `負責人` / `開發者`）。

**不直接讓 KJ Survey 後端連主系統 DB**（維持「API 切開」原則，且過渡期不碰主系統表結構）。改為：

- 在既有 `server/routes/member.js` 新增一支**內部專用**唯讀端點：
  `GET /api/member/role-by-line-id?lineId=xxx`
  - 用 Header `X-Internal-Secret` 比對新環境變數 `INTERNAL_API_SECRET`（比照現有 `ADMIN_SECRET` 保護模式）
  - 回傳 `{ role }` 或 404
- `kj-survey-server` 後台登入流程：LINE ID token 驗簽通過後，打這支端點確認 `role ∈ {管理者, 負責人, 開發者}` 才放行。

### 4. LINE Login 憑證（手冊列為「必須停下回報」，本 spec 已解法）

**沿用主系統既有 LINE Login channel**（`LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET`，同一個 LINE channel），不必使用者另外去 LINE Developers 開新 channel。`kj-survey-server/.env` 需填同一組值（由使用者從主系統 `.env` 複製）。ID token 驗簽邏輯獨立寫在 `kj-survey-server`（不 import 主系統程式碼，保持部署獨立）。

理由：手冊本身沒說要新 channel，只說「因為夥伴本就用 LINE」；沿用同一 channel 對使用者無新開銷，且登入體驗一致。**若使用者希望用獨立 channel，需另外提供 Channel ID/Secret**——本 spec 先以「沿用既有」為預設，執行時遇到才回頭確認。

### 5. 種子資料匯入方式

比照 `database.md` 既有模式：Claude 產生 SQL migration（建表 + 40 人 INSERT），使用者到 Zeabur `kj-survey` → `postgresql` → Console 貼上執行（Claude 無法直連新 DB 公網）。

---

## 資料結構（沿用手冊定義，逐字對齊）

三張表，全新 DB（`kj-survey` 專案內的 `postgresql`）：

### `members`（KJ Survey 自己的名單庫，與主系統 `members` 是兩張獨立表）
- `id`, `name`, `star_rank`（enum: 白/綠/橙/紅/紫）, `recommender_name`（字串，v1 不正規化關聯）, `status`（`confirmed`/`pending`）, `created_at`

### `forms`（一張調查表單一筆）
- `id`, `title`, `token`（隨機不可猜字串，前台連結用，不可流水號）, `fields`（JSON 陣列 `{ key, label, type, options? }`）, `status`（`draft`/`published`）, `created_at`

### `submissions`（一筆填寫一筆）
- `id`, `form_id`, `answers`（JSON）, `review_status`（Phase 2 預留，Phase 1 留空）, `reviewer_note`（Phase 2 預留）, `created_at`

欄位型態：`text` / `searchable_select`（可搜尋下拉，找不到選「其他」手動輸入入庫 pending）/ `yesno`（大按鈕二選一）/ `upload`（Phase 2 預留，本次不 render）。

---

## Phase 1 固定表單欄位

寫入一筆 `forms`（`status = published`）：

| key | label | type | 備註 |
|---|---|---|---|
| name | 姓名 | searchable_select | 讀 members；其他→手動輸入→入庫 pending |
| star_rank | 夥伴星等 | searchable_select | 白/綠/橙/紅/紫 |
| recommender | 推薦人 | searchable_select | 讀 members |
| join_master | 天驥加盟主 | yesno | |
| tree_finance_d2 | 財務進化樹Day2 | yesno | |
| tree_path | 實踐路徑樹 | yesno | |
| tree_abundance | 富足人生樹 | yesno | |
| tree_decode | 人生解碼樹 | yesno | |

---

## 前台（`/f/:token`）

- 免登入，動態依 `forms.fields` render。手機零打字體驗。
- 送出寫入 `submissions`；`name`/`recommender` 選「其他」時新名字寫入 `members`（`status = pending`）。
- token 無效 / 表單非 published / 不存在 → 統一友善錯誤頁，不洩漏細節（不區分「token 錯」與「表單被下架」）。

---

## 後台（`/admin`）

### 認證（甲案）
1. 開 `/admin` → 強制 LINE 登入（沿用主系統 channel）。
2. 取得 LINE ID → 後端**驗簽**（絕不信前端傳值）。
3. 打主系統 `GET /api/member/role-by-line-id` 確認角色 ∈ {管理者, 負責人, 開發者}。
4. 通過才放行；session **只存記憶體，不落地**（不寫 localStorage），關頁重開需重登。
5. 管理者本人透過專屬設定連結，自行把 LINE ID 綁進 KJ Survey 的 members（比照手冊）。

### 側邊欄
列出所有 `forms`，點選切換 Table 1 資料來源。

### Table 1：資料檢視
- 全展開表格。
- 「篩選」按鈕：開啟後，欄位標題與每個姓名變按鈕（推薦人欄位不變按鈕）。
  - 點姓名 → 篩「推薦人=該人」+ 本人。
  - 點課程/樹欄位 → 篩該欄 Yes。
  - 點星等 → 篩該星等。
  - 同鈕再點 = 取消篩選（單條件，新條件取代舊條件）。
- 是非型狀態一律 ✅/❎。

### Table 1 進階：未填名冊（副總核心需求）
- 切換鈕：已填資料 ⇄ 點名表。
- 應填名單 = 整份 KJ Survey `members`（甲案全名單比對）；出現在該表單 `submissions.answers.name` = 已填。
- 比對鍵：`submissions.answers.name` vs `members.name`（靠前台姓名下拉保證寫法一致）。
- 按推薦人分組，組標題含進度條（如 `李冠陞 ▓▓▓▓░░ 8/12`），組內列出姓名+星等+✅/❎。

### Table 2：表單建立器
- 手打欄位設定（key/label/type/options）。
- 預覽（夥伴視角渲染）。
- 發佈（`draft`→`published`，產生 token）。
- 發佈後顯示連結 + 複製連結按鈕。

### 匯出（Table 1）
- CSV：後端直出。
- Excel：後端用 `exceljs` 直出。
- **不做 Google Sheet 匯出**（手冊明確捨棄）。

---

## 種子資料：40 人名單

灌入 KJ Survey 自己的 `members`（`status = confirmed`），星等保留「紅」（目前無人）。名單內容見使用者上傳的 CLAUDE.md 表格（40 筆，逐字沿用，不重複貼於此）。

**發佈前必做**：請使用者核對 OCR 罕用字與推薦人歸屬（手冊已標註此為留意事項）。

---

## Phase 2（本次不做，僅資料結構預留）

截圖上傳審核（`upload` 型態 render、Cloudflare R2、`submissions.review_status` 流程、LINE 推播）。本次只確保欄位/狀態存在，UI 不做。

---

## 已知限制（沿用手冊）

1. KJ Survey `members` 與主系統 `members` 過渡期不同步（不影響安全，後台鑰匙全靠主系統 `role` 比對）。
2. 40 人種子名單需人工核對罕用字。
3. 單條件篩選，不疊加。
4. 未填名冊採全名單比對，不可指定部分應填對象。
5. 推薦人為字串比對，未正規化關聯。

---

## 待使用者提供 / 確認（執行前必做）

1. **Zeabur 新專案 `kj-survey`**：需使用者建立（含 `postgresql` + `kj-survey-server` 兩服務），完成後把連線字串給 Claude 填入 `kj-survey-server/.env`。
2. **確認沿用主系統既有 LINE Login channel**（本 spec 預設方案）——若要獨立 channel 請另行提供 Channel ID/Secret。
3. **確認本 spec 第 1～4 節的技術決策**（目錄結構 / `_worker.js` 代理規則 / 內部 role 比對端點 / LINE channel 沿用），這些是手冊沒寫死、由本次補上的落地方式。
