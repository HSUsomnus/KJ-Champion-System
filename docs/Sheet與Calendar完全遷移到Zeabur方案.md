# Sheet 與 Calendar 完全遷移到 Zeabur 方案

> 本文件詳細說明如何將 Google Sheets（成員資料）與 Google Calendar（行事曆讀取）完全遷移到 Zeabur PostgreSQL，解決 API 配額限制與資料讀取不全問題。
> 適用專案：Line_Liff（LINE LIFF 行事曆應用）

---

## 一、概述

### 1.1 現況與問題

| 資料來源 | 現況 | 問題 |
|----------|------|------|
| **Google Sheets** | 成員資料儲存在「成員資料」工作表 | 多人同時使用時超過「每分鐘讀取請求」配額 |
| **Google Calendar** | 團體行程由 Calendar API 即時讀取 | 讀取不全、延遲、配額限制 |

### 1.2 遷移後架構

```
                    ┌─────────────────────────────────────────┐
                    │         Google Calendar（團體日曆）       │
                    │  來源：LIFF 寫入、Google 網頁（未來：個人日曆串接）│
                    └──────────────────┬──────────────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │  Sync 機制             │                        │
              │  ① 定時輪詢（每 5～15 分）                       │
              │  ② Push 通知（Calendar Watch webhook）           │
              ▼                        │                        │
┌─────────────────────────────────────────────────────────────────┐
│                        Zeabur PostgreSQL                         │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │  members        │    │  events         │                     │
│  │  （成員資料）    │    │  （行程快取）    │ ← Calendar 更新時同步寫入
│  └────────┬────────┘    └────────┬────────┘                     │
│           │                      │                               │
└───────────┼──────────────────────┼───────────────────────────────┘
            │ 讀寫                 │ 僅讀取（LIFF 顯示）
            │                      │
            ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LINE LIFF 後端（Zeabur 部署）                  │
│  /api/members  /api/profile  /api/calendar/*                     │
│  寫入行程時 → Google Calendar（保留）                             │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LINE LIFF 前端                                 │
│  成員列表、個人資料、行事曆、行程詳情                              │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Google 服務角色

| 服務 | 遷移後角色 |
|------|------------|
| **Google Sheets** | 完全移除，不再使用 |
| **Google Calendar** | **保留**：<br>• **寫入**：LIFF 新增／編輯／刪除行程一律寫入 Calendar<br>• **讀取**：LIFF 不直接讀 Calendar API，改從 Zeabur 讀<br>• **同步**：Calendar 有變更時，需同步推送至 Zeabur（見下文）<br>• **未來**：後續版本規劃串接「個人 Google Calendar」 |

---

## 二、Zeabur 環境準備

### 2.1 建立 Zeabur 專案

1. 登入 [Zeabur](https://zeabur.com)，建立新專案（或使用既有專案）
2. 連動 GitHub 倉庫 `Line_Liff`
3. 在專案內新增 **PostgreSQL** 服務（Marketplace → PostgreSQL，或一鍵建立）

### 2.2 取得資料庫連線資訊

Zeabur 會自動注入環境變數，例如：

- `POSTGRES_URL` 或 `DATABASE_URL`（完整連線字串）
- 或分開的：`POSTGRES_HOST`、`POSTGRES_PORT`、`POSTGRES_USER`、`POSTGRES_PASSWORD`、`POSTGRES_DB`

紀錄這些變數，後續程式碼會使用。

---

## 三、資料庫 Schema 設計

### 3.1 成員表（members）

對應原 Google Sheets「成員資料」A～L 欄。

```sql
CREATE TABLE members (
  id          SERIAL PRIMARY KEY,
  line_id     VARCHAR(255) NOT NULL UNIQUE,
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) DEFAULT '',
  phone       VARCHAR(50) DEFAULT '',
  star_level  VARCHAR(50) DEFAULT '白星',
  course_record TEXT DEFAULT '',
  picture_url TEXT DEFAULT '',
  tesla_franchisee VARCHAR(50) DEFAULT '',
  team_responsibilities TEXT DEFAULT '',
  volunteer_records TEXT DEFAULT '',  -- JSON 字串
  birthday    VARCHAR(20) DEFAULT '', -- YYYY-MM-DD
  display_name VARCHAR(255) DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_members_line_id ON members(line_id);
