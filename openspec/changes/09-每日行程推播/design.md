# Design: 每日行程推播 LINE Bot

## 架構

```
前端 (React)                          後端 (Express/Zeabur)
┌──────────────────┐                 ┌─────────────────────────────┐
│ FabNav 開發者入口 │                 │ /api/line/agenda-settings   │
│                  │ ──GET/PUT────→ │   GET: 讀取設定             │
│ AgendaSettings   │                 │   PUT: 更新時間/啟用/對象    │
│ 頁面             │ ──POST───────→ │       → 重排 cron           │
│ (時間/對象/toggle)│                │ /api/line/push-daily-agenda │
│ (手動推播按鈕)    │                 │   手動觸發推播              │
└──────────────────┘                 ├─────────────────────────────┤
                                     │ node-cron scheduler         │
                                     │   讀取 DB 設定時間          │
                                     │   時間到 → agendaService    │
                                     │     → 取明日行程（無則跳過）│
                                     │     → 依對象過濾成員        │
                                     │     → 產生 Flex 訊息        │
                                     │     → 逐一 push             │
                                     └─────────────────────────────┘
```

## 關鍵設計決策

### 1. 為什麼用 node-cron 而非 Vercel Cron？

後端部署在 Zeabur 是長駐 Node.js 程式（非 serverless），可直接使用 node-cron 進程內排程。相比之下 Vercel Cron 需透過 HTTP 觸發 endpoint，對 Zeabur 架構不適用。

### 2. 為什麼用 system_settings 表？

UI 要動態修改推播時間，需要可寫入的持久化儲存。環境變數無法動態修改，記憶體重啟會遺失。`system_settings` 表採 key-value 設計，未來可擴充其他系統設定不需再建表。

### 3. 推播對象如何過濾？

直接使用既有 `members.role` 欄位（一般人 / 管理者 / 負責人 / 開發者）。設定值對應：

| 設定值 | 包含角色 |
|--------|----------|
| `all` | 一般人 + 管理者 + 負責人 + 開發者 |
| `manager_above` | 管理者 + 負責人 + 開發者 |
| `developer` | 開發者 |

### 4. 訊息格式選 Flex 的理由

既有分享功能都用 Flex（`generateShareFlexMessage`、`generateInviteFlexMessage`），維持視覺語言一致。文字訊息無法表現類型色標。

### 5. Rate limit 防護

LINE API 約 500 push/min。對每位成員 push 之間加 200ms 延遲（5 push/sec = 300/min）是保守安全值。個別推播失敗（用戶封鎖 bot 等）不阻斷其他成員。

## 資料流

### 設定更新流程

```
使用者在 UI 改時間 21:00 → 23:00
     ↓
PUT /api/line/agenda-settings
     ↓
agendaService.updateAgendaSettings()
     ↓
UPDATE system_settings SET value='23:00'
     ↓
dailyAgendaScheduler.reschedule('23:00')
     ↓
cron.stop() → cron.schedule('0 23 * * *', ...)
```

### 定時推播流程

```
cron 時間到（Asia/Taipei）
     ↓
agendaService.sendDailyAgenda()
     ↓
getTomorrowEvents()（0:00~23:59+08:00）
     ↓ (若無事件)
記錄 log 並結束
     ↓ (若有事件)
getAllMembers() → filterMembersByTarget(target)
     ↓
generateDailyAgendaFlexMessage(events)
     ↓
for each member:
  pushMessagesToUser(lineId, flex)
  wait 200ms
     ↓
回傳 { totalMembers, sent, failed, eventCount }
```

## Schema

### system_settings

```sql
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

初始 row：
- `daily_agenda_time` = `'21:00'`
- `daily_agenda_enabled` = `'true'`
- `daily_agenda_target` = `'developer'`
