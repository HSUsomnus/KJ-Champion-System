# Spec: 06-新UI前端開發

> ✅ DONE（v2.0.0 已上線）

## 背景與範圍

目前前端為 `public/` 目錄下的 Vanilla HTML/JS 靜態頁面，使用者體驗與視覺設計需要全面翻新。liff.js 已廢棄，不再使用。

### 目標

- Warm Minimal 設計方向（暖調極簡）
- 建立設計系統文件（`UIDESIGN.md`）
- 實作所有功能頁面新 UI
- 串接現有後端 API
- LINE Login OAuth 流程在新 UI 正常運作
- PWA 安裝與離線快取

### 範圍

**In scope**：`frontend/` 目錄（React + Vite）、登入頁、主頁、行事曆、成員、個人資料、用戶數據、財務頁、PWA、手機螢幕適配（375px–430px）

**Out of scope**：後端 API 修改、資料庫變動

---

## 技術設計

### 技術棧

| 項目 | 選擇 |
|------|------|
| 框架 | React 18 + Vite 5 |
| 樣式 | Tailwind CSS v3（mobile-first）|
| PWA | vite-plugin-pwa（Workbox）|
| 路由 | React Router v6 |
| 認證 | 沿用後端 LINE OAuth，不用 liff.js |

### 色彩系統（Warm Minimal）

| 名稱 | 色碼 | 用途 |
|------|------|------|
| bg | `#F7F5F2` | 米白背景 |
| surface | `#FFFFFF` | 卡片白 |
| border | `#E2DED8` | 邊框、分隔線 |
| text-primary | `#2C2C2C` | 主要文字（深炭灰）|
| text-muted | `#8A8680` | 次要文字（暖灰）|
| accent | `#4A7C59` | 強調色（墨綠）|
| line-green | `#06C755` | 僅 LINE 登入按鈕 |

### FAB 設計

- **左下 FAB**（導航，`#2C2C2C`）：行事曆 / 成員列表 / 用戶數據 / 財力
- **右下 FAB**（操作，`#4A7C59`）：新增行程 / 上傳財力 / 修改數據
- React Portal 渲染到 `document.body`（避免 stacking context 問題）
- 展開動畫：opacity + translateY，stagger delay 40ms，兩 FAB 遮罩互斥

### 前端目錄結構

```
frontend/src/
  ├── components/   Header / FabNav / FabAction / ConfirmLeaveDialog
  ├── contexts/     AuthContext.jsx
  ├── services/     api.js（集中管理所有後端呼叫）
  ├── utils/        shareEvent.js
  └── pages/        Login / Home / Calendar / Members / Profile / UserStats / Financial / AddEvent / EventDetail / ...
```