```

### 3.2 行程表（events）

對應 Google Calendar 事件，由 Calendar 同步寫入，供 LIFF 讀取。`id` 使用 Google Calendar event ID，方便對應與 upsert。

```sql
CREATE TABLE events (
  id               VARCHAR(255) PRIMARY KEY,  -- Google Calendar event ID
  title            VARCHAR(500) NOT NULL,
  description      TEXT DEFAULT '',
  start_at         TIMESTAMPTZ NOT NULL,
  end_at           TIMESTAMPTZ NOT NULL,
  all_day          BOOLEAN DEFAULT FALSE,
  location         TEXT DEFAULT '',
  type             VARCHAR(100) DEFAULT '活動',
  is_birthday_event BOOLEAN DEFAULT FALSE,
  creator_email    VARCHAR(255) DEFAULT '',
  synced_at        TIMESTAMPTZ DEFAULT NOW(), -- 最後一次從 Calendar 同步時間
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_start_at ON events(start_at);
CREATE INDEX idx_events_end_at ON events(end_at);
```

### 3.3 版本號表（app_version，可選）

若沿用現有 version 快取機制，可將 version 存 DB 或維持記憶體。

---

## 四、成員資料遷移（Sheet → Zeabur）

### 4.1 資料匯出

1. 開啟 Google 試算表「成員資料」
2. 檔案 → 下載 → CSV（UTF-8）
3. 或用腳本透過 Sheets API 匯出（可沿用既有 `sheetService.getAllMembers()` 邏輯）

### 4.2 匯入腳本範例

建立 `scripts/migrate-sheet-to-zeabur.js`：

```javascript
/**
 * 一次性：將 Google Sheet 成員資料匯入 Zeabur PostgreSQL
 * 使用方式：node scripts/migrate-sheet-to-zeabur.js
 */
require('dotenv').config();
const { Pool } = require('pg');

// 先暫時使用原有 sheetService 讀取
const sheetService = require('../server/services/sheetService');

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const members = await sheetService.getAllMembers();
  for (const m of members) {
    await pool.query(`
      INSERT INTO members (
        line_id, name, email, phone, star_level, course_record,
        picture_url, tesla_franchisee, team_responsibilities,
        volunteer_records, birthday, display_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (line_id) DO UPDATE SET
        name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone,
        star_level = EXCLUDED.star_level, course_record = EXCLUDED.course_record,
        picture_url = EXCLUDED.picture_url, tesla_franchisee = EXCLUDED.tesla_franchisee,
        team_responsibilities = EXCLUDED.team_responsibilities,
        volunteer_records = EXCLUDED.volunteer_records,
        birthday = EXCLUDED.birthday, display_name = EXCLUDED.display_name,
        updated_at = NOW()
    `, [
      m.lineId, m.name || '', m.email || '', m.phone || '',
      m.starLevel || '白星', m.courseRecord || '', m.pictureUrl || '',
      m.teslaFranchisee || '', m.teamResponsibilities || '',
      m.volunteerRecords || '', m.birthday || '', m.displayName || '',
    ]);
  }
  console.log(`✅ 已匯入 ${members.length} 筆成員`);
  await pool.end();
}

