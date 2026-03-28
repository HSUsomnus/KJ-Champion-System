# Tasks: 04-react-vite-pwa-frontend

> ⬜ **待開始** — 前提：03-pencil-ui-design 設計稿確認鎖定

---

## Task 3. React + Vite + PWA 專案骨架

- [ ] 3.1 `staging` 分支執行 `npm create vite@latest frontend -- --template react-ts`
- [ ] 3.2 安裝依賴：`vite-plugin-pwa`、`workbox-window`
- [ ] 3.3 設定 `vite.config.ts`：plugin-react、vite-plugin-pwa、`/api/*` NetworkOnly 策略
- [ ] 3.4 設定 PWA manifest（name: KJ Champion、short_name: 康九冠軍夥伴系統、theme_color: #D4AF37）
- [ ] 3.5 建立 `frontend/public/_worker.js`（proxy `/api/*` 至 Zeabur）
- [ ] 3.6 建立 `frontend/public/_headers`（assets 長快取、html no-cache）
- [ ] 3.7 確認 `npm run build` 正常，`frontend/dist/` 產生含 `sw.js`

## Task 4. shadcn/ui 整合

- [ ] 4.1 `npx shadcn@latest init`（Tailwind CSS v3、CSS 變數模式）
- [ ] 4.2 調整 CSS 變數主色調（金色 `#D4AF37` → `--primary`）
- [ ] 4.3 加入初期元件：button、dialog、calendar、input、table、form
- [ ] 4.4 確認 `npm run build` 通過

## Task 5. 更新 Cloudflare Pages build 設定

- [ ] 5.1 在 `kj-champion-system` 專案更新 Build command（`cd frontend && npm install && npm run build`）與 output directory（`frontend/dist`）
- [ ] 5.2 commit & push `staging`，確認部署成功

## Task 6. 驗證 React staging 完整環境

- [ ] 6.1 訪問 Cloudflare Pages URL，確認 React 頁面載入
- [ ] 6.2 LINE Login 完整流程
- [ ] 6.3 行事曆 CRUD
- [ ] 6.4 PWA 安裝（手機加入主畫面）
- [ ] 6.5 Service Worker 離線功能
- [ ] 6.6 確認 `main` 分支 Vercel 正式環境不受影響
- [ ] 6.7 ✅ 全部通過 → archive 此 change，進入 05-production-cutover
