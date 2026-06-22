# Proposal: 桌機版面置中（max-width 限寬，全站一致化）

## 背景

前端為手機優先 PWA。v2.5.0（change 14）已用覆蓋式抽屜 `SidebarNav` 取代舊的 `Header` + `FabNav`，並新增 `Layout.jsx` 包裹器（目前僅 `<SidebarNav/><Outlet/>`，**未做寬度限制**）。

現況問題：**版面寬度不一致**。

- 多數頁面外層為 `min-h-screen flex flex-col`，**無 max-width** → 桌機開啟時內容橫向拉滿整個螢幕，文字行過長、卡片/輸入框比例失衡
- 少數頁面（如 `AgendaSettings.jsx`）已自行加 `max-w-md mx-auto` 置中 → 桌機上呈現乾淨的窄欄置中（即期望樣式）

也就是「正確的樣子」已存在於個別頁面，但沒有全站套用。

## 動機

- 把已驗證的置中樣式（AgendaSettings 的 `max-w-md mx-auto`）**全站一致化**，桌機體驗統一為窄欄置中 + 兩側留白
- 集中在 `Layout.jsx` 一處控制寬度，取代各頁 ad-hoc 寫法，未來好維護
- 手機體驗零回歸（限寬值 ≥ 手機寬）

## 範圍

### 核心功能

1. **置中限寬移入 `Layout.jsx`**：在共用 `Layout` 的 `<Outlet/>` 外層加 `max-w-md mx-auto`，套用至全站所有受保護頁
2. **`FabAction` 對齊置中欄**：右下浮動鈕（幾乎每頁都用，`fixed bottom-right`）水平定位改為對齊置中欄右緣，桌機不黏視窗角
3. **移除各頁 ad-hoc 限寬**：清掉 `AgendaSettings` 等頁面自己加的 `max-w-md mx-auto`，避免雙重包裹、統一由 Layout 控制
4. **Login 頁一致化**：Login 不在 Layout 下，需一併套用相同置中（或包進共用容器）

### 方案方向（沿用前次決議）

採 **方案 A：窄欄置中**（限寬值 `max-w-md` 448px，貼合 AgendaSettings 既有樣式）。不做方案 B（響應式桌機多欄/側邊欄）— 使用以手機為主、桌機偶爾，投報率低。

### 非目標

- 不改 `SidebarNav` 的抽屜行為（覆蓋式、不推擠內容，維持原狀）
- 不做桌機專屬多欄版面
- 不改任何頁面內部結構、配色、元件邏輯（純版面外框 + FabAction 定位）
- 不動後端 / DB / 路由

## 影響

### 受影響的模組

- `frontend/src/components/Layout.jsx`：`<Outlet/>` 外層加 `max-w-md mx-auto`
- `frontend/src/components/FabAction.jsx`：右下定位改為對齊置中欄右緣
- `frontend/src/pages/AgendaSettings.jsx`（及其他自帶 `max-w-md mx-auto` 的頁）：移除 ad-hoc 限寬
- `frontend/src/pages/Login.jsx` + `App.jsx`：Login 頁套用一致置中
- `UIDESIGN.md`：補「版面寬度規範」

### DB 影響

- 無

## 編號說明

原誤用編號 13（與既有 `13-定時同步Calendar` 撞號），已更正為 **17**（12 進行中，13–16 已完成）。
