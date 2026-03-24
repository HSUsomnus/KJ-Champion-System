# Design: 04-react-vite-pwa-frontend

> ⬜ 待開始，細節在執行時補充

## Decision 2：React + Vite + TypeScript 技術棧

**選擇**：`frontend/` 目錄使用 React 18 + Vite + TypeScript。

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

**理由**：原 `public/` 純 HTML/JS 難維護、缺型別安全；Vite 速度快，Cloudflare Pages 有原生支援。

## Decision 2b：UI 元件庫使用 shadcn/ui

**選擇**：整合 shadcn/ui（Radix UI + Tailwind CSS），元件直接複製進 `src/components/ui/`。

**現有元件對應**：

| 現有元件 | shadcn/ui 對應 |
| --- | --- |
| `datePicker.js` | `Calendar` + `Popover` |
| `timePicker.js` | `Input`（time type） |
| `share-dialog.js` | `Dialog` |
| 管理後台表格 | `Table` |
| 財務上傳表單 | `Form` + `Input` |

## Decision 3：PWA 快取策略

**選擇**：`vite-plugin-pwa` + Workbox GenerateSW。

| 資源類型 | 策略 |
| --- | --- |
| HTML | Network First |
| JS/CSS/圖片（Vite hash） | Cache First（長快取） |
| `/api/*` | Network Only（不快取） |

`registerType: 'autoUpdate'`，新版本自動接管。

## Decision 6（更新）：Cloudflare Pages build 設定（React 版）

```
Build command:     cd frontend && npm install && npm run build
Build output dir:  frontend/dist
Root directory:    /（repo 根目錄）
Branch:            staging
```

> 此設定在 Task 5 時更新，取代 02-cloudflare-pages-validate 的無 build command 設定。
