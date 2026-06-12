# Proposal: 桌機版面置中（max-width 限寬）

## 背景

前端為手機優先（mobile-first）的 React + Vite PWA。每一頁的最外層都是 `min-h-screen flex flex-col`，**全前端沒有任何 `max-w-*` 限寬容器**（`frontend/src` 內 `max-w-md/lg/...` 出現次數為 0），`#root`（index.css）也未設寬度。

結果：用桌機瀏覽器開啟時，原本給手機看的單欄內容會被橫向拉滿整個螢幕寬度，造成：

- 文字一行過長（一行字元數遠超舒適閱讀的 45～75），讀起來累、易跳行
- 卡片 / 按鈕 / 輸入框被拉得過寬，比例失衡
- 整體視覺鬆散，不符合 Warm Minimal 的聚焦調性

這不是刻意的設計決策，而是從未加上限寬置中容器的缺漏。

## 動機

- 桌機瀏覽體驗對齊主流做法（窄欄置中 + 兩側留白），改善可讀性與視覺聚焦
- 手機體驗維持完全不變（欄寬本來就 ≤ 限寬值，不受影響）
- 一處集中控制版面寬度，未來好維護

## 範圍

### 核心功能

1. **新增共用置中版面容器**：限制內容最大寬度並水平置中，套用至全站所有頁面（含 Login 與受保護頁）
2. **固定元素對齊置中欄**：`Header`（fixed 滿寬）、`FabNav`（fixed 左下）、`FabAction`（fixed 右下）三個 `position: fixed` 元素需對齊置中欄的左右邊界，桌機上不可黏在視窗角落與內容欄錯位
3. **手機零回歸**：螢幕寬度 ≤ 限寬值時，版面與目前完全一致

### 非目標

- 不做桌機專屬的多欄 / 側邊欄版面（維持單欄，只是置中限寬）
- 不改任何頁面的內部結構、配色、元件行為（純版面外框與固定元素定位）
- 不動後端、不動資料庫、不動路由邏輯

## 影響

### 受影響的模組（全前端）

- `frontend/src/App.jsx`：以共用 Layout 容器包住 `Outlet` / 各路由
- `frontend/src/components/Layout.jsx`：**新增**置中限寬容器元件
- `frontend/src/components/Header.jsx`：固定定位改為對齊置中欄
- `frontend/src/components/FabNav.jsx`：左下 FAB 水平定位改為對齊置中欄左緣
- `frontend/src/components/FabAction.jsx`：右下 FAB 水平定位改為對齊置中欄右緣
- （選擇性）`frontend/src/App.css`：移除未使用的 Vite 範本殘留樣式

### DB 影響

- 無

### UIDESIGN.md

- 需在 `UIDESIGN.md` 補一條「版面寬度規範」（限寬值、置中容器用法、固定元素對齊規則）
