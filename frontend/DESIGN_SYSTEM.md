# KJ Champion System — Design System

> 此文件為前端 UI 設計基準。所有新頁面、新元件必須遵循此規範，確保整體風格統一。
> 最後更新：2026-04-01

---

## 風格定義

**風格名稱：Warm Minimal（暖調極簡）**

靈感來源於無印良品（MUJI）的設計哲學——去除裝飾性元素，讓功能本身說話。
以米白、暖灰為基底，搭配深炭灰與墨綠作為強調，整體傳遞出「安靜、可信賴、清晰」的視覺感受。

**核心原則：**
- 留白優先，不做多餘裝飾
- 圓形元素為主視覺語言（按鈕、頭像、FAB、快捷入口）
- 資訊層級清晰，重要內容突出，次要內容退場
- 互動有回饋（scale 縮放、opacity 過渡），但不誇張

---

## 色彩系統

### 基礎色板

| 名稱 | 色碼 | 用途 |
|------|------|------|
| `bg` | `#F7F5F2` | 頁面主背景（米白） |
| `surface` | `#FFFFFF` | 卡片、彈窗、輸入框背景 |
| `surface-2` | `#EFEDE9` | 次層背景、按鈕 hover 狀態、Header 背景 |
| `border` | `#E2DED8` | 所有邊框、分隔線 |
| `text-primary` | `#2C2C2C` | 主要文字（深炭灰） |
| `text-muted` | `#8A8680` | 次要文字、placeholder、標籤（暖灰） |

### 強調色

| 名稱 | 色碼 | 用途 |
|------|------|------|
| `accent` | `#4A7C59` | 強調色（墨綠）：頭像佔位、SVG icon 色、確認類按鈕 |
| `accent-light` | `#E8F0EB` | 強調色淺版：提示訊息背景、tag 背景 |
| `fab-nav` | `#2C2C2C` | 左下 FAB 主按鈕（深炭灰） |
| `fab-action` | `#4A7C59` | 右下 FAB 主按鈕（墨綠） |
| `line-green` | `#06C755` | 僅用於 LINE 登入按鈕，不擴展到其他元件 |

### 色彩使用規則

- **禁止**使用純黑 `#000000`，用 `#2C2C2C` 替代
- **禁止**使用純白 `#FFFFFF` 作為頁面背景，用 `#F7F5F2`
- 新增強調色前先確認是否能用現有色板表達
- 不使用漸層（gradient），維持平面扁平風格

---

## 排版系統

### 字體

```
system-ui, -apple-system, 'Microsoft JhengHei', '微軟正黑體', sans-serif
```

手機優先，不引入外部字體，使用系統字體確保載入速度。

### 字級規範

| 用途 | 大小 | 字重 | 顏色 |
|------|------|------|------|
| 頁面標題 | 20px | 600 | `text-primary` |
| 區塊標題 | 14px | 600 | `text-muted`（加大寫間距 `0.06em`） |
| 卡片主文字 | 14px | 500 | `text-primary` |
| 輔助說明文字 | 12px | 400 | `text-muted` |
| 標籤 / badge | 12px | 500 | 依情境 |
| 按鈕文字 | 14–16px | 600 | 依按鈕類型 |

---

## 圓形元素規範（主視覺）

圓形是此設計系統的核心視覺語言，出現在以下元件：

| 元件 | 尺寸 | 說明 |
|------|------|------|
| FAB 主按鈕 | 56×56px | 固定在左下 / 右下角 |
| FAB 子項按鈕 | 44×44px | 展開時從主按鈕往上疊出 |
| 快捷入口圓形 | 56×56px | 主頁 4 個功能快捷 |
| 用戶頭像（Header） | 28×28px | Header 右上角 |
| 用戶頭像（主頁歡迎） | 56×56px | 主頁歡迎區塊 |
| 重新整理按鈕 | 32×32px | Header 左側 Logo 旁 |
| 頭像佔位符 | 繼承父層 | 無圖片時顯示名字首字，背景 `accent` |

**圓形元素共用樣式：**
```css
border-radius: 50%;
display: flex;
align-items: center;
justify-content: center;
```

---

## 卡片元件

```css
background: #FFFFFF;
border: 1px solid #E2DED8;
border-radius: 16px;        /* rounded-2xl */
padding: 16px;
box-shadow: 0 2px 8px rgba(0,0,0,0.06);
```

- 卡片內不再加陰影或邊框裝飾
- 卡片標題 14px/500，內文 12px/400/`text-muted`

---

## 按鈕規範

### 主要按鈕（確認操作）
```css
background: #2C2C2C;
color: #FFFFFF;
border-radius: 16px;        /* rounded-2xl */
padding: 14px 24px;
font-size: 16px;
font-weight: 600;
```

### LINE 登入按鈕（僅登入頁使用）
```css
background: #06C755;
color: #FFFFFF;
border-radius: 16px;
```

