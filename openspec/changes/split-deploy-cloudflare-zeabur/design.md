# Design: split-deploy-cloudflare-zeabur

## Context

專案目前架構：Express.js 後端 + 純 HTML/JS 前端（`public/`）同部署在 Vercel、資料庫使用 Supabase，系統已上線運作中。

`staging` 分支將引入全新的 React + Vite 前端（`frontend/`），並部署至 Cloudflare Pages，後端同步遷移至 Zeabur。`main` 分支維持現有 Vercel 部署完全不動。

`server/server.js` 已有 CORS middleware，透過 `FRONTEND_URL` 環境變數控制白名單，**後端程式碼無需修改**。

## Goals / Non-Goals

**Goals:**

- 建立 `staging` 分支作為新技術棧的測試環境
- 正式環境（`main` + Vercel）完全不受影響
- 新前端使用 React + Vite + PWA，支援離線快取與可安裝（Add to Home Screen）
- 前端 API 呼叫透過 `_redirects` proxy 解決跨網域，不硬編碼後端 URL
- 所有 secrets 不進 git，由各平台控制台管理

**Non-Goals:**

- 不遷移資料庫（Supabase 維持現狀）
- 不修改後端任何業務邏輯或 API
- 不拆分 GitHub 倉庫
- 本次不切換正式環境（第二、三階段才做，後端先切、前端後切）

## Decisions

### Decision 1：雙分支環境隔離，正式環境零風險

**選擇**：建立 `staging` 分支，各平台分別監聽自己的分支。

```text
main    →  Vercel 前端 (public/) + Vercel 後端（正式，現有不動）
staging →  Cloudflare Pages (frontend/dist) + Zeabur（測試新平台）
```

**理由**：專案已上線，`staging` 分支失敗不影響正式服務，成功後再合併。

### Decision 2：React + Vite + TypeScript 作為新前端技術棧

**選擇**：`frontend/` 目錄使用 React 18 + Vite + TypeScript，並整合 `vite-plugin-pwa`。

**理由**：

- 原 `public/` 純 HTML/JS 難以維護，缺乏型別安全
- Vite 建置速度快，Cloudflare Pages 對 Vite 有原生支援
- React 生態成熟，方便後續擴充
- `frontend/` 目錄名稱與現有 repo 結構一致（原本就預留了此位置）

**關鍵依賴**：

```json
{
  "dependencies": { "react": "^18", "react-dom": "^18" },
  "devDependencies": {
    "vite": "^5",
    "@vitejs/plugin-react": "^4",
    "vite-plugin-pwa": "^0.20",
    "typescript": "^5",
    "workbox-window": "^7",
    "tailwindcss": "^3",
    "class-variance-authority": "^0.7",
    "clsx": "^2",
    "tailwind-merge": "^2",
    "lucide-react": "^0.400"
  }
}
```

### Decision 2b：UI 元件庫使用 shadcn/ui

**選擇**：在 React + Vite 環境整合 shadcn/ui（基於 Radix UI + Tailwind CSS），作為主要 UI 元件來源。

**理由**：

- 元件直接複製進 `src/components/ui/`，不是 npm 套件，完全可自訂、不受版本升級影響
- 基於 Radix UI，內建無障礙支援（ARIA、鍵盤導航）
- Tailwind CSS 樣式系統，透過 CSS 變數統一管理 light/dark mode
- 現有 `public/` 的自製元件均有對應：

| 現有元件 | shadcn/ui 對應 |
| --- | --- |
| `datePicker.js` | `Calendar` + `Popover` |
| `timePicker.js` | `Input`（time type） |
| `share-dialog.js` | `Dialog` |
| 管理後台表格 | `Table` |
| 財務上傳表單 | `Form` + `Input` |

**替代方案：**

- ❌ MUI / Ant Design：套件綁定，客製化成本高，bundle size 大
- ❌ 自己寫 CSS：重複 `public/` 的路，缺乏無障礙支援

### Decision 3：PWA 使用 `vite-plugin-pwa` + Workbox

**選擇**：`vite-plugin-pwa` 自動產生 Service Worker（Workbox GenerateSW 策略），`manifest.webmanifest` 由插件管理。

**PWA 快取策略**：

- HTML：Network First（確保最新內容）
- JS/CSS/圖片：Cache First，版本化（Vite hash filename）
- API (`/api/*`)：Network Only（不快取 API 回應）

**理由**：Workbox GenerateSW 設定最少，適合初期。Service Worker 的 API 路由排除設定可避免快取到動態資料。

### Decision 4：用 Cloudflare `_redirects` 做 API Proxy

**選擇**：`frontend/public/_redirects`（Vite build 時會複製到 `dist/`）設定 `/api/*` → Zeabur 後端 proxy。

```text
/api/*  https://<zeabur-backend-url>/api/:splat  200
```

