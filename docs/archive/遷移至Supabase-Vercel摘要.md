# 遷移至 Supabase + Vercel 摘要

> 快速參考：從 Google Sheets 遷移至 Supabase PostgreSQL + Vercel Serverless 的關鍵變更

---

## 變更總覽

### 資料儲存
| 項目 | 遷移前 | 遷移後 |
|------|--------|--------|
| 成員資料 | Google Sheets | Supabase PostgreSQL |
| 行程讀取 | Google Calendar API | Supabase PostgreSQL（從 Calendar 同步） |
| 行程寫入 | Google Calendar API | **維持**：Google Calendar API |

### 部署平台
- **遷移前**：可能是本機、Cloud Run 或其他
- **遷移後**：**Vercel Serverless Functions**

---

## 關鍵檔案

### 新增檔案

| 檔案 | 說明 |
|------|------|
| `server/config/db.js` | PostgreSQL 連線池 |
| `server/services/memberDbService.js` | 成員資料庫操作（取代 sheetService） |
| `server/services/eventDbService.js` | 行程資料庫操作 |
| `server/services/calendarSyncService.js` | Calendar → Supabase 同步邏輯 |
| `server/services/calendarWatchService.js` | Calendar Watch 管理 |
| `api/index.js` | Vercel Serverless 入口 |
| `api/cron/sync.js` | Vercel Cron：同步行程 |
| `api/cron/renew-watch.js` | Vercel Cron：續期 Watch |
| `vercel.json` | Vercel 設定（路由、Cron） |
| `database/schema.sql` | 資料庫 Schema |
| `scripts/migrate-sheet-to-supabase.js` | 遷移成員腳本 |
| `scripts/sync-calendar-to-supabase.js` | 初次同步行程腳本 |
| `scripts/register-calendar-watch.js` | 註冊 Watch 腳本 |
| `scripts/renew-calendar-watch.js` | 續期 Watch 腳本 |

### 修改檔案

| 檔案 | 變更 |
|------|------|
| `server/server.js` | 匯出 app（供 Vercel 使用） |
| `server/routes/member.js` | 改用 `memberDbService` |
| `server/routes/profile.js` | 改用 `memberDbService` |
| `server/routes/calendar.js` | 讀取改用 `eventDbService`；新增 `/webhook`、`/cron/sync` |
| `server/services/calendarService.js` | 改用 `memberDbService` |
| `package.json` | 新增 `pg`、`uuid` 依賴；新增 npm scripts |
| `env.example` | 新增 `DATABASE_URL`、`CRON_SECRET` |

---

## 部署流程（5 步驟）

### 步驟 1：建立 Supabase 專案
1. 前往 [Supabase](https://supabase.com) 建立專案
2. 取得 `DATABASE_URL`（Transaction Mode, port 6543）
3. 在 SQL Editor 執行 `database/schema.sql`

### 步驟 2：遷移成員資料
```bash
npm run migrate:members
```

### 步驟 3：初次同步行程
```bash
npm run sync:calendar
```

### 步驟 4：部署至 Vercel
1. 連結 GitHub Repo 到 Vercel
2. 設定所有環境變數（見 `env.example`）
3. 部署

### 步驟 5：註冊 Calendar Watch
```bash
# 更新 .env 的 APP_URL 為 Vercel 網址後執行
npm run watch:register
```

---

## 環境變數檢查清單

部署至 Vercel 前，確認以下變數已設定：

- [ ] `DATABASE_URL` (Supabase)
- [ ] `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- [ ] `GOOGLE_PRIVATE_KEY`
- [ ] `GOOGLE_PROJECT_ID`
- [ ] `GROUP_CALENDAR_ID`
- [ ] `LIFF_ID`
- [ ] `LINE_CHANNEL_ID`
- [ ] `LINE_CHANNEL_SECRET`
- [ ] `LINE_CHANNEL_ACCESS_TOKEN`
- [ ] `APP_URL` (部署後取得)
- [ ] `CRON_SECRET` (選填)
- [ ] `NODE_ENV=production`

---

## 同步機制說明

### 定時同步（Vercel Cron）
- **頻率**：每 15 分鐘
- **端點**：`GET /api/cron/sync`
- **動作**：從 Google Calendar 拉取近期行程寫入 Supabase

### 即時同步（Calendar Watch Webhook）
- **觸發**：Google Calendar 有變更時
- **端點**：`POST /api/calendar/webhook`
- **動作**：收到通知後立即同步

### Watch 續期（Vercel Cron）
- **頻率**：每天 0 點
- **端點**：`GET /api/cron/renew-watch`
- **動作**：檢查並續期 2 天內到期的 Watch

---

## 測試檢查清單

部署後測試：

- [ ] 成員列表顯示正常
- [ ] 成員註冊功能正常
- [ ] 個人資料更新正常
- [ ] 行事曆當日行程顯示正常
- [ ] 行事曆月份列表顯示正常
- [ ] 新增行程成功（寫入 Google Calendar）
- [ ] 編輯行程成功
- [ ] 刪除行程成功
- [ ] 在 Google Calendar 網頁新增行程後，15 分鐘內 LIFF 能看到
- [ ] 多人同時使用無配額錯誤

---

## 常用指令

```bash
# 本機開發（連 Supabase）
npm run dev

# 遷移成員資料（一次性）
npm run migrate:members

# 初次同步行程（一次性）
npm run sync:calendar

# 註冊 Calendar Watch（部署後執行一次）
npm run watch:register

# 手動續期 Watch（通常由 Vercel Cron 自動執行）
npm run watch:renew

# 本機模擬 Vercel 環境
vercel dev
```

---

## 進階：自訂同步頻率

若 15 分鐘延遲太長，可在 `vercel.json` 調整：

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "*/5 * * * *"  // 改成每 5 分鐘
    }
  ]
}
```

**注意**：頻率越高，Vercel Function 用量越高。

---

## 成本估算（小型團隊，約 20 人）

| 項目 | 免費額度 | 預估用量 | 費用 |
|------|----------|----------|------|
| Supabase 儲存 | 0.5 GB | < 0.1 GB | $0 |
| Supabase 計算 | 100 CU-小時 | < 50 CU-小時 | $0 |
| Vercel Function | 100 萬次呼叫 | 約 10～30 萬次 | $0 |
| Vercel 流量 | 100 GB | < 10 GB | $0 |

**預估月費**：**$0**（在免費額度內）

---

## 相關文件

- [Supabase-Vercel 部署完整指南](./Supabase-Vercel部署完整指南.md)
- [Vercel vs Zeabur 詳細比較](./Vercel%20vs%20Zeabur%20詳細比較.md)
- [Sheet 與 Calendar 完全遷移到 Zeabur 方案](./Sheet與Calendar完全遷移到Zeabur方案.md)（可作為 Zeabur 替代方案參考）
