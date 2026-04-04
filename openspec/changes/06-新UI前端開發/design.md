# Design — 06 新UI前端開發

## 技術棧

| 項目 | 選擇 |
|------|------|
| 框架 | React 18 + Vite 5 |
| 樣式 | Tailwind CSS v3（mobile-first） |
| PWA | vite-plugin-pwa（Workbox） |
| 路由 | React Router v6 |
| 認證 | 沿用後端 LINE OAuth（`server/routes/auth.js`），不用 liff.js |
| 狀態管理 | 之後視情況加 Zustand |

## UI 設計方向

**風格：Warm Minimal（暖調極簡）**

- 靈感來源：無印良品（MUJI）設計哲學
- 圓形元素為主視覺語言（FAB、頭像、快捷入口、按鈕）
- 全 inline SVG icon，禁止 emoji 與外部 icon library
- 詳細規範見 `frontend/DESIGN_SYSTEM.md`

### 色彩系統

| 名稱 | 色碼 | 用途 |
|------|------|------|
| bg | `#F7F5F2` | 米白背景 |
| surface | `#FFFFFF` | 卡片白 |
| surface-2 | `#EFEDE9` | 次層背景、按鈕背景 |
| border | `#E2DED8` | 邊框、分隔線 |
| text-primary | `#2C2C2C` | 主要文字（深炭灰） |
| text-muted | `#8A8680` | 次要文字（暖灰） |
| accent | `#4A7C59` | 強調色（墨綠） |
| line-green | `#06C755` | 僅 LINE 登入按鈕 |

## 前端架構

```
frontend/
├── public/
│   ├── 康九_logo.png
│   └── icons/           ← PWA 圖示
├── src/
│   ├── components/
│   │   ├── Header.jsx   ← 每頁共用（Logo + 重整 + 用戶圓形）
│   │   ├── FabNav.jsx   ← 左下導航 FAB（Portal 渲染）
│   │   ├── FabAction.jsx← 右下操作 FAB（Portal 渲染）
│   │   └── ConfirmLeaveDialog.jsx ← 離開提示對話框
│   ├── contexts/
│   │   └── AuthContext.jsx ← 登入狀態管理（user, login, logout, refreshUser）
│   ├── services/
│   │   └── api.js        ← API 服務層（集中管理所有後端呼叫 + 資料映射）
│   ├── utils/
│   │   └── shareEvent.js ← 行程分享工具
│   ├── pages/
│   │   ├── Login.jsx          ← 入口頁（LINE OAuth）
│   │   ├── Home.jsx           ← 狀態主頁
│   │   ├── Calendar.jsx       ← 行事曆（月曆 + 日行程）
│   │   ├── Members.jsx        ← 成員列表（搜尋 + 頭像 + 角色）
│   │   ├── Profile.jsx        ← 用戶資料（基本資料，排除星等）
│   │   ├── ProfileEdit.jsx    ← 用戶資料編輯頁
│   │   ├── UserStats.jsx      ← 用戶數據（進階資料，含星等）
│   │   ├── UserStatsEdit.jsx  ← 用戶數據編輯頁
│   │   ├── Financial.jsx      ← 用戶財力（金額 + 文件列表）
│   │   ├── FinancialUpload.jsx← 上傳財力（拖曳上傳）
│   │   ├── AddEvent.jsx       ← 新增/編輯行程（表單，編輯時帶入既有資料）
│   │   ├── EventDetail.jsx    ← 行程詳情（檢視，FAB: 編輯 + 分享）
│   │   ├── Members.jsx        ← 成員列表（搜尋 + 星等排序）
│   │   ├── MemberDetail.jsx   ← 成員詳情（資料/數據/財力 tabs）
│   │   └── Management.jsx     ← 管理介面（數據/財力/權限 tabs）
│   ├── App.jsx          ← React Router 路由 + Auth 守衛（ProtectedRoute）
│   ├── main.jsx         ← 入口（AuthProvider 包裹 App）
│   └── index.css        ← Tailwind + 色彩系統
├── index.html
├── vite.config.js       ← PWA + proxy → localhost:3000
└── DESIGN_SYSTEM.md     ← 設計規範文件
```

## 頁面流程

```
登入頁（Login.jsx）
  │
  ├─ LINE 登入驗證按鈕 → LINE OAuth 授權頁
  │
  ├─ 授權成功 + 有用戶資料 → 確認進入 → 主頁（Home）
  │
  └─ 授權成功 + 無用戶資料 → 確認進入 → 用戶資料編輯頁
```

### 行程相關流程

```
行事曆/時間表 → 點擊既有行程 → 行程詳情頁（EventDetail）
  │                              FAB: 編輯 + 分享
  │                              編輯 → 行程編輯頁（AddEvent，帶入資料）
  │
  └─ FAB「新增行程」→ 行程編輯頁（AddEvent，空白表單）
                      FAB: 確認（紅色）+ 取消
```

### 行事曆 sticky + 分類篩選

- 月份切換欄位 sticky 固定於 Header 下方，不隨頁面滾動消失
- 時間表模式：分類 tabs（全部/學員上課/活動/諮詢簽約/紫星行程聊聊）也固定，選中高亮篩選
- 行事曆模式 FAB：新增行程 + 時間表模式 + 分享今日行程
- 時間表模式 FAB：新增行程 + 行事曆模式 + 分享當前篩選行程

## Header 設計（每頁共用）

```
┌──────────────────────────────┐
│ [logo] [重整]    [頭像] 姓名  │
└──────────────────────────────┘
```

- 左上：康九 Logo + 重新整理圓形 icon
- 右上：用戶頭像圓形 + 真實姓名（點擊進入用戶資料頁）
- 背景：半透明毛玻璃效果（`backdrop-filter: blur(12px)`）

## FAB 設計

### 左下 FAB（導航，深灰 `#2C2C2C`）

展開子項：行事曆 / 成員列表 / 用戶數據 / 財力

### 右下 FAB（操作，墨綠 `#4A7C59`）

展開子項：新增行程 / 上傳財力 / 修改數據

### FAB 技術實作

- React Portal 渲染到 `document.body`（避免 stacking context 問題）
- 容器 `position: fixed` 固定尺寸（56px），子項用 `position: absolute` 向上展開
- 展開動畫：opacity + translateY，stagger delay 40ms
- 兩 FAB 遮罩互斥

## 部署方式

- 開發：`cd frontend && npm run dev`（Vite，port 5173）
- 建置：`cd frontend && npm run build` → `frontend/dist/`
- 後端整合：`USE_REACT_FRONTEND=1` 讓 Express serve `frontend/dist/`
- DEV 測試：merge `m_b_開發新UI前端` → `dev`，push 後 Cloudflare Pages 自動部署至 kjcs-dev.pages.dev
- 正式部署：Cloudflare Pages（之後設定）

## DEV 測試驗證項目

API 串接完成後，推送 DEV 一併驗證：

- 各頁面 UI 排版（手機 375px–430px）
- FAB 導航與操作功能
- 後端 API 資料正確顯示（替換假資料後）
- LINE Login OAuth 完整流程
- PWA 安裝與離線快取

## 手機螢幕適配

- 基準：375px（iPhone SE）
- 支援：360px–430px
- FAB 固定位置：`bottom: 24px`，左右各 `16px`
- `min-height: 100svh`（支援手機動態工具列）

---

*建立日期：2026-04-01*
*最後更新：2026-04-02（新增 API 服務層、AuthContext、ProtectedRoute 架構 + DEV 測試部署流程）*
