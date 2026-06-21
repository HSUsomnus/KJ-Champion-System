# Tasks: 桌機版面置中（max-width 限寬，全站一致化）

> 分支：`m_b_桌機版面置中`（純前端，單一分支，已對齊 main v2.7.0）
> 原則：蓋一層測一層 — 每個 task 寫 source + 對應 test，跑該層測試全綠才勾 [x] 進下一 task；section milestone 跑全套 regression。
> 方案 A（窄欄置中，`max-w-md` 448px）。

## 1. 置中限寬移入 Layout

- [ ] **1.1** `frontend/src/components/Layout.jsx`：`<Outlet/>` 外層加 `<div className="max-w-md mx-auto">`
  - `SidebarNav` 留在容器外（維持 fixed 對齊視窗）
  - 對應測試：`frontend/src/components/__tests__/Layout.test.jsx`（vitest）— 渲染含 `SidebarNav` + 置中容器，`max-w-md` / `mx-auto` 存在、`Outlet` 內容出現
- [ ] **1.2** 移除各頁 ad-hoc 限寬（`AgendaSettings.jsx` 的 `max-w-md mx-auto` 等），改由 Layout 統一控制
  - 對應測試：跑既有頁面測試，確認外觀結構不破
- [ ] **1.3 Section 1 milestone**：`npm --prefix frontend run test:run` 全綠

## 2. FabAction 對齊置中欄

- [ ] **2.1** `frontend/src/components/FabAction.jsx`：右下 FAB 水平定位 `right: max(16px, calc(50% - 208px))`
  - 對應測試：`FabAction` 測試驗證 inline style 定位值（手機/桌機臨界值）
- [ ] **2.2** 檢查既有 `fixed` 滿寬彈窗（`ConfirmLeaveDialog` / `FinancialEdit` bottom sheet 等）是否需對齊欄寬，需要則處理 + 補測試
- [ ] **2.3 Section 2 milestone**：`npm --prefix frontend run test:run` 全綠 +（涉及互動）`npm --prefix frontend run test:e2e`

## 3. Login 一致化、文件、驗收

- [ ] **3.1** `Login` 頁套用相同 `max-w-md mx-auto` 置中（改 `Login.jsx` 或 `App.jsx`）
  - 對應測試：Login 渲染測試補 case
- [ ] **3.2** 更新 `UIDESIGN.md`：新增「版面寬度規範」（`max-w-md` 置中、由 Layout 統一控制、`FabAction` 用 `max()+calc()` 對齊欄右緣、SidebarNav 漢堡鈕維持視窗角）
- [ ] **3.3 最終 regression**：`npm --prefix frontend run test:run` + `npm --prefix frontend run test:e2e` 全綠
- [ ] **3.4 dev 站手動驗收**（使用者執行）：
  - 桌機 Chrome：**所有頁面**內容置中、兩側米白留白、FAB 對齊置中欄右緣（與 AgendaSettings 現有樣式一致）
  - 手機 PWA：版面與目前**完全一致**（限寬零回歸）、抽屜選單正常
  - 視窗從寬縮到 448px 附近：FAB 定位平滑無抖動
