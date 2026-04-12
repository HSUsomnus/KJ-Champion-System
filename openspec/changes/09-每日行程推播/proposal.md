# Proposal: 每日行程推播 LINE Bot

## 背景

目前系統有 LINE Bot 分享行程的功能（單筆/月份），但需要使用者主動觸發。希望能主動於每日固定時間，將「明日行程」推播到成員的 LINE 聊天室，讓成員提前知道隔天的安排。

## 動機

- 成員睡前可以先確認隔天行程，減少忘記或臨時查詢的困擾
- 減少管理者手動通知的負擔
- 善用既有的 LINE Bot Messaging API 能力

## 範圍

### 核心功能

1. **定時推播**：每日指定時間，自動推送「明日行程」給成員
2. **可設定推播時間**：開發者透過前端管理介面設定（預設 21:00 台北時間）
3. **可設定推播對象**：三選項 — 全體用戶 / 管理者以上 / 開發者（預設：開發者）
4. **可啟用/停用**：toggle 開關
5. **手動觸發**：開發者可在管理介面立即觸發推播（測試用）
6. **無行程則不推送**：避免騷擾

### 權限控制

- 僅「開發者」角色可存取推播設定管理介面
- FabNav 對非開發者不顯示「推播設定」入口

### 訊息格式

- LINE Flex Message（字卡）
- Header：藍色「📅 明日行程預報」+ 日期
- Body：事件列表（時間 + 標題 + 類型色標）
- Footer：「開啟行事曆」按鈕

## 非目標

- 不實作使用者個人偏好（所有符合條件的成員都收相同訊息）
- 不實作通知靜音/勿擾時段
- 不實作排除特定日期（假日等）

## 影響

### 受影響的模組

- 後端：
  - `server/services/lineService.js`（新增 Flex 訊息產生器）
  - `server/routes/line.js`（新增 3 個 API endpoint）
  - `server/server.js`（整合 scheduler + DB migration）
- 前端：
  - `frontend/src/pages/AgendaSettings.jsx`（新頁面）
  - `frontend/src/components/FabNav.jsx`（新增開發者入口）

### DB 影響

- 新增 `system_settings` 表（key-value 儲存推播設定）
- 重用既有 `members.role` 欄位做權限/對象過濾
