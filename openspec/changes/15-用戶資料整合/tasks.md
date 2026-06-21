# Change 15 — 用戶資料整合 Tasks

分支：`m_b_用戶資料整合`

---

## Section 1：核心頁面改寫

- [x] **1.1–1.4** 改寫 `frontend/src/pages/Profile.jsx`（一次完成）
  - 頁面頂部（共用）：頭像 + 名稱 + 星級 badge
  - Pill tab 切換（個人資料 ｜ 用戶數據 ｜ 用戶財力），active #4A7C59，container #EFEDE9
  - 個人資料 tab：姓名、Email、電話、生日（含隱藏 toggle 實際生效）
  - 用戶數據 tab：星級卡、課程紀錄、特斯拉加盟主、團隊負責事項、課程志工
  - 用戶財力 tab：財力金額 + 文件清單，lazy 載入，兩層 toggle（financialAmount / documents）
  - FabAction 隨 active tab 切換（個人資料：編輯+登出；數據：編輯數據；財力：上傳+選取編輯）
  - 注意：vitest/playwright 尚未安裝，測試走 dev 站手動驗收

---

## Section 2：路由與側邊欄

- [x] **2.1** 更新 `frontend/src/components/SidebarNav.jsx`
  - 移除 `{ label: '用戶數據', path: '/user-stats' }` 項目
  - 移除 `{ label: '用戶財力', path: '/financial' }` 項目
  - 新增 `{ label: '用戶資料', path: '/profile' }` 項目（置於原用戶數據位置）
  - 底部用戶區的「個人資料」文字改為「用戶資料」

- [x] **2.2** 更新 `frontend/src/App.jsx` 路由
  - `/user-stats`（無 edit）→ `<Navigate to="/profile" replace />`
  - `/financial`（無 userId param）→ 保留 Financial.jsx，已有 `?userId=xxx` 分流邏輯，無需另加 redirect（Financial.jsx 自己判斷 isViewingOther）

- [x] **2.3** 更新 `frontend/src/pages/MemberDetail.jsx` tab 樣式
  - TABS 改為物件陣列 `{ key, label }`，label 改為「個人資料 | 用戶數據 | 用戶財力」
  - 舊個別按鈕（黑底/白底切換）→ pill 容器樣式（#EFEDE9 底，active #4A7C59）
  - tab state 仍用 key string（'資料'/'數據'/'財力'），內容條件不需改

---

## Section 3：Regression

- [ ] **3.1** dev 站手動驗收清單
  - [ ] 側邊欄「用戶資料」導到 /profile，三 tab 正常切換
  - [ ] 個人資料 tab：姓名/Email/電話/生日顯示，隱藏 toggle 生效
  - [ ] 用戶數據 tab：星級卡、課程紀錄、志工紀錄顯示
  - [ ] 用戶財力 tab：金額顯示、文件清單 lazy 載入、兩層 toggle
  - [ ] 各 tab 的 FabAction 顯示正確按鈕，點擊可跳轉編輯頁
  - [ ] 登出按鈕（個人資料 tab）正常
  - [ ] onboarding 流程（/profile/edit → /user-stats/edit）不受影響
  - [ ] /financial?userId=xxx 他人財力頁面正常（不受影響）
