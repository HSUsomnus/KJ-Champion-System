# LINE LIFF 行事曆 - React 前端

React 版前端，與舊有 `public/` HTML 前端功能對應。

## 環境需求

- Node.js 18+
- npm

## 安裝與建置

```bash
# 安裝依賴
npm install

# 複製 logo（從專案根目錄執行）
# Windows PowerShell:
Copy-Item "..\public\images\logo.png" "public\images\logo.png"

# 建置
npm run build
```

若 `public/images/logo.png` 不存在，建置仍會成功，但 favicon 可能顯示為預設圖示。

## 開發

```bash
# 啟動 Vite 開發伺服器（預設 port 5173）
# 需同時啟動後端：在專案根目錄執行 npm start
npm run dev
```

開發模式會代理 `/api`、`/images` 到 `http://localhost:8080`。

## 開發模式（模擬 LINE）

網址加 `?dev=1` 可跳過真實 LIFF，使用模擬 LINE User ID 測試：

- 例如：`http://localhost:5173/?dev=1`

## 建置產物

- 輸出目錄：`dist/`
- 部署時由 Express 提供 `dist/` 作為靜態來源
