# Change 16 — SidebarNav UI 重構

## 背景

v2.5.0 的 change 14 完成了 SidebarNav 基本骨架（漢堡 FAB + 抽屜式側欄 + 用戶底部區）。
本次針對三個面向強化：

1. **頂部品牌識別**：加上「康九冠軍」文字，讓品牌更清晰
2. **管理者後台入口整合**：把 `/management` 頁面的入口移進 SidebarNav，並限定有權限者才看到
3. **管理者後台頁面優化**：tab 切換樣式統一為 pill 容器風格（與 Profile.jsx 一致）、頁面標題改名

## 使用者需求

- SidebarNav 頂部中間顯示「康九冠軍」品牌名稱（Logo 圖片右側並排）
- 管理者後台入口在 SidebarNav 中，權限為「一般人」不得進入，**一般人看不到此項目**
- 管理介面改名為「管理者後台」
- 管理者後台 tab 切換改為 pill 容器風格（參考 Profile.jsx 樣式）
- SidebarNav 中「開發者設定」僅開發者可見（已實作，維持現狀）
- 更新 UIDESIGN.md，補充 Pill Tab 規範與 SidebarNav 規範

## 技術設計

### 1. SidebarNav 頂部改版（Option B）

現況：
```
[康九_logo.png]   [重整按鈕]
```

改為：
```
[康九_logo.png] [康九冠軍 text]   [重整按鈕]
```

- `康九_logo.png` 點擊仍導航 `/`
- 文字「康九冠軍」緊鄰 logo 右側，`font-size: 15px, font-weight: 500`

### 2. 管理者後台導覽項目

在 `NAV_ITEMS` 與 `DEVELOPER_ITEMS` 之間新增 `MANAGER_ITEMS`：

```js
const MANAGER_ITEMS = [
  {
    label: '管理者後台',
    path: '/management',
    icon: <shield svg>,
  },
]
```

條件：`user?.role !== '一般人'`（管理者 / 負責人 / 開發者 才看到）

### 3. Management.jsx 修改

- 頁面 `h1` 標題：`管理介面` → `管理者後台`
- Tab 切換 UI：從現有的獨立 pill button 改為 Profile.jsx 的容器 pill 風格

現況（Management.jsx）：
```jsx
<button ... style={{ background: tab === t ? '#2C2C2C' : '#fff', border: tab === t ? 'none' : '1px solid #E2DED8' }}>
```

改為（Profile.jsx 風格）：
```jsx
<div style={{ display: 'flex', background: '#EFEDE9', borderRadius: 20, padding: 3 }}>
  <button style={{ flex: 1, background: activeTab === t ? '#4A7C59' : 'transparent', color: activeTab === t ? '#fff' : '#2C2C2C', borderRadius: 16, border: 'none' }}>
```

### 4. UIDESIGN.md 更新

新增兩個段落：

**Pill Tab 規範**：容器 `#EFEDE9` + `borderRadius 20` + `padding 3`；作用中按鈕 `#4A7C59` 底白字，非作用中透明底 `#2C2C2C` 字。已用於 Profile 和 Management。

**SidebarNav 規範**：頂部結構、導覽項目可見性規則（一般人 / 開發者）、品牌文字規格。

## 邊界說明

- 一般人直接打 URL `/management` → 現有「無存取權限」頁面維持不動
- `開發者設定`（`/agenda-settings`）：現有邏輯維持不動
- 本次不新增 tab 內容，只改樣式
