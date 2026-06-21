# Design: 桌機版面置中（max-width 限寬，全站一致化）

## 方案取捨（2026-06 重新探討結論）

| 方案 | 做法 | 成本 | 結論 |
|---|---|---|---|
| **A. 窄欄置中** | `max-w-md` 置中 + 兩側留白，維持手機優先單欄 | 低 | ✅ **採用** |
| B. 響應式桌機版 | 桌機改多欄 / 寬版內容 | 高 | ❌ 不採用（桌機偶爾用，投報率低）|
| C. 維持現狀 | 不處理 | 0 | ❌ 拉滿且各頁不一致 |

採 A 的理由：使用以手機為主、桌機偶爾。且「正確樣式」已存在（`AgendaSettings` 的 `max-w-md mx-auto`），只需全站一致化，成本極低。若未來桌機升為主要情境，再另開 change 走 B。

## 現況分析（v2.7.0，change 14 後）

| 項目 | 現況 | 處置 |
|---|---|---|
| `Layout.jsx` | 已存在，僅 `<SidebarNav/><Outlet/>`，無限寬 | **改它**：`<Outlet/>` 外包 `max-w-md mx-auto` |
| 多數頁面外層 | `min-h-screen flex flex-col`，無 max-w（拉滿） | 由 Layout 統一置中，頁面不需各自處理 |
| `AgendaSettings.jsx` 等 | 自帶 `max-w-md mx-auto`（即期望樣式） | **移除 ad-hoc 限寬**，避免雙重包裹 |
| `FabAction.jsx` | 幾乎每頁都用，`fixed; bottom:24; right:16`（視窗右下） | **改右側定位**對齊置中欄右緣 |
| `SidebarNav.jsx` | 覆蓋式抽屜，漢堡鈕 `fixed top:16 left:16`，滑入不推內容 | **不動**（抽屜行為維持）|
| `Login` | 不在 Layout 下（`App.jsx` 獨立路由） | 一併套用相同置中 |
| `Header.jsx` / `FabNav.jsx` | **已被 change 14 刪除** | 不存在，無需處理 |

## 設計決策

### 決策 1：限寬值 = `max-w-md`（448px）

沿用 `AgendaSettings` 既有值，使用者已確認該頁置中樣式即為期望樣式。手機螢幕寬（360～430px）≤ 448px，套用後手機零回歸。

### 決策 2：置中限寬集中於 `Layout.jsx`

```jsx
export default function Layout() {
  return (
    <>
      <SidebarNav />
      <div className="max-w-md mx-auto">
        <Outlet />
      </div>
    </>
  )
}
```

- 一處套用全站受保護頁，取代各頁 ad-hoc 寫法
- 頁面外層 `min-h-screen` 沿用；body 與留白區同為 `#F7F5F2` 米白底，置中欄兩側自然留白
- `SidebarNav` 在容器外（仍 `fixed` 對齊視窗），抽屜與漢堡鈕行為不受置中影響

### 決策 3：`FabAction` 對齊置中欄右緣

置中欄右緣 = `50% + 224px`（224 = 448/2）。FAB 距欄右緣內 16px：

```
right: max(16px, calc(50% - 224px + 16px));   /* = max(16px, calc(50% - 208px)) */
```

- 手機（W=375）：`calc(50% - 208px)` ≈ -20px → `max()` 取 16px，**與現況相同**
- 桌機（W=1440）：≈ 512px → 貼齊置中欄右緣內 16px ✓

改 `FabAction.jsx` 單一元件即全頁套用。

### 決策 4：`SidebarNav` 漢堡鈕維持視窗左上角

漢堡鈕是選單觸發器，置於螢幕角落為慣例，**不需**對齊置中欄。維持 `fixed top:16 left:16` 不動，降低改動面與回歸風險。

### 決策 5：Login 頁

`Login` 在 `App.jsx` 為獨立路由（不經 Layout）。為一致性，於 Login 外層套相同 `max-w-md mx-auto`（或共用一個輕量置中容器）。

## 為什麼不用更簡單的方案

- **只在 `#root`/`body` 加 max-width**：無法處理 `FabAction` 的 `position: fixed`（基準是視窗非 `#root`），桌機 FAB 仍跑到視窗角落。故置中容器需與 FAB 定位一起調整。
- **把 FAB 改 `position: absolute` 掛進置中容器**：會隨頁面捲動跟跑，失去固定懸浮行為。故保留 `fixed`，改 `max()+calc()` 對齊欄邊。

## 風險與回歸重點

- 手機回歸：限寬值 ≥ 手機寬，理論零影響；仍須 dev 站手機實測 FAB 位置、抽屜、捲動無變化
- FAB `max()+calc()` 在視窗寬 ≈ 448px 臨界點不可抖動
- 移除各頁 ad-hoc `max-w-md` 後，須確認原本依賴它的頁面（AgendaSettings）外觀不變
- 既有 `fixed` 滿寬彈窗（BottomSheet / ConfirmLeaveDialog / FinancialEdit 的 `max-w-md` bottom sheet）需檢查是否要對齊欄寬
