# Change 21 — AI 員工後端橋接 API

> **編號變更說明**：本 change 原編號 20，因與「團隊調查表單系統」（`m_b_調查表單` 分支）
> 的 change 20 撞號，改編號為 21。內容未變動，僅資料夾與標題更新。

> 來源：使用者提供的 `README.md`（設計決策紀錄）與 `CLAUDE.md`（經理手冊），描述「KJ AI 員工 — LINE Bot 互動介面層」專案。
> 該專案絕大部分（LINE webhook、規則層、Claude Code CLI 整合）是**獨立的新 Zeabur 專案，不在本 repo**。
> 本 change **只涵蓋文件中第二步——在本 repo（`kj-champion-system` 後端）新增的橋接端點**。

---

## 背景

康九冠軍系統已是功能完整、穩定運行的團隊管理系統，但團隊使用率偏低，根本原因是「要求鬆散團隊學習新介面」本身摩擦成本很高。解法是讓既有系統的能力（記行程）透過大家已經在用的 LINE 群組對話觸發，由獨立的 AI 互動介面層（新 Zeabur 專案）負責語意判斷與複誦確認，**判斷完成後才呼叫本系統既有 API 寫入 prod DB**。

AI 服務不是使用者的瀏覽器，是**代替使用者**操作。既有 `POST /api/calendar/events` 的身分驗證模型（`verifyLineUser`）假設呼叫者是「使用者本人的瀏覽器」，直接沿用會讓任何能跟 AI 服務對話的人冒用任何 LINE userId 新增行程，因為該模型不驗證「請求是否真的由該 userId 本人發出」。因此需要新增一支用「信任呼叫者本身（AI 服務）」為模型的橋接端點。

## 目標

新增 `POST /api/ai-bridge/calendar/events`，讓 AI 互動介面層可以用 Bearer token 驗證的方式，呼叫既有 `calendarService.createGroupEvent()` 寫入一筆團體行程，業務邏輯（白名單、Google Calendar 寫入、DB 同步、版本號）完全沿用既有程式碼，不重寫。

## 架構決策（已核對既有程式碼，不憑文件猜測）

### 1. 比照既有 `verifyAdmin` 模式，而非 `middleware/auth.js` 的 `verifyLineUser`

讀過 `server/routes/admin.js`：`verifyAdmin` 是定義在路由檔案內的 inline middleware，檢查 `Authorization: Bearer <ADMIN_SECRET>`，env 未設定一律 401 拒絕：

```js
const verifyAdmin = (req, res, next) => {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!process.env.ADMIN_SECRET || token !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ success: false, message: '未授權' });
  }
  next();
};
```

新的 `verifyAIService` 比照同一寫法（同檔案內 inline middleware，不另開 `middleware/` 檔案），檢查 `Authorization: Bearer <AI_SERVICE_SECRET>`。

讀過 `server/middleware/auth.js`：`verifyLineUser` / `optionalLineUser` 是「信任呼叫者帶來的 userId 本身」的模型，不適用本場景，原因如上「背景」段落所述。

### 2. 直接呼叫既有 `createGroupEvent()`，業務邏輯不變

讀過 `server/routes/calendar.js:186-227`（既有 `POST /api/calendar/events`）與 `server/services/calendarService.js:109-162`（`createGroupEvent`）：

- 必填：`title`、`start`、`end`
- `type` 白名單：`學員上課` / `活動` / `諮詢簽約` / `紫星行程聊聊`，不合法值自動回退為 `活動`（既有邏輯，不重新驗證）
- `createGroupEvent(eventData)` 寫入 Google Calendar 後，把回傳事件 upsert 進 `events` 表（`eventDbService.upsertEvents`）；**`events.id` 直接使用 Google Calendar event ID**，新流程不可自行生成 ID
- 寫入成功後，比照既有路由呼叫 `versionService.incrementVersion()`（前端輪詢版本號機制依賴這個）
- 新端點直接呼叫同一支 `createGroupEvent()`，不重寫白名單檢查或 DB 寫入邏輯

### 3. ⚠️ 待確認：`lineUserId` 沒有對應的儲存欄位（與文件描述不符）

讀過 `events` 表實際 schema（`server/services/eventDbService.js` 的 upsert SQL）：欄位為 `id, title, description, start_at, end_at, all_day, location, type, is_birthday_event, creator_email, synced_at, updated_at`。**沒有「哪個 LINE 使用者透過 AI 員工建立此筆」的欄位。**

`creator_email` 讀的是 Google Calendar API 回傳的 `creator`（呼叫 Calendar API 的 Google 帳號 email），跟 LINE 使用者是兩回事，既有 `POST /api/calendar/events` 路由本身也沒有把 `req.lineUserId` 傳進 `createGroupEvent()`。

