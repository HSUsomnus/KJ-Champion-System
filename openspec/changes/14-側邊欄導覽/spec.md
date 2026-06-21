# Change 14 — 側邊欄導覽

## 背景

使用者反映左下角 FAB 展開導覽的操作步驟偏多，且頂部 Header 與 FAB 各自佔用版面空間但功能重疊（都是導覽 / 用戶識別）。  
需求：將兩者整合為一個左側抽屜式側邊欄，讓頁面版面更乾淨，導覽路徑也更直觀。

---

## 使用者需求

- 移除固定頂部 Header（Logo、重新整理、用戶頭像）
- 移除左下角 FAB 導覽（漢堡展開選單）
- 新增左側抽屜式側邊欄，整合兩者內容
- 關閉狀態：全版面頁面，左上角懸浮一個漢堡 FAB 按鈕
- 右下角 FabAction 保持不變

---

## 技術設計

### 新元件：`frontend/src/components/SidebarNav.jsx`

**取代**：`Header.jsx` + `FabNav.jsx`

#### 關閉狀態
- 漢堡 FAB 按鈕：`position: fixed`、`top: 16px`、`left: 16px`、40×40px 圓形、背景 `#2C2C2C`
- 頁面全版面，無頂欄

#### 開啟狀態
- 遮罩：`position: fixed, inset: 0`、`rgba(44,44,44,0.35)`，點擊關閉
- 側邊欄：`position: fixed`、左側滑入（`translateX(-100%) → 0`）、寬 220px、全高
- 背景 `#FFFFFF`、右側邊框 `1px solid #E2DED8`

#### 側邊欄內容（由上到下）
1. **頂部**：`/康九_logo.png` + 重新整理按鈕（`window.location.reload()`）
2. **導覽項目**（同現有 FabNav，加 `useLocation` active 高亮）：
   - 主頁 `/`
   - 行事曆 `/calendar`
   - 成員列表 `/members`
   - 用戶數據 `/user-stats`
   - 用戶財力 `/financial`
   - 開發者設定 `/agenda-settings`（限 `user.role === '開發者'`）
3. **底部**：用戶頭像 + 姓名 → 點擊 navigate `/profile` + 關閉側邊欄

#### 互動行為
- 點導覽項目後自動關閉側邊欄
- 點遮罩關閉
- 漢堡按鈕 toggle
- 使用 `createPortal` 掛 `document.body`

### 新元件：`frontend/src/components/Layout.jsx`

全域 Layout wrapper，包含：
- `<SidebarNav />` — 一次掛載，所有頁面共用
- `<Outlet />` — 頁面內容

### 修改：`frontend/src/App.jsx`

ProtectedRoute 的 `element` 改為 `<Layout />`，不再從 App 層處理 Header / FabNav。

### 修改：所有 16 個頁面

- 移除 `import Header` + `<Header user={user} />`
- 移除 `import FabNav` + `<FabNav onOpen={...} />`
- 移除 `activeFab` 狀態（各頁面若僅用於 FabNav/FabAction 協調則可移除）
- `pt-16` → `pt-14`（56px，確保內容不被左上角漢堡按鈕遮蓋）
- FabAction 的 `onOpen` 若原本只設 `activeFab` 可移除，FabAction 本身不變

### 刪除舊元件

- `frontend/src/components/Header.jsx`
- `frontend/src/components/FabNav.jsx`

---

## 邊界定義

- FabAction（右下角）完全不動
- Login 頁 / ProfileEdit / UserStatsEdit（onboarding 流程）不掛 SidebarNav（ProtectedRoute 的 onboarding redirect 仍在，Layout 只包 Outlet，不額外判斷）
- SidebarNav 從 AuthContext 讀 `user`，不需要 prop 傳入
