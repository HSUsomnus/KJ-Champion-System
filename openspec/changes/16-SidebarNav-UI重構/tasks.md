# Change 16 Tasks — SidebarNav UI 重構

## 1. SidebarNav 頂部 Logo + 品牌文字

- [ ] **1.1** `SidebarNav.jsx`：頂部區塊在 `康九_logo.png` 右側加上「康九冠軍」文字（15px / 500 / `#2C2C2C`）
- [ ] **1.2** 確認重整按鈕仍置於最右側，整體 `justify-content: space-between` 不受影響
- [ ] **1.3** vitest：新增 SidebarNav render test，確認「康九冠軍」文字存在於 DOM

## 2. SidebarNav 管理者後台導覽項目

- [ ] **2.1** `SidebarNav.jsx`：新增 `MANAGER_ITEMS`（管理者後台 → `/management`，shield icon）
- [ ] **2.2** 組合邏輯：`user?.role !== '一般人'` 才將 `MANAGER_ITEMS` 加入 `items`（開發者同時擁有 `MANAGER_ITEMS` + `DEVELOPER_ITEMS`）
- [ ] **2.3** vitest：測試四個角色（一般人 / 管理者 / 負責人 / 開發者）的 items 組合正確性

## 3. Management.jsx 改版

- [ ] **3.1** 頁面 `h1`：`管理介面` → `管理者後台`
- [ ] **3.2** Tab 切換 UI：改為 Profile.jsx pill 容器風格（`#EFEDE9` 底容器 + 作用中 `#4A7C59` 綠底白字 + `borderRadius: 20 / 16`）
- [ ] **3.3** vitest：測試 Management 在有權限 / 無權限情況下的 render 行為

## 4. UIDESIGN.md 更新

- [ ] **4.1** 新增「Pill Tab 規範」段落（樣式規格 + 使用場景）
- [ ] **4.2** 新增「SidebarNav 規範」段落（頂部結構、可見性規則、品牌文字規格）
- [ ] **4.3** 更新文件頂部「最後更新」日期與版本備注

---

## Section Milestone

### Milestone A（tasks 1–3 全完成後）
```
npm --prefix frontend run test:run
```
全綠才進 task 4。

### Milestone B（tasks 4 完成後）
無自動化測試（純文件），確認格式後完成 change。
