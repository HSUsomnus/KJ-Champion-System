# Change 15 — 用戶資料整合 Tasks

分支：`m_b_用戶資料整合`

---

## Section 1：核心頁面改寫

- [ ] **1.1** 改寫 `frontend/src/pages/Profile.jsx`
  - 頁面頂部（共用）：頭像圓形、用戶名稱、星級 badge
  - Pill tab 切換（個人資料 ｜ 用戶數據 ｜ 用戶財力），active 狀態 #4A7C59，container #EFEDE9
  - 個人資料 tab content：姓名、Email、電話、生日（原 Profile.jsx 資料顯示區）
  - test：`frontend/src/pages/__tests__/Profile.test.jsx` — tab 切換 renders 正確內容

- [ ] **1.2** 加入「用戶數據」tab content
  - 搬移 UserStats.jsx 的星級、課程紀錄、志工紀錄顯示邏輯
  - test：補 Profile.test.jsx — 用戶數據 tab 顯示星級與課程資料

- [ ] **1.3** 加入「用戶財力」tab content
  - `financialAmount` 取自 `user.financialAmount`（直接讀，不需額外 API）
  - 文件清單：呼叫 `api.getFinancialList(user.lineId)` 取得，並在 tab 切到財力時 lazy 載入
  - 隱藏/顯示 toggle 保留（hideFinancial、hideDocuments）
  - test：補 Profile.test.jsx — 用戶財力 tab renders

- [ ] **1.4** FabAction 隨 active tab 切換
  - 個人資料 tab：編輯資料（/profile/edit）+ 登出
  - 用戶數據 tab：編輯數據（/user-stats/edit）
  - 用戶財力 tab：編輯財力（/financial/edit）
  - test：補 Profile.test.jsx — 各 tab 對應的 fab label

---

## Section 2：路由與側邊欄

- [ ] **2.1** 更新 `frontend/src/components/SidebarNav.jsx`
  - 移除 `{ label: '用戶數據', path: '/user-stats' }` 項目
  - 移除 `{ label: '用戶財力', path: '/financial' }` 項目
  - 新增 `{ label: '用戶資料', path: '/profile' }` 項目（置於適當位置）
  - test：`frontend/src/components/__tests__/SidebarNav.test.jsx`（若無則新建）— 確認用戶資料入口存在，用戶數據/財力不在清單

- [ ] **2.2** 更新 `frontend/src/App.jsx` 路由
  - `/user-stats`（無 edit）→ `<Navigate to="/profile" replace />`
  - `/financial`（無 userId param）→ 保留 Financial.jsx，已有 `?userId=xxx` 分流邏輯，無需另加 redirect（Financial.jsx 自己判斷 isViewingOther）

---

## Section 3：Regression

- [ ] **3.1** 跑全套測試
  - `npm --prefix frontend run test:run`（vitest 全部通過）
  - `npm --prefix frontend run test:e2e`（playwright e2e 全部通過）
  - 確認 onboarding 流程不受影響（/profile/edit → /user-stats/edit）
