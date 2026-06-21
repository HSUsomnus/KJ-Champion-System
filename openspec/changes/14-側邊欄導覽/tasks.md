# Change 14 — 側邊欄導覽 Tasks

## Section 1：建立新元件

- [ ] **1.1** 建立 `frontend/src/components/SidebarNav.jsx`
  - 漢堡 FAB（fixed top-left 16/16，40×40，#2C2C2C）
  - 遮罩 + 側邊欄抽屜（translateX 動畫，220px 寬）
  - 頂部：Logo `/康九_logo.png` + 重整按鈕
  - 導覽項目：NAV_ITEMS + DEVELOPER_ITEMS（role 判斷），useLocation active 高亮
  - 底部：用戶頭像 + 姓名，點擊 navigate /profile + 關閉
  - createPortal → document.body
  - 使用 useAuth 讀 user，不需外部 prop

- [ ] **1.2** 建立 `frontend/src/components/__tests__/SidebarNav.test.jsx`
  - 預設關閉、點漢堡開啟
  - 點遮罩關閉
  - role=開發者 顯示「開發者設定」，一般角色不顯示
  - 跑 `npm --prefix frontend run test:run` 全綠才勾

- [ ] **1.3** 建立 `frontend/src/components/Layout.jsx`
  - 從 AuthContext 讀 user，render `<SidebarNav />` + `<Outlet />`

## Section 2：整合 App.jsx

- [ ] **2.1** 更新 `frontend/src/App.jsx`
  - import Layout
  - ProtectedRoute element 改為 `<Layout />`
  - 移除原有 Header / FabNav 相關 import（若有）

## Section 3：清理所有頁面

- [ ] **3.1** 批次清理 16 個頁面（AddEvent / Calendar / EventDetail / Financial / FinancialEdit / FinancialPreview / FinancialUpload / Home / Management / MemberDetail / Members / Profile / ProfileEdit / UserStats / UserStatsEdit / AgendaSettings）
  - 移除 `import Header` + `<Header user={user} />`
  - 移除 `import FabNav` + `<FabNav onOpen={...} />`
  - 移除 `activeFab` 狀態（若只用於協調 FabNav/FabAction 則整組移除，FabAction 的 onOpen 一併移除）
  - `pt-16` → `pt-14`（含 loading/error state 的 pt-16）
  - 跑 `npm --prefix frontend run test:run` 確認無破壞

## Section 4：刪除舊元件

- [ ] **4.1** 確認 Header.jsx / FabNav.jsx 無其他引用（grep 驗證）後刪除兩個檔案

## Section 5：e2e 測試

- [ ] **5.1** 補 / 更新 `frontend/e2e/` 中關於導覽的 e2e spec
  - sidebar 開啟 / 關閉
  - 點導覽項目後跳頁 + 側邊欄自動關閉
  - active 高亮正確
  - 跑 `npm --prefix frontend run test:e2e` 全綠才勾