migrate().catch(err => { console.error(err); process.exit(1); });
```

### 4.3 新增成員服務層（memberDbService.js）

取代 `sheetService` 中成員相關函式，改為操作 PostgreSQL。需實作：

- `getAllMembers()`
- `getMemberByLineId(lineId)`
- `isMemberRegistered(lineId)`
- `createMember(memberData)`
- `updateMember(lineId, memberData)`

（欄位對應：`lineId`↔`line_id`，`starLevel`↔`star_level` 等）

---

## 五、行事曆遷移（Calendar 讀取 → Zeabur）

### 5.1 讀寫分工

| 操作 | 說明 |
|------|------|
| **LIFF 讀取** | 一律從 Zeabur `events` 讀取，**不再**呼叫 Google Calendar API |
| **LIFF 寫入** | 新增／編輯／刪除行程**保留寫入 Google Calendar**，沿用既有 `calendarService` |
| **Zeabur events** | 僅作為「讀取快取」，由 sync 機制從 Calendar 同步而來 |

### 5.2 核心機制：Google Calendar 有更新 → 同步推送到 Zeabur

當 Google Calendar 有任何變更（LIFF 寫入、Google 網頁、未來個人日曆串接等），必須同步更新 Zeabur PostgreSQL。採用**雙機制**確保即時性與穩定性：

#### 5.2.1 機制一：定時輪詢（Polling）

| 項目 | 說明 |
|------|------|
| **觸發** | Cron 每 5～15 分鐘執行一次 |
| **動作** | 從 Calendar API 拉取指定時間範圍行程，比對 Zeabur `events`，執行 insert/update/delete |
| **優點** | 實作簡單、不依賴外網可達性 |
| **缺點** | 有最多 5～15 分鐘延遲 |

#### 5.2.2 機制二：Push 通知（Calendar Watch Webhook）— 建議實作

| 項目 | 說明 |
|------|------|
| **觸發** | 當團體日曆有變更時，Google 主動 POST 到我們提供的 webhook URL |
| **動作** | 收到通知後，立即執行一次 sync（拉取變更並更新 Zeabur） |
| **優點** | 近乎即時、減少無意義輪詢 |
| **注意** | 需提供可從公網存取之 HTTPS 端點；Watch 有效期限約 7 天，需定期重新註冊 |

**Calendar Watch 基本流程：**

1. 對 `events` 資源呼叫 `calendar.events.watch()`
2. 指定 `address` 為 webhook URL（例如 `https://your-app.zeabur.app/api/calendar/webhook`）
3. Google 在日曆變更時 POST 到該 URL
4. 後端收到請求後，依 `X-Goog-Resource-State` 判斷，呼叫 sync 邏輯更新 Zeabur

### 5.3 背景 Sync 服務（calendarSyncService.js）

建立 `server/services/calendarSyncService.js`：

- **定時輪詢**：Cron 呼叫 `syncFromCalendar(timeMin, timeMax)`
- **Webhook 觸發**：`POST /api/calendar/webhook` 收到後呼叫 `syncFromCalendar()`
- **Sync 邏輯**：`calendarService.getGroupEvents()` 取得 Calendar 資料 → 比對 Zeabur `events` → upsert 新/變更、刪除已移除
- **Sync 範圍**：建議當月前後各 1～2 個月，或依需求擴大

### 5.4 LIFF 寫入後是否再寫 Zeabur？

| 方案 | 說明 |
|------|------|
| **A. 寫入 Calendar 後由 sync 處理** | LIFF 只寫 Calendar，Zeabur 完全靠定時/webhook 同步。優點：單一來源，邏輯簡單；缺點：可能有數秒～數分鐘延遲 |
| **B. 寫入 Calendar 後立即寫 Zeabur** | LIFF 寫入 Calendar 成功後，同一 request 內再寫一筆到 Zeabur。優點：前端可立即看到；缺點：需維護雙寫邏輯，且仍須 sync 處理「從其他來源的變更」 |

**建議**：採用方案 A，並實作 Calendar Watch，收到 webhook 後立即 sync，延遲可壓到數秒內。

### 5.5 新增行程服務層（eventDbService.js）

- `getEventsByRange(timeMin, timeMax)`：從 DB 依 `start_at`、`end_at` 查詢（供 LIFF 讀取）
- `getEventById(eventId)`：單一行程
- `upsertEvents(events)`：Sync 時使用，批量 upsert
- `deleteEventsNotIn(googleEventIds)`：Sync 時刪除 Calendar 已移除的行程
- **不提供** create/update/delete 給 API 直接呼叫，行程變更一律經由 `calendarService` 寫入 Calendar，再由 sync 更新 Zeabur

### 5.6 生日行程邏輯

- 生日行程由**成員生日**產生，成員已在 Zeabur
- `ensureBirthdayEventsInRange`：從 `memberDbService` 取得成員 → 呼叫 `calendarService.createGroupEvent()` 寫入 **Google Calendar**（沿用既有邏輯）→ sync 會自動把新行程推送到 Zeabur
- `syncMemberBirthdayEvents`：成員生日變更時，呼叫 `calendarService.updateGroupEvent()` 更新 **Calendar**，sync 會同步到 Zeabur

---

## 六、實作步驟總覽

### Phase 1：Zeabur 與 DB 準備

