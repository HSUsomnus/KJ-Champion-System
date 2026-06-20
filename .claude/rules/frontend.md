# Frontend Rules — 觸碰 frontend/* 時注入

## 當前前端目錄

`frontend/`（React 19 + Vite 8 + Tailwind CSS 4 + PWA）— v2.0.0 起，`public/` HTML 版已刪除，禁止復用。

## 目錄結構

```
frontend/
├── public/
│   └── _worker.js        # Cloudflare Worker（API 路由 + dev/prod 分流）
├── src/
│   ├── App.jsx            # React Router 主入口 + ProtectedRoute
│   ├── main.jsx
│   ├── pages/             # 15 個頁面元件
│   ├── components/        # Header / FabNav / FabAction / ConfirmLeaveDialog
│   ├── contexts/          # AuthContext
│   ├── services/          # api.js（API 呼叫層）
│   └── utils/             # shareEvent.js
└── vite.config.js
```

## 本機開發

```bash
npm --prefix frontend run dev       # 啟動 Vite dev server
npm --prefix frontend run build     # 打包
```

開發模式測試：URL 帶 `?dev=1` 自動模擬登入，不需真實 LINE OAuth。

## 修改前確認

1. 確認當前分支（`git branch --show-current`）
2. **在 main 分支**：強烈警告，修改直接影響正式上線用戶，應切功能分支

## 測試指令

```bash
npm --prefix frontend run test:run   # vitest 全部（約 3 秒）
npm --prefix frontend run test:e2e   # playwright e2e
```

測試前若有 Service Worker 問題：DevTools → Application → Service Workers → Unregister

## 登入機制

- 正式登入：LINE OAuth 2.0（不依賴 LIFF SDK，`server/routes/auth.js` 處理 callback）
- 本機測試：URL 帶 `?dev=1`
- 核心：`frontend/src/contexts/AuthContext.jsx`

## 分享機制

- 手機：LINE URL Scheme（`https://line.me/R/share?text=...`）
- 電腦：Web Share API 或複製到剪貼簿
- 實作：`frontend/src/utils/shareEvent.js`

## UI 規範

動任何 UI 元件前讀 `UIDESIGN.md`（Warm Minimal 風格，米白 #F7F5F2 + 墨綠 #4A7C59）。
