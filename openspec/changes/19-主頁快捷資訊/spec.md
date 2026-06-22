# Change 19 — 主頁快捷資訊

## 背景

使用者希望在主頁一眼看到個人財力狀態，並快速跳到財力上傳頁；同時希望能從主頁直達三個常用系統：LINE Bot、Google 行事曆、安裝 PWA，減少進入各頁面的層數。

---

## 使用者需求

1. **用戶財力區**：主頁歡迎卡片整合財力金額顯示，空值顯示「尚未填寫」灰字，並附「上傳財力」按鈕 → 跳轉 `/financial-upload`
2. **系統連結區**：三個圖示方塊連結按鈕
   - LINE Bot 加好友（外部連結）
   - Google 行事曆訂閱（外部連結）
   - 安裝到手機 PWA（觸發 `beforeinstallprompt`；已安裝則 disabled + 小字「已安裝」）
3. 今日行程保留，維持現有樣式

---

## UI 版面（已選定）

**方案 C — 歡迎列含財力**：

```
┌─────────────────────────────┐
│  👤 歡迎回來   💰 財力金額  │  ← 歡迎+財力同一卡片
│     王小明     [上傳財力]   │
├─────────────────────────────┤
│  系統連結                    │
│ ┌──────┐ ┌──────┐ ┌──────┐ │
│ │ 🟢   │ │ 📅   │ │ 📱   │ │  ← 3格圓形icon方塊
│ │LINE  │ │行事曆│ │安裝  │ │
│ └──────┘ └──────┘ └──────┘ │
├─────────────────────────────┤
│  今日行程                    │
│ ┌─────────────────────────┐ │
│ │ 活動標題        14:00   │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

---

## 技術設計

### 後端（`m_b_主頁快捷資訊_backend`）

新增 `GET /api/line/system-links`：
- 回傳 `{ lineAddFriendUrl, calendarAddUrl }`
- `lineAddFriendUrl` = `process.env.LINE_ADD_FRIEND_URL || null`
- `calendarAddUrl` = `GROUP_CALENDAR_ID` 存在時建構 `https://calendar.google.com/calendar/render?cid=<encoded>`，否則 `null`
- 不需身份驗證（公開端點，URL 本身無敏感資訊）
- 加入 `server/routes/line.js`（現有 LINE 路由檔）

### 前端（`m_b_主頁快捷資訊_frontend`）

**api.js**
- 新增 `getSystemLinks()` → `GET /api/line/system-links`

**Home.jsx** 改動：
1. 歡迎區塊改為卡片（`card` 樣式），右側加財力金額 + 上傳按鈕
2. 新增系統連結區（`getSystemLinks()` 取得 URL），3 個圖示方塊
3. 今日行程保持現有邏輯不動
4. PWA install：監聽 `beforeinstallprompt` event，已安裝偵測用 `window.matchMedia('(display-mode: standalone)').matches`

**色彩（依 UIDESIGN.md）**：
- LINE icon 背景：`#D8F5E5`
- Calendar icon 背景：`#DEEAF6`
- PWA icon 背景：`#E8F0EB`（accent-light）
- 財力金額：`#2C2C2C`（text-primary）
- 「尚未填寫」：`#8A8680`（text-muted）

### 邊界條件
- `lineAddFriendUrl` 為 null → LINE 方塊隱藏
- `calendarAddUrl` 為 null → 行事曆方塊隱藏
- PWA 已安裝（standalone mode）→ 安裝方塊 disabled，opacity 0.45，副文字「已安裝」
- `financialAmount` 空字串 → 顯示「尚未填寫」灰字
