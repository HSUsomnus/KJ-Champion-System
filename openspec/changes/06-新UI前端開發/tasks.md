# Tasks — 06 新UI前端開發

## 進度

`███████████░░` 87% — 完成 7 / 8 個子任務

---

## ✅ 已完成

- [x] **06.1 確認設計方向**（使用者確認）
  - 風格：Warm Minimal（暖調極簡，無印風）
  - 主視覺：圓形元素
  - 技術棧：React 18 + Vite 5 + Tailwind CSS + PWA
  - 不使用 emoji，全 inline SVG icon
  - 登入頁為入口，預設主頁為狀態頁（Home）

- [x] **06.2 建立 React + Vite 專案骨架**（Claude 程式碼）
  - 目錄：`frontend/`
  - 安裝：tailwindcss、vite-plugin-pwa、react-router-dom
  - 設定：vite.config.js（PWA + proxy → localhost:3000）
  - 設定：index.css（色彩系統、字體）

- [x] **06.3 建立設計系統文件**（Claude 程式碼）
  - 檔案：`frontend/DESIGN_SYSTEM.md`
  - 記錄色彩、排版、圓形元素、卡片、按鈕、FAB、SVG icon、間距規範

- [x] **06.4 實作共用元件**（Claude 程式碼）
  - `Header.jsx`：Logo + 重整圓形 icon + 用戶圓形 icon
  - `FabNav.jsx`：左下導航 FAB（**主頁** / 行事曆 / 成員 / 數據 / 財力），Portal 渲染，absolute 子項展開
  - `FabAction.jsx`：右下操作 FAB（新增行程 / 上傳財力 / 修改數據），同上

- [x] **06.5 實作首頁（Home）與登入頁（Login）**（Claude 程式碼）
  - `Home.jsx`：歡迎區塊 + 最新消息卡片（快捷圓形入口已移除，改由左下 FAB 統一導航）
  - `Login.jsx`：LINE 登入按鈕 + 授權回調（有資料 / 無資料 分支）
  - `App.jsx`：React Router 路由設定

---

- [x] **06.6 實作其他功能頁面**（Claude 程式碼）
  - ✅ 行事曆頁（/calendar）— 月曆格 + 日期選取 + 當日行程列表 + 時間表模式切換，右下 FAB 鉛筆 → 新增行程 + 切換模式
  - ✅ 成員列表頁（/members）— 搜尋 + 星等排序 + 點擊卡片進成員詳情，右下 FAB 鉛筆 → 管理介面
  - ✅ 用戶資料頁（/profile）— 舊設計基本資料欄位：頭像 + LINE名 + 姓名/Email/電話/生日（排除星等），右下 FAB 鉛筆 icon → 編輯資料 + 登出
  - ✅ 用戶資料編輯頁（/profile/edit）— 表單編輯基本資料，右下 FAB 鉛筆 icon → 確認（紅色）+ 取消
  - ✅ 用戶數據頁（/user-stats）— 舊設計進階資料欄位：星等 + 課程紀錄/特斯拉加盟主/團隊負責事項/課程志工，右下 FAB 鉛筆 icon → 編輯數據
  - ✅ 用戶數據編輯頁（/user-stats/edit）— 表單編輯進階資料，右下 FAB 鉛筆 icon → 確認（紅色）+ 取消
  - ✅ 財力頁（/financial）— 財力金額 + 歷史上傳記錄，右下 FAB 鉛筆 → 上傳財力
  - ✅ 上傳財力頁（/financial-upload）— 拖曳上傳，右下 FAB 鉛筆 → 確認(紅) + 取消
  - ✅ 新增行程頁（/add-event）— 舊資料分類（學員上課/活動/諮詢簽約/紫星行程聊聊）+ 整日/日期/時間/備註，右下 FAB 鉛筆 → 確認(紅) + 取消
  - ✅ 成員詳情頁（/member/:id）— 資料/數據/財力 三 tab 檢視
  - ✅ 管理介面頁（/management）— 數據/財力/權限 三 tab 管理
  - ✅ 行程詳情頁（/event/:id）— 檢視行程資訊，右下 FAB 鉛筆 → 編輯 + 分享
  - ✅ 行事曆/時間表月份欄位 sticky 固定，不隨滾動消失
  - ✅ 時間表模式分類 filter 功能（全部/學員上課/活動/諮詢簽約/紫星行程聊聊）
  - ✅ 行事曆模式 FAB 加「分享今日行程」
  - ✅ 時間表模式 FAB 加「分享當前篩選行程」
  - ✅ 既有行程點擊導向行程詳情頁，新增行程進入行程編輯頁
  - ✅ 行程編輯頁支援編輯既有行程（從詳情頁帶入資料）
  - ✅ 左下 FAB「財力」改名為「用戶財力」
  - ✅ 用戶資料頁（/profile）標題旁加「隱藏」開關
  - ✅ 用戶財力頁（/financial）標題旁加「隱藏」開關，歷史上傳標題旁加「隱藏」開關
  - ✅ 成員詳情頁（/member/:id）資料/財力 tab 支援隱藏狀態，顯示「該用戶隱藏資料」
  - ✅ 所有編輯頁面離開時彈窗提示「尚未儲存資料，確認離開？」（useBlocker 攔截所有導航，僅 FAB 確認繞過）
  - ✅ 行程編輯頁 FAB 確認後彈窗「行程建立/更新成功，是否分享？」，分享使用共用 shareEvent 工具
  - ✅ 抽出 shareEvent 共用工具（frontend/src/utils/shareEvent.js），EventDetail 同步使用
  - ✅ 管理介面權限控制：一般人顯示無權限頁面，管理者/負責人/開發者可進入
  - ✅ 管理介面權限 tab：負責人和開發者可用 select 修改角色，其他角色僅檢視
  - ✅ 角色系統對齊資料庫（一般人/管理者/負責人/開發者），各角色有對應色彩標籤

---

- [x] **06.7 串接後端 API**（Claude 程式碼）
  - ✅ 建立 API 服務層（`frontend/src/services/api.js`）— 集中管理所有後端呼叫 + 資料映射
  - ✅ 建立 AuthContext（`frontend/src/contexts/AuthContext.jsx`）— 登入狀態管理（user, login, logout, refreshUser）
  - ✅ App.jsx 加入 ProtectedRoute — 未登入自動跳轉 /login
  - ✅ main.jsx 包裹 AuthProvider
  - ✅ 全部 14 個頁面替換假資料為真實 API 呼叫
  - ✅ Login 頁 OAuth 回調串接 api.getProfile + 新用戶導向編輯頁
  - ✅ Vite build 驗證通過（369.57 KB JS, 18.61 KB CSS）

---

## ⬜ 待完成

- [ ] **06.8 推送 DEV 測試站驗證**（Claude git + 使用者驗證）
  1. merge `m_b_開發新UI前端` → `dev`，`git push origin dev`
  2. 使用者在 DEV 測試站（kjcs-dev.pages.dev）驗證：
     - 各頁面 UI 排版（手機 375px–430px）
     - FAB 導航與操作功能
     - 後端 API 資料正確顯示
     - LINE Login OAuth 完整流程
     - PWA 安裝與離線快取
  - ✅ 修正 React hooks 違規：移除所有頁面 JSX 內的 inline useCallback（13 個檔案），避免 early return 導致 hooks 數量不一致崩潰（React error #310）
  - ✅ 修正行程編輯頁標題 placeholder：依類型動態顯示提示詞（與舊版一致）

---

> **下一步**：06.8 DEV 測試中，修復 bug 後重新推送驗證。

最後更新：2026-04-03