文件（README §6 / CLAUDE.md 第二步）假設「Body 帶 `lineUserId` 標明資料歸屬」，但既有 schema 沒有承接這個欄位的地方。**這是文件描述與既有程式碼不符之處，依規則停下說明，不自行猜測修正。**

三個方案，需要你決定（見文末「待確認事項」）：

| 方案 | 做法 | 取捨 |
|---|---|---|
| A. 新增欄位 | `events` 表新增 `created_by_line_id`，需要 migration（套用到 dev / prod / backup 三個 DB） | 資料完整可追溯，但要動既有 schema |
| B. 寫進 description | 把「由 OOO 透過 LINE 建立」附加進 `description` 文字 | 不用動 schema，但資料不結構化，難查詢 |
| C. demo 階段不落地 | API 仍要求帶 `lineUserId`（驗證格式 + 確認存在於 `members` 表），但只用來做請求驗證，不寫入任何欄位 | 最小改動，但「這筆資料歸屬於誰」沒有留下紀錄 |

### 4. `lineUserId` 格式與存在性驗證

讀過 `server/config/lineConfig.js`：`isValidLineUserId` 只檢查長度 33 字元的字串。讀過 `server/services/memberDbService.js`：`getMemberByLineId(lineId)` 可查 `members` 表（`WHERE line_id = $1`）。新端點至少要做格式檢查；是否要求必須能在 `members` 表查到對應成員，列入待確認事項。

## 涉及檔案（本 repo）

| 檔案 | 異動 |
|---|---|
| `server/routes/aiBridge.js`（新檔） | 新路由檔，含 `verifyAIService` middleware + `POST /calendar/events` |
| `server/server.js` | 新增一行 `app.use('/api/ai-bridge', aiBridgeRoutes)`（比照第 106-115 行既有掛載方式） |
| `.env.example` | 新增 `AI_SERVICE_SECRET` 說明，比照既有 `ADMIN_SECRET`（32 字元以上） |
| migration SQL（僅當方案 A 成立時才需要） | `events` 表新增欄位，需套用到 dev / prod / backup 三個 DB（`.claude/rules/database.md` 規則） |

## 環境變數新增

| 變數 | 加到哪個服務 | 說明 |
|---|---|---|
| `AI_SERVICE_SECRET` | 本後端（prod 與 dev 後端都要設） | AI 互動介面層呼叫本 API 用的 Bearer token，與 `ADMIN_SECRET` 是不同的一把（信任「AI 服務」與信任「admin 操作者」語意不同，見待確認事項 3） |

## API 規格（草案，待確認事項解決後才會定案）

```
POST /api/ai-bridge/calendar/events
Authorization: Bearer <AI_SERVICE_SECRET>
Content-Type: application/json

{
  "title": "string，必填",
  "start": "ISO 8601，必填",
  "end": "ISO 8601，必填",
  "description": "string，選填",
  "location": "string，選填",
  "type": "學員上課 | 活動 | 諮詢簽約 | 紫星行程聊聊，選填，不合法值回退「活動」",
  "allDay": "boolean，選填，預設 false",
  "lineUserId": "string，33 字元，必填，標明這筆資料代表誰建立"
}
```

成功（比照既有 `POST /api/calendar/events` 回應格式）：
```json
{ "success": true, "data": { "id": "...", "title": "...", "start": "...", "end": "...", "..." : "..." } }
```

失敗（缺欄位 / token 錯誤 / lineUserId 格式或存在性檢查未過）：
```json
{ "success": false, "message": "..." }
```

## 邊界

**此 change 做：**
- 新增 `server/routes/aiBridge.js`，含 `verifyAIService` middleware
- `POST /api/ai-bridge/calendar/events` 一支端點，直接呼叫既有 `createGroupEvent()`
- `.env.example` 更新

**此 change 不做（不在本 repo，或是下一階段範圍）：**
- LINE webhook 接收、規則層篩選訊息、Claude Code CLI 整合、Volume session 持久化 — 屬於獨立的「AI 互動介面層」Zeabur 專案，整個服務都不在這個 repo 裡，無法在本 repo 內實作
- 檔案上傳（資產負債表 Excel）
- 修改 / 刪除既有行程的 API
- 任何查詢類端點（如「最近行程」）
- 群組背景監聽 / 短期上下文緩衝

## 待確認事項（建 tasks.md 前需要你回答）

1. **`lineUserId` 歸屬欄位**：選方案 A（新增 DB 欄位）/ B（寫進 description）/ C（demo 階段不落地，只驗證不儲存）？
2. **是否要求 `lineUserId` 必須存在於 `members` 表才放行**（多一道防呆，避免打錯字或冒用不存在的 ID，查不到回 404）？
3. **`AI_SERVICE_SECRET` 是否與 `ADMIN_SECRET` 共用同一把**，還是如本文預設、獨立開一把？
