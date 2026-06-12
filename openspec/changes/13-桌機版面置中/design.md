# Design: 桌機版面置中（max-width 限寬）

## 現況分析

| 項目 | 現況 | 問題 |
|---|---|---|
| `#root`（index.css） | `flex-direction: column` + `min-height: 100svh`，無寬度 | 不限寬 |
| 各頁最外層 | `min-h-screen flex flex-col`（18 頁一致），無 `max-w` / `mx-auto` | 內容拉滿 |
| 共用 Layout | 無，App.jsx 直接渲染 `Outlet` | 無集中控制點 |
| `Header` | `fixed top-0 left-0 right-0`（滿寬） | 桌機滿寬，與置中欄錯位 |
| `FabNav` | `fixed; bottom:24; left:16`（視窗左下） | 桌機黏視窗角，遠離內容欄 |
| `FabAction` | `fixed; bottom:24; right:16`（視窗右下） | 同上 |
| `App.css` | Vite 範本殘留（`.hero`/`.vite`…），未使用 | 死碼 |

## 設計決策

### 決策 1：限寬值 = `max-w-md`（448px）

- 手機優先 PWA，置中欄寬度貼近大尺寸手機（~430px），維持「手機感」一致性
- 手機螢幕寬度（多在 360～430px）≤ 448px，套用後**手機完全不受影響**
- 若日後覺得太窄可調整為 `max-w-lg`（512px），集中一處改即可

### 決策 2：新增共用 `Layout.jsx`，而非改 18 頁或只改 #root

- 改每頁成本高、易漏；只改 `#root` 無法處理 `position: fixed` 的 Header / FAB 對齊
- 共用 Layout 提供**單一定位基準**：`<div class="mx-auto max-w-md relative min-h-screen">`，固定元素改為相對此容器對齊
- Login 與受保護頁都包進同一 Layout，全站一致

### 決策 3：固定元素以「置中欄邊界」為定位基準

置中欄左邊界 = `50% - 224px`（224 = 448/2）。固定元素水平定位改用 `max() + calc()`，確保手機（窄於欄寬）退回原本的 16px 邊距、桌機則貼齊欄邊：

```
/* 左下 FabNav */
left: max(16px, calc(50% - 224px + 16px));   /* = max(16px, calc(50% - 208px)) */

/* 右下 FabAction */
right: max(16px, calc(50% - 224px + 16px));
```

- 手機（W=375）：`calc(50% - 208px)` ≈ -20px → `max()` 取 16px，**與現況相同**
- 桌機（W=1440）：`calc(50% - 208px)` ≈ 512px → 貼齊置中欄左緣內 16px ✓

`Header` 由 `fixed left-0 right-0` 改為置中限寬：外層仍 `fixed top-0`，但內部包一層 `mx-auto max-w-md`，或改用 `sticky top-0` 置於 Layout 欄內。實作時以「視覺與目前一致、桌機對齊欄寬」為準。

### 決策 4：背景色處理

`#root` / `body` 維持米白底 `#F7F5F2` 滿版（兩側留白區也是米白），置中欄內容沿用既有底色。**不**在留白區加深色或分隔線，維持 Warm Minimal 乾淨感。

## 為什麼不用更簡單的方案

- **只在 `#root` 加 `max-width`**：能讓一般內容置中，但 `Header` / `FabNav` / `FabAction` 是 `position: fixed`，定位基準是視窗不是 `#root`，桌機上仍會跑到視窗角落與欄錯位。故必須額外處理固定元素 → 需要 Layout 作為基準。
- **把 FAB 改成 `position: absolute` 掛在 Layout 內**：會隨頁面捲動跟著跑，失去「固定懸浮」行為。故保留 `fixed`，改用 `max()+calc()` 對齊欄邊。

## 風險與回歸重點

- 手機回歸：限寬值 ≥ 手機寬，理論零影響；仍須在 dev 站手機實測確認 Header / FAB 位置、捲動行為無變化
- FAB `max()+calc()` 在不同視窗寬度的臨界點（剛好 448px 附近）需檢查不抖動
- BottomSheet / Dialog 等既有彈窗若也用 `fixed` 滿寬，需一併檢查是否要對齊欄寬（列入 tasks 檢查項）