### 次要按鈕 / 圓形功能按鈕
```css
background: #FFFFFF;
border: 1.5px solid #E2DED8;
border-radius: 50%;
color: #4A7C59;             /* icon 使用 accent 色 */
```

### 互動狀態
- hover（桌面）：`background` 加深一階（`surface` → `surface-2`）
- active（手機點擊）：`transform: scale(0.93–0.95)`，transition 0.1s
- 禁用：`opacity: 0.4`，`pointer-events: none`

---

## Header 規範（每頁共用）

```
高度：56px（fixed top）
背景：rgba(247,245,242,0.92) + backdrop-filter: blur(12px)
底部邊框：1px solid #E2DED8
```

**左側（必填）：**
- 康九 Logo（`h-8`，`/康九_logo.png`）
- 重新整理圓形按鈕（32px，`surface-2` 背景）

**右側（依登入狀態）：**
- 已登入：用戶頭像圓形（28px）+ 真實姓名（14px/500，最寬 80px 截斷）
- 未登入：用戶 icon 圓形（32px，`surface-2` 背景）

---

## FAB 規範

### 左下角 FAB（導航）
- 主按鈕：56px，背景 `#2C2C2C`，白色漢堡 / X icon
- 子項按鈕：44px，白色圓形 + `accent` 色 SVG icon
- 展開方向：往上，間距 10px
- 動畫：`opacity + translateY`，stagger delay 40ms

### 右下角 FAB（操作）
- 主按鈕：56px，背景 `#4A7C59`，白色 + icon
- 子項按鈕：同左下，右對齊
- label 位置：icon 左側（右 FAB），icon 右側（左 FAB）

### 共用規則
- 兩個 FAB 使用 React Portal 渲染到 `document.body`（避免 stacking context 問題）
- 固定位置：`bottom: 24px`，左右各 `16px`
- 展開時背景遮罩：`rgba(44,44,44,0.15)`，點擊收合

---

## SVG Icon 規範

- 全部使用 inline SVG，不使用 emoji、圖片 icon、icon font
- 統一規格：`width/height 20px`（FAB 子項）、`22px`（快捷入口）
- 筆畫：`stroke`，`strokeWidth: 1.8`，`strokeLinecap: round`，`strokeLinejoin: round`
- 顏色：`currentColor`（由父層 `color` 控制）
- 不使用 `fill`（保持線條風格）

---

## 間距系統

使用 4px 為基本單位：

| 值 | px | 用途 |
|----|-----|------|
| 1 | 4px | 極小間距 |
| 2 | 8px | 元件內小間距 |
| 3 | 12px | 元件間距 |
| 4 | 16px | 頁面邊距、卡片間距 |
| 6 | 24px | 區塊間距 |
| 8 | 32px | 大區塊間距 |

頁面左右邊距：`16px`
卡片之間間距：`12px`
區塊標題與內容間距：`12px`

---

## 頁面布局規範

```
┌────────────────────────────┐
│  Header（fixed，56px）      │
├────────────────────────────┤
│                            │
│  main（pt-16，pb-28）       │  ← 避開 header + FAB 空間
│  px-4（16px 邊距）          │
│                            │
└────────────────────────────┘
  [FAB 左下]        [FAB 右下]   ← Portal，fixed
```

- `min-height: 100svh`（支援手機動態工具列）
- `overscroll-behavior: none`（避免 bounce 效果）
- 主內容 `pb-28`（112px）確保不被 FAB 遮住

---

## 動畫規範

| 情境 | 屬性 | 時長 | Easing |
|------|------|------|--------|
| FAB 展開子項 | opacity + translateY | 0.2s | ease |
| FAB icon 旋轉 | transform rotate | 0.25s | ease |
| 按鈕點擊回饋 | scale | 0.1s | ease |
| Header 模糊背景 | — | 即時 | — |

- 不使用 bounce、spring 等誇張動畫
- 動畫時長不超過 300ms

---

## 響應式適配

預設以 375px（iPhone SE）為基準設計，向上兼容：

| 裝置 | 寬度 | 備註 |
|------|------|------|
| iPhone SE | 375px | 基準設計 |
| Samsung Galaxy S23 | 360px | 最小寬度 |
| iPhone 14 Pro | 393px | 主流 |
| iPhone 14 Plus/Max | 430px | 寬版 |

- 不需要桌面版 breakpoint（應用場景為手機）
- 圓形元素尺寸固定，不隨螢幕縮放

---

## 禁止事項

- 禁止使用 emoji 作為 icon
- 禁止使用漸層（linear-gradient、radial-gradient）
- 禁止使用 `border-radius` 小於 8px（方形感太強）
- 禁止使用純黑文字 `#000000`
- 禁止引入外部 icon library（Heroicons、FontAwesome 等）
- 禁止在 Header 加入除 Logo + 重整 + 用戶 以外的元素

---

*此文件由 Claude Code 根據目前實作自動生成，如設計方向調整請同步更新此文件。*
