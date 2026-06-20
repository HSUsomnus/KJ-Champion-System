# Spec: 09-每日行程推播

> ✅ DONE（後端 v2.2.0 + 前端 v2.3.0 全部上線）

## 背景與範圍

目前系統有 LINE Bot 分享行程的功能（單筆/月份），但需要使用者主動觸發。希望能於每日固定時間，將「明日行程」推播到成員的 LINE 聊天室，讓成員提前知道隔天的安排。

### 核心功能

1. **定時推播**：每日指定時間，自動推送「明日行程」給成員（預設 21:00 Asia/Taipei）
2. **可設定推播時間**：開發者透過前端管理介面設定
3. **可設定推播對象**：三選項 — 全體用戶 / 管理者以上 / 開發者（預設：開發者）
4. **可啟用/停用**：toggle 開關
5. **手動觸發**：開發者可在管理介面立即觸發推播（測試用）
6. **無行程則不推送**：避免騷擾

### 權限控制

僅「開發者」角色可存取推播設定管理介面（`/agenda-settings`）。

### 非目標

- 不實作使用者個人偏好
- 不實作通知靜音/勿擾時段
- 不實作排除特定日期

---

## 技術設計

### 架構

```
前端 AgendaSettings → GET/PUT /api/line/agenda-settings → agendaService
                    → POST /api/line/push-daily-agenda（手動）

node-cron scheduler（Asia/Taipei）
  → 時間到 → agendaService.sendDailyAgenda()
  → 取明日行程 → 依對象過濾成員 → 產生 Flex 訊息 → 逐一 push（200ms 間隔）
```

### 推播對象過濾

| 設定值 | 包含角色 |
|--------|----------|
| `all` | 一般人 + 管理者 + 負責人 + 開發者 |
| `manager_above` | 管理者 + 負責人 + 開發者 |
| `developer` | 開發者 |

### system_settings 表（key-value）

```sql
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

初始值：`daily_agenda_time = '21:00'`、`daily_agenda_enabled = 'true'`、`daily_agenda_target = 'developer'`

**為何用 system_settings 而非環境變數**：UI 要動態修改設定，環境變數無法動態改、記憶體重啟會遺失。key-value 設計未來可擴充其他系統設定不需再建表。

### 為何用 node-cron

後端部署在 Zeabur 是長駐 Node.js 程式（非 serverless），可直接使用進程內排程，不需透過 HTTP 觸發。

### Flex 字卡設計（Warm Minimal）

- Header：`#4A7C59` accent 底白字日期
- Body：`#F7F5F2` 米白底，每個 event 為 `#FFFFFF` 白底卡片（邊框 + 圓角 + padding）
- Event row 點擊 → `${FRONTEND_URL}/event/${id}`
- Footer「開啟行事曆」→ `${FRONTEND_URL}/calendar`

### Toggle inline style 不用 Tailwind class

Tailwind JIT 在動態 class 名（如 `translate-x-${on ? '5' : '0'}`）會漏掃，production build 沒有對應 class，knob 不會動。改用 `style={{ transform: ... }}` 直接寫值。

### Rate limit 防護

LINE API 約 500 push/min。每位成員之間加 200ms 延遲（5 push/sec），個別失敗不阻斷其他成員。
