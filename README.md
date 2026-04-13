# 康九冠軍夥伴系統 — DEV 測試分支

> **分支：`dev`** | 基底版本：v2.0.4（與 `main` 同步）| 測試站：[kjcs-dev.pages.dev](https://kjcs-dev.pages.dev) | 更新：2026-04-13

此分支為 QA 測試環境，**已於 2026-04-13 格式化重置為 main**，歷史清空，重新累積功能分支合入。

---

## ⚠️ 此分支狀態

- 目前 HEAD 完全等於 `main`（v2.0.4）
- 尚未合入任何功能分支
- 所有功能分支保持獨立，待重新依序 merge 進來測試

---

## 測試站

- **網址**：[https://kjcs-dev.pages.dev](https://kjcs-dev.pages.dev)
- **後端**：`kj-champion-system-dev.zeabur.app`（DEV 專用）
- **路由**：`frontend/public/_worker.js` 內 `resolveBackend()` 依 hostname 判斷，`kjcs-dev.pages.dev` → DEV 後端

### 測試注意事項

- 每次合入新功能分支後，**清除 Service Worker**（DevTools → Application → Service Workers → Unregister）避免 PWA 快取干擾
- 清除 `localStorage` 後可測試未登入流程
- URL 帶 `?dev=1` 自動模擬 LINE 登入

---

## 功能分支總表

| 分支名稱 | 功能說明 | 狀態 | 對應 OpenSpec |
|---------|---------|------|--------------|
| `m_b_每日行程推播_backend` | 每日行程 LINE Bot 推播 — 後端 | ⬜ 待合入 | 07-daily-event-push |
| `m_b_每日行程推播_frontend` | 每日行程推播 — 前端設定頁 | ⬜ 待合入 | 07-daily-event-push |
| `m_b_eruda除錯工具` | React 前端整合 Eruda 手機除錯 | ⬜ 待合入 | — |
| `m_b_pwa_upgrade` | PWA 全平台升級（Android + iOS + Desktop 最新標準） | ⬜ 待合入 | 08-pwa-upgrade |
| `m_b_tag_database` | 標籤系統 — DB migration | ⬜ 待合入 | 09-tag-system |
| `m_b_tag_backend` | 標籤系統 — 後端 API | ⬜ 待合入 | 09-tag-system |
| `m_b_tag_frontend` | 標籤系統 — 前端 UI（TagBadge + TagSelector） | ⬜ 待合入 | 09-tag-system |

### ⚠️ 已知分支混亂

- `m_b_每日行程推播_backend` 內含前端改動（event row 卡片化、字卡修時區 bug）
- `m_b_每日行程推播_frontend` 內含後端相關的「開發者設定頁」
- 需在重新 merge 前釐清分支職責，或直接依 commit 內容拆分成新分支

---

## 合入流程

```bash
# 確保 dev 是最新
git checkout dev
git pull origin dev

# merge 功能分支（依狀態決定順序，database → backend → frontend）
git merge origin/m_b_功能名稱

# 推送觸發 Cloudflare Pages 部署
git push origin dev
```

---

## 本機開發

### 後端

```bash
npm install
npm run dev
# 後端啟動於 http://localhost:8080
```

### 前端

```bash
cd frontend
npm install
npm run dev
# 前端啟動於 http://localhost:5173（Vite dev server）
```

---

## 專案結構

與 `main` 相同，詳見 `main` 分支的 README.md。

---

## 版本記錄

詳見 [CHANGELOG.md](./CHANGELOG.md)。
