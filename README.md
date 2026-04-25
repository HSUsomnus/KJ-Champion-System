# 康九冠軍夥伴系統 — DEV 測試分支

> **分支：`dev`** | 基底版本：v2.0.7（與 `main` 同步）| 測試站：[kjcs-dev.pages.dev](https://kjcs-dev.pages.dev) | 更新：2026-04-25

此分支為 QA 測試環境，**已於 2026-04-13 格式化重置為 main**，歷史清空，重新累積功能分支合入。

---

## ⚠️ 此分支狀態

- 基底等於 `main`（v2.0.7）
- **已合入**：
  - `m_b_每日行程推播_backend`（2026-04-14，待測試）
  - `m_b_zeabur_projects_split`（2026-04-25，OpenSpec change 10 — Zeabur 專案分離，dev 後端 URL 已切換至 `kj-champion-dev.zeabur.app`）
  - hotfix v2.0.5（2026-04-25，Login.jsx 首次登入「建立資料」死循環修復，從 main 同步進來）
  - hotfix v2.0.6（2026-04-25，Login.jsx useEffect 與 handleConfirm 的 navigate race condition 修復，接續 v2.0.5）
  - hotfix v2.0.7（2026-04-25，新用戶 onboarding 強制流程修補：用戶資料 4 欄全必填 + 用戶數據課程紀錄 ≥ 1 筆 + ProtectedRoute guard）
- 其他功能分支待依序 merge

---

## 測試站

- **網址**：[https://kjcs-dev.pages.dev](https://kjcs-dev.pages.dev)
- **後端**：`kj-champion-dev.zeabur.app`（DEV 專用，2026-04-25 起搬到獨立 Zeabur 專案 `kj-champion-dev`，舊 `kj-champion-system-dev.zeabur.app` 將於 OpenSpec 10.11 砍除）
- **資料庫**：dev 後端連 `postgresql.zeabur.internal`（位於 `kj-champion-dev` 專案內，與 prod DB 物理隔離）
- **路由**：`frontend/public/_worker.js` 內 `resolveBackend()` 依 hostname 判斷，`kjcs-dev.pages.dev` → DEV 後端

### 測試注意事項

- 每次合入新功能分支後，**清除 Service Worker**（DevTools → Application → Service Workers → Unregister）避免 PWA 快取干擾
- 清除 `localStorage` 後可測試未登入流程
- URL 帶 `?dev=1` 自動模擬 LINE 登入

---

## 功能分支總表

| 分支名稱 | 功能說明 | 狀態 | 對應 OpenSpec |
|---------|---------|------|--------------|
| `m_b_每日行程推播_backend` | 每日行程 LINE Bot 推播 — 後端（含 cron 排程 + system_settings 自動 migration） | ✅ 已合入（2026-04-14，待 Zeabur DEV 部署驗證） | 09-每日行程推播 |
| `m_b_每日行程推播_frontend` | 每日行程推播 — 前端設定頁（含 Eruda toggle） | ⬜ 待合入（等後端驗證通過） | 09-每日行程推播 |
| `m_b_eruda除錯工具` | React 前端整合 Eruda 手機除錯 | ⚠️ 建議廢棄（功能已被 `推播_frontend` 的 `42a843b` 吸收並擴充） | — |
| `m_b_pwa_upgrade` | PWA 全平台升級（Android + iOS + Desktop 最新標準） | ⬜ 待合入 | 08-pwa-upgrade |
| `m_b_tag_database` | 標籤系統 — DB migration | ⬜ 待合入 | ❓ 無 OpenSpec change（需補） |
| `m_b_tag_backend` | 標籤系統 — 後端 API | ⬜ 待合入 | ❓ 無 OpenSpec change（需補） |
| `m_b_tag_frontend` | 標籤系統 — 前端 UI（TagBadge + TagSelector） | ⬜ 待合入 | ❓ 無 OpenSpec change（需補） |

### 分支補充說明（2026-04-14 盤點）

- **推播 backend/frontend 分支內容**：之前誤判為「commit 內容對調」，實際驗證後**沒有對調**。backend 分支純 `server/`，frontend 分支純 `frontend/`，commit message 因語境造成誤解（「event row 卡片化」指的是 LINE Bot Flex Message 的卡片樣式，是後端改動）
- **`m_b_eruda除錯工具` 建議廢棄**：其 `4e39f65` 的 Eruda 載入機制（僅 URL `?eruda=1`）已被 `m_b_每日行程推播_frontend` 的 `42a843b` 整個取代為超集版本（URL 參數 + localStorage toggle + try/catch 保護）。若 merge 此分支會在 `frontend/index.html` 衝突
- **標籤系統缺 OpenSpec change**：三個 `m_b_tag_*` 分支未建立對應 OpenSpec 目錄，違反「新增功能 = 開 OpenSpec change」規則，需在 merge 前補齊（建議編號 `10-tag-system`）

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
