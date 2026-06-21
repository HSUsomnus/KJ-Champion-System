# Change 16 Tasks — SidebarNav UI 重構

## 1. SidebarNav 頂部 Logo + 品牌文字

- [x] **1.1** `SidebarNav.jsx`：頂部區塊在 `康九_logo.png` 右側加上「康九冠軍」文字（15px / 500 / `#2C2C2C`）
- [x] **1.2** 確認重整按鈕仍置於最右側，整體 `justify-content: space-between` 不受影響
- [x] **1.3** ~~vitest~~ → 手動驗收（專案尚未建立 vitest 基礎建設）

## 2. SidebarNav 管理者後台導覽項目

- [x] **2.1** `SidebarNav.jsx`：新增 `MANAGER_ITEMS`（管理者後台 → `/management`，shield icon）
- [x] **2.2** 組合邏輯：`isManager = role !== '一般人'` 才將 `MANAGER_ITEMS` 加入 `items`；`isDeveloper = role === '開發者'` 加入 `DEVELOPER_ITEMS`
- [x] **2.3** ~~vitest~~ → 手動驗收（四角色可見性在 dev 驗收）

## 3. Management.jsx 改版

- [x] **3.1** 頁面 `h1`：`管理介面` → `管理者後台`
- [x] **3.2** Tab 切換 UI：改為 Profile.jsx pill 容器風格（`#EFEDE9` 底容器 + 作用中 `#4A7C59` 綠底白字 + `borderRadius: 20 / 16`）
- [x] **3.3** ~~vitest~~ → 手動驗收（有權限 / 無權限 render 在 dev 驗收）

## 4. UIDESIGN.md 更新

- [x] **4.1** 新增「Pill Tab 規範」段落（樣式規格 + 使用場景）
- [x] **4.2** 新增「SidebarNav 規範」段落（頂部結構、可見性規則、品牌文字規格）
- [x] **4.3** 更新文件頂部「最後更新」日期與版本備注

---

## Section Milestone

### Milestone A（tasks 1–3 全完成後）
```
npm --prefix frontend run test:run
```
全綠才進 task 4。

### Milestone B（tasks 4 完成後）
無自動化測試（純文件），確認格式後完成 change。
