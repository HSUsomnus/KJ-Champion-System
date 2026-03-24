# Spec: react-vite-pwa-frontend

## ADDED Requirements

### Requirement: Vite + React 專案結構

`frontend/` 目錄 SHALL 是一個完整的 Vite + React 18 + TypeScript 專案，包含 `package.json`、`vite.config.ts`、`tsconfig.json`、`index.html`、`src/` 目錄。

#### Scenario: 本地開發伺服器啟動

- **WHEN** 執行 `cd frontend && npm run dev`
- **THEN** Vite dev server 在 `http://localhost:5173` 啟動，支援 HMR

#### Scenario: Production build 成功

- **WHEN** 執行 `cd frontend && npm run build`
- **THEN** `frontend/dist/` 目錄產生，包含 `index.html`、`assets/`（JS/CSS hash 命名）、`sw.js`（Service Worker）、`manifest.webmanifest`

### Requirement: PWA Service Worker

`vite.config.ts` SHALL 整合 `vite-plugin-pwa`，使用 Workbox GenerateSW 策略自動產生 Service Worker，並設定 `registerType: 'autoUpdate'`。

#### Scenario: 應用程式可安裝（Add to Home Screen）

- **WHEN** 使用者在手機瀏覽器訪問應用程式
- **THEN** 瀏覽器顯示「加入主畫面」提示，安裝後以獨立視窗開啟

#### Scenario: Service Worker 自動更新

- **WHEN** 新版本部署後，使用者重新開啟應用程式
- **THEN** Service Worker 自動更新並接管，使用者無需手動重整

#### Scenario: API 請求不被 Service Worker 快取

- **WHEN** 應用程式發送 `/api/*` 請求
- **THEN** Service Worker 使用 Network Only 策略，不快取 API 回應，確保資料即時性

### Requirement: Web App Manifest

`vite-plugin-pwa` SHALL 產生 `manifest.webmanifest`，包含應用程式名稱、圖示、顯示模式（`standalone`）、主題色。

#### Scenario: Manifest 正確載入

- **WHEN** 瀏覽器解析應用程式頁面
- **THEN** `<link rel="manifest">` 指向有效的 `manifest.webmanifest`，包含必要欄位（`name`、`short_name`、`icons`、`display`、`theme_color`）

### Requirement: shadcn/ui 元件庫整合

`frontend/` SHALL 整合 shadcn/ui（基於 Radix UI + Tailwind CSS），作為主要 UI 元件來源。元件以 CLI 複製方式加入 `src/components/ui/`，不透過 npm 套件安裝。

#### Scenario: shadcn/ui 初始化成功

- **WHEN** 在 `frontend/` 執行 `npx shadcn@latest init`
- **THEN** `tailwind.config.ts`、`globals.css`（含 CSS 變數）、`src/lib/utils.ts` 正確產生

#### Scenario: 元件按需加入

- **WHEN** 執行 `npx shadcn@latest add button`
- **THEN** `src/components/ui/button.tsx` 建立，無需安裝額外 npm 套件

#### Scenario: 主題色套用

- **WHEN** 使用者開啟任何頁面
- **THEN** 元件顯示使用 `globals.css` 中定義的 CSS 變數（`--primary`、`--background` 等），風格與現有 LINE 行事曆設計語言一致

### Requirement: LINE Login 相容性

新 React 前端 SHALL 支援現有的 LINE Login OAuth 流程，透過 `public/js/liff.js` 的 `window.LIFF` 介面或等效實作完成身份驗證。

#### Scenario: LINE Login 導向正常

- **WHEN** 未登入使用者訪問需要驗證的頁面
- **THEN** 應用程式導向 `/api/auth/line-login`，完成 OAuth 後回調並取得使用者資訊

#### Scenario: 開發模式模擬登入

- **WHEN** URL 包含 `?dev=1` 參數
- **THEN** 應用程式使用模擬 LINE ID 跳過 OAuth，直接進入主頁面