| 步驟 | 內容 |
|------|------|
| 1.1 | Zeabur 專案建立，新增 PostgreSQL |
| 1.2 | 執行 `members`、`events` 的 CREATE TABLE |
| 1.3 | 設定 `DATABASE_URL` 等環境變數 |

### Phase 2：成員遷移

| 步驟 | 內容 |
|------|------|
| 2.1 | 安裝 `pg`：`npm install pg` |
| 2.2 | 建立 `server/services/memberDbService.js` |
| 2.3 | 修改 `member.js`、`profile.js` 路由，改呼叫 `memberDbService` |
| 2.4 | 修改 `calendarService.js`、`version` 路由，成員改從 `memberDbService` |
| 2.5 | 執行 `scripts/migrate-sheet-to-zeabur.js` 匯入既有成員 |
| 2.6 | 移除 `sheetService` 成員相關程式，刪除 `MEMBER_SHEET_ID` 等環境變數 |

### Phase 3：行事曆遷移

| 步驟 | 內容 |
|------|------|
| 3.1 | 建立 `server/services/eventDbService.js`（讀取用） |
| 3.2 | 建立 `server/services/calendarSyncService.js`（Calendar → Zeabur 同步） |
| 3.3 | 建立初次 sync 腳本：從 Calendar 拉取歷史行程寫入 Zeabur |
| 3.4 | 設定 Cron：每 5～15 分鐘執行 `calendarSyncService.syncFromCalendar()` |
| 3.5 | 新增 `POST /api/calendar/webhook`：接收 Google Calendar Watch 通知，觸發立即 sync |
| 3.6 | 啟動時或定時註冊 Calendar Watch（`events.watch`），設定 webhook URL |
| 3.7 | 修改 `calendar.js` 路由：**讀取**改從 `eventDbService`；**寫入**沿用 `calendarService` 寫入 Calendar |
| 3.8 | `ensureBirthdayEventsInRange`、`syncMemberBirthdayEvents` 維持寫入 Calendar，由 sync 自動推到 Zeabur |

### Phase 4：測試與上線

| 步驟 | 內容 |
|------|------|
| 4.1 | 本機測試：連 Zeabur 提供的 DB（或本機 PostgreSQL） |
| 4.2 | Zeabur 部署後端，確認 API 正常 |
| 4.3 | LIFF 成員列表、個人資料、行事曆、行程詳情全流程測試 |
| 4.4 | 多人同時使用壓力測試 |

---

## 七、環境變數對照

### 7.1 遷移後保留（必要）

| 變數 | 說明 |
|------|------|
| `DATABASE_URL` | Zeabur PostgreSQL 連線字串 |
| `GROUP_CALENDAR_ID` | 團體日曆 ID，sync 與 Watch 使用 |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google Service Account |
| `GOOGLE_PRIVATE_KEY` | Google Service Account 私鑰 |
| `GOOGLE_PROJECT_ID` | Google Cloud 專案 ID |
| `APP_URL` | 後端對外公網 URL（例：`https://your-app.zeabur.app`），Webhook 接收用 |
| `LIFF_ID`、`LINE_CHANNEL_ID`、`LINE_CHANNEL_SECRET` 等 | 不變 |

### 7.2 遷移後可移除

| 變數 | 說明 |
|------|------|
| `MEMBER_SHEET_ID` | 成員改用 DB |
| `MEMBER_SHEET_NAME` | 成員改用 DB |

---

## 八、檔案變更清單

| 檔案 | 變更 |
|------|------|
| `package.json` | 新增 `pg` 依賴 |
| `server/config/db.js` | 新增（PostgreSQL 連線池） |
| `server/services/memberDbService.js` | 新增（取代 sheetService 成員部分） |
| `server/services/eventDbService.js` | 新增（行程 DB 讀取 + sync 用的 upsert/delete） |
| `server/services/calendarSyncService.js` | 新增（Calendar → Zeabur 同步，含 syncFromCalendar） |
| `server/services/calendarWatchService.js` | 新增（Calendar Watch 註冊、webhook 處理） |
| `server/services/sheetService.js` | 移除或只保留不再使用的部分 |
| `server/services/calendarService.js` | **維持不變**：寫入仍用 Calendar API；讀取改由路由呼叫 eventDbService |
| `server/routes/member.js` | 改用 memberDbService |
| `server/routes/profile.js` | 改用 memberDbService |
| `server/routes/calendar.js` | 讀取改用 eventDbService；寫入沿用 calendarService；新增 `POST /webhook` |
| `scripts/migrate-sheet-to-zeabur.js` | 新增（一次性匯入成員） |
| `scripts/sync-calendar-to-zeabur.js` | 新增（初次或手動 sync 行程） |
| `scripts/runCalendarSync.js` | 新增（Cron 定時 sync） |
| `scripts/renewCalendarWatch.js` | 新增（Cron 續期 Calendar Watch） |

