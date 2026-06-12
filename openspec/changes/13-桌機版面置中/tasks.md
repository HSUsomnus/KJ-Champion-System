# Tasks: 桌機版面置中（max-width 限寬）

> 分支：`m_b_桌機版面置中`（純前端，單一分支）
> 原則：蓋一層測一層 — 每個 task 寫 source + 對應 test，跑該層測試全綠才勾 [x] 進下一 task；section milestone 跑全套 regression。

## 1. 共用置中版面容器

- [ ] **1.1** 新增 `frontend/src/components/Layout.jsx`
  - `<div className="mx-auto max-w-md relative" style={{ minHeight: '100svh' }}>{children}</div>`（或等效）
  - 維持 `#root` 米白底滿版，欄內沿用既有底色
  - 對應測試：`frontend/src/components/__tests__/Layout.test.jsx`（vitest）— 渲染 children、套用 `max-w-md` + `mx-auto`、容器存在
- [ ] **1.2** `frontend/src/App.jsx` 以 `<Layout>` 包住路由輸出（Login + 受保護頁皆涵蓋）
  - 確認 onboarding guard / 路由跳轉行為不變
  - 對應測試：跑既有 App / 路由相關測試，必要時補 case
- [ ] **1.3 Section 1 milestone**：`npm --prefix frontend run test:run` 全綠

## 2. 固定元素對齊置中欄

- [ ] **2.1** `frontend/src/components/Header.jsx`：固定定位改為對齊置中欄（限寬 + 置中，視覺與現況一致）
  - 對應測試：`Header` 既有測試補 case 或新增，驗證限寬樣式
- [ ] **2.2** `frontend/src/components/FabNav.jsx`：左下 FAB 水平定位 `left: max(16px, calc(50% - 208px))`
  - 對應測試：`FabNav` 測試驗證 inline style 定位值
- [ ] **2.3** `frontend/src/components/FabAction.jsx`：右下 FAB 水平定位 `right: max(16px, calc(50% - 208px))`
  - 對應測試：`FabAction` 測試驗證 inline style 定位值
- [ ] **2.4** 檢查既有 `fixed` 滿寬彈窗（BottomSheet / Dialog / ConfirmLeaveDialog 等）是否需對齊欄寬，需要則一併處理 + 補測試
- [ ] **2.5 Section 2 milestone**：`npm --prefix frontend run test:run` 全綠 +（涉及互動）`npm --prefix frontend run test:e2e`

## 3. 清理、文件、驗收

- [ ] **3.1**（選擇性）移除 `frontend/src/App.css` 未使用的 Vite 範本殘留樣式
- [ ] **3.2** 更新 `UIDESIGN.md`：新增「版面寬度規範」（限寬值 `max-w-md`、Layout 用法、固定元素 `max()+calc()` 對齊規則）
- [ ] **3.3 最終 regression**：`npm --prefix frontend run test:run` + `npm --prefix frontend run test:e2e` 全綠
- [ ] **3.4 dev 站手動驗收**（使用者執行）：
  - 桌機 Chrome：內容置中、兩側米白留白、Header 與 FAB 對齊置中欄
  - 手機 PWA：版面與目前**完全一致**（限寬零回歸）
  - 視窗從寬縮到 448px 附近：FAB 定位無抖動、平滑切換