**理由**：新前端的 API 呼叫仍使用相對路徑 `/api/...`，`_redirects` 在平台層透明轉發，前端程式碼無需感知後端 URL。

### Decision 5：CORS 只需設環境變數

**選擇**：`server.js` CORS 已有 `FRONTEND_URL` 支援，在 Zeabur 設定 `FRONTEND_URL=https://<project>.pages.dev` 即可，無需改程式碼。

### Decision 6：Cloudflare Pages build 設定

```text
Build command:     cd frontend && npm install && npm run build
Build output dir:  frontend/dist
Root directory:    /（repo 根目錄）
Branch:            staging
```

**理由**：monorepo 結構下，Cloudflare Pages 需要 cd 進入 `frontend/` 執行 build，輸出目錄同樣需指定完整路徑。

### Decision 7：`zbpack.json` 放在 repo 根目錄（`staging` 分支）

**選擇**：根目錄的 `zbpack.json` 明確指定 Node.js 版本與啟動指令，避免 Zeabur 誤判 monorepo 結構。

```json
{
  "nodejs_version": "18",
  "start_command": "node server/server.js"
}
```

## Risks / Trade-offs

| 風險 | 說明 | 緩解方式 |
| --- | --- | --- |
| React 前端重寫工作量 | 原 `public/` 頁面需逐一移植到 React | 先建立基礎架構，功能頁面可分批移植 |
| `staging` 與 `main` 分支分歧 | 長期維護兩個分支可能出現 merge 衝突 | `staging` 定期從 `main` rebase |
| PWA Service Worker 快取舊版 | SW 更新不及時導致用戶看到舊畫面 | 設定 `registerType: 'autoUpdate'`，新版本自動接管 |
| `_redirects` proxy 延遲 | Cloudflare → Zeabur 多一層跳轉 | 兩者皆為全球節點，延遲通常 < 50ms |
| Zeabur 冷啟動 | 免費方案可能有冷啟動延遲 | 升級方案或接受首次請求較慢 |
| LINE OAuth 回調 URL | LINE Developer Console 需新增 Zeabur 網域 | 部署後在 LINE Console 手動新增 |

## Migration Plan

### 第一階段：建立 staging 測試環境

1. 從 `main` checkout `staging` 分支，新增 `zbpack.json`、`frontend/`（Vite 骨架）、`frontend/public/_redirects`（佔位符）
2. Zeabur 連接 `staging` 分支 → 部署後端 → 取得後端 URL → 填入 `_redirects`
3. Cloudflare Pages 連接 `staging` 分支 → 部署前端 → 取得前端 URL
4. Zeabur 設 `FRONTEND_URL` = Cloudflare Pages URL
5. 完整驗證：LINE Login、行事曆 CRUD、PWA 安裝

### 第二階段：正式後端切換至 Zeabur（前端不動）

**前提**：`staging` 後端通過所有驗證

1. 在 Zeabur 為正式環境建立獨立服務（監聽 `main` 分支）
2. 設定正式環境變數（`FRONTEND_URL` = 現有 Vercel 前端 URL）
3. LINE Developer Console 正式 Callback URL 指向新 Zeabur 網域
4. 將正式前端（Vercel / `public/`）的 API 呼叫切換至新 Zeabur 後端
5. 觀察穩定性，確認無誤
6. 停用 Vercel 後端服務

### 第三階段：正式前端切換至 Cloudflare Pages（後端已在 Zeabur）

**前提**：`staging` 前端通過所有功能驗證

1. 在 Cloudflare Pages 為正式環境建立獨立專案（監聽 `main` 分支）
2. 更新 `main` 分支的 `frontend/public/_redirects`，指向第二階段的正式 Zeabur 後端
3. 正式網域（DNS）切換至 Cloudflare Pages
4. 觀察穩定性，確認無誤
5. 停用 Vercel 前端服務，Vercel 完全退場

### Rollback 策略

| 階段 | 失敗情境 | 回退方式 |
| --- | --- | --- |
| 第一階段 | staging 環境異常 | 刪除 Cloudflare / Zeabur staging 服務，`main` 完全不受影響 |
| 第二階段 | 正式後端切換後異常 | Vercel 後端仍在，前端 API URL 切回 Vercel，5 分鐘內可回退 |
| 第三階段 | 正式前端切換後異常 | DNS 切回 Vercel 前端（Vercel 保留至此階段確認完畢再退場） |

## Open Questions

- `staging` 是否與正式環境共用同一個 Supabase？（建議先共用，降低複雜度）
- LINE Login OAuth 回調 URL 需在 LINE Developer Console 新增 Zeabur 網域
- PWA `manifest` 的 `name`、`short_name`、`theme_color` 由使用者確認
- `frontend/` 頁面移植優先順序？（建議先做登入、月曆主頁，其餘分批）
