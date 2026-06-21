# Change 15 — 用戶資料整合

## 背景

使用者希望將「個人資料」、「用戶數據」、「用戶財力」三個獨立頁面整合成一個頁面「用戶資料」，
並用 pill tab 切換三個子頁。側邊欄從三個入口縮減為一個「用戶資料」入口。

## 使用者需求

- 個人資料（Profile）、用戶數據（UserStats）、用戶財力（Financial 自己的）合併為單一頁面
- 頁面名稱改為「用戶資料」
- 三個 pill tab：個人資料 ｜ 用戶數據 ｜ 用戶財力
- 側邊欄移除「用戶數據」和「用戶財力」，改成一個「用戶資料」入口 → `/profile`
- 他人財力（`/financial?userId=xxx`，從 MemberDetail 進入）保持不變

## 技術設計

### URL 架構

| 路由 | 說明 |
|---|---|
| `/profile` | 新整合頁，三 tab，預設顯示「個人資料」tab |
| `/profile/edit` | 不變（ProfileEdit.jsx） |
| `/user-stats` | redirect → `/profile` |
| `/user-stats/edit` | 不變（UserStatsEdit.jsx，onboarding 仍用） |
| `/financial` with `?userId=xxx` | 不變（Financial.jsx，他人財力） |
| `/financial` without userId | redirect → `/profile` |
| `/financial/edit` | 不變（FinancialEdit.jsx） |

### 頁面結構（Profile.jsx 改寫）

```
Profile.jsx
├── 頁面頂部（全 tab 共用）
│   └── 用戶頭像 + 名稱 + 星級（UserStats 的 starLevel）
├── Pill Tabs（個人資料 ｜ 用戶數據 ｜ 用戶財力）
├── Tab 內容區
│   ├── 個人資料：姓名、Email、電話、生日（原 Profile.jsx 內容）
│   ├── 用戶數據：星級、課程紀錄、志工紀錄（原 UserStats.jsx 內容）
│   └── 用戶財力：存款金額 + 文件清單（原 Financial.jsx 自己的部分）
└── FabAction（依 active tab 切換）
    ├── 個人資料 tab：編輯資料（/profile/edit）+ 登出
    ├── 用戶數據 tab：編輯數據（/user-stats/edit）
    └── 用戶財力 tab：編輯財力（/financial/edit）
```

### Pill Tab 樣式

- 容器：`background: #EFEDE9`，`border-radius: 20px`，`padding: 3px`
- Active pill：`background: #4A7C59`，白色文字，`border-radius: 16px`
- Inactive：透明背景，`color: #8A8680`
- 文字大小：12px

### 用戶財力 tab 的資料邏輯

原 Financial.jsx 的 `viewUserId` 來自 `?userId` param，整合後固定使用 `user.lineId`（自己）。
從 API 取財力金額與文件清單的邏輯保持不變，移至 tab 內。

### SidebarNav.jsx 修改

移除：`{ label: '用戶數據', path: '/user-stats' }` 和 `{ label: '用戶財力', path: '/financial' }`

新增（或調整既有的 profile 入口）：`{ label: '用戶資料', path: '/profile' }`

## 邊界定義

- **不改動**：ProfileEdit、UserStatsEdit、FinancialEdit、FinancialUpload、FinancialPreview
- **不改動**：Financial.jsx（保留給 `/financial?userId=xxx` 他人財力）
- **不改動**：onboarding 流程（`/profile/edit` → `/user-stats/edit`）
- **不影響**：App.jsx 的 `isProfileComplete` / `isStatsComplete` 判斷邏輯