### 5.7 Calendar Watch 與 Webhook 設定

#### 5.7.1 註冊 Watch

```javascript
// calendarWatchService.js 範例邏輯
const calendar = await getCalendarClient();
const response = await calendar.events.watch({
  calendarId: getGroupCalendarId(),
  requestBody: {
    id: 'unique-channel-id-' + Date.now(),
    type: 'web_hook',
    address: process.env.APP_URL + '/api/calendar/webhook',
    expiration: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 天
  },
});
// 儲存 response.data.expiration，到期前重新註冊
```

#### 5.7.2 Webhook 端點

- **URL**：`POST /api/calendar/webhook`
- **驗證**：比對 `X-Goog-Resource-State`（`sync` 表示有變更）
- **回應**：收到後立即回 200，背景非同步執行 `calendarSyncService.syncFromCalendar()`
- **注意**：Watch 有效期限約 7 天，需在到期前重新註冊（可排入 Cron）

#### 5.7.3 未來：個人 Google Calendar 串接

後續版本規劃串接個人 Google Calendar。屆時可對多個日曆分別註冊 Watch，或擴大 sync 範圍涵蓋個人日曆，架構已預留擴充空間。

---

## 九、Cron 設定（Zeabur）

Zeabur 支援 Cron Job，建議建立：

| Cron 任務 | 排程 | 指令 | 用途 |
|-----------|------|------|------|
| **Calendar 定時 sync** | `*/10 * * * *`（每 10 分鐘） | `node server/scripts/runCalendarSync.js` | 輪詢 Calendar → Zeabur |
| **Calendar Watch 續期** | `0 0 * * *`（每天 0 點） | `node server/scripts/renewCalendarWatch.js` | Watch 約 7 天到期，需重新註冊 |

或使用 Zeabur 的內建定時觸發功能（依平台文件設定）。`APP_URL` 需設為可從公網存取的網址，供 Webhook 接收使用。

---

## 十、測試檢查清單

- [ ] 成員列表可正常載入
- [ ] 成員詳情可正常顯示
- [ ] 成員頭像（含 avatar 代理）正常
- [ ] 檢查註冊狀態正常
- [ ] 新成員註冊成功
- [ ] 個人資料更新成功
- [ ] 行事曆當日行程顯示正常
- [ ] 行事曆月份列表顯示正常
- [ ] 行程詳情（含 isBirthdayEvent）正常
- [ ] 新增行程成功
- [ ] 編輯行程成功
- [ ] 刪除行程成功
- [ ] 生日行程自動建立正常
- [ ] 版本號 / 快取機制正常
- [ ] 多人同時使用無配額錯誤
- [ ] 在 Google Calendar 網頁手動新增/編輯行程後，定時 sync 或 webhook 觸發後，LIFF 能正確顯示

---

## 十一、回滾計畫

若遷移後出現問題，可暫時回滾：

1. 保留 `sheetService`、`calendarService` 原程式於分支
2. 環境變數加回 `MEMBER_SHEET_ID`、`MEMBER_SHEET_NAME`
3. 路由改回呼叫 `sheetService`、`calendarService`（直接讀 Google）
4. 部署後驗證
5. 再排程修復 Zeabur 方案後重新遷移

---

## 十二、參考連結

- [Zeabur 文件（繁中）](https://zeabur.com/docs/zh-TW)
- [Zeabur PostgreSQL](https://zeabur.com/docs/zh-TW/databases/postgresql)
- [node-postgres (pg)](https://node-postgres.com/)
- [Google Calendar API - Push notifications](https://developers.google.com/calendar/api/guides/push)
- [成員資料試算表欄位說明](./成員資料試算表欄位說明.md)
