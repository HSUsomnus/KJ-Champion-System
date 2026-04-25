# 康九冠軍夥伴系統 — DEV 測試分支

> **版本 v2.2.1** | 分支：`main` | 部署：[kj-champion-system.pages.dev](https://kj-champion-system.pages.dev) | 更新：2026-04-25

此分支為 QA 測試環境，**已於 2026-04-13 格式化重置為 main**，歷史清空，重新累積功能分支合入。

---

## ⚠️ 此分支狀態

- 基底等於 `main`（**v2.2.0 — 每日行程推播後端已上線**）
- **已合入 main 的內容**：
  - OpenSpec change 10 — Zeabur 專案分離（v2.1.0，dev/prod 物理隔離）
  - OpenSpec change 09 — 每日行程推播後端（v2.2.0，cron 排程 + system_settings 自動 migration + Flex 字卡）
  - hotfix v2.0.5 ~ v2.0.8（首次登入 onboarding 流程修補完整串）
- **dev 分支獨有（尚未上 main）**：
  - 無（v2.2.0 推送後 dev 與 main 同步，等下次 merge `m_b_*` 才會再次領先）
- 待依序 merge 的功能分支：`m_b_每日行程推播_frontend` / `m_b_pwa_upgrade` / `m_b_tag_*` / `m_b_eruda除錯工具`

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
| `m_b_每日行程推播_backend` | 每日行程 LINE Bot 推播 — 後端（cron 排程 + system_settings + Flex 字卡） | ✅ 已上 main（v2.2.0，2026-04-25）— 分支保留至 frontend 上線後一起砍 | 09-每日行程推播 |
| `m_b_每日行程推播_frontend` | 每日行程推播 — 前端設定頁（含 Eruda toggle） | ⬜ 待合入（後端 v2.2.0 已上 main，前端可開始接 API） | 09-每日行程推播 |
| `m_b_eruda除錯工具` | React 前端整合 Eruda 手機除錯 | ⚠️ 建議廢棄（功能已被 `推播_frontend` 的 `42a843b` 吸收並擴充） | — |
| `m_b_pwa_upgrade` | PWA 全平台升級（Android + iOS + Desktop 最新標準） | ⬜ 待合入 | 08-pwa-upgrade |
| `m_b_tag_database` | 標籤系統 — DB migration | ⬜ 待合入 | ❓ 無 OpenSpec change（需補） |
| `m_b_tag_backend` | 標籤系統 — 後端 API | ⬜ 待合入 | ❓ 無 OpenSpec change（需補） |
| `m_b_tag_frontend` | 標籤系統 — 前端 UI（TagBadge + TagSelector） | ⬜ 待合入 | ❓ 無 OpenSpec change（需補） |

### 分支補充說明

- **`m_b_每日行程推播_backend` 暫不砍除**：依使用者決議，等 `m_b_每日行程推播_frontend` 也驗證上線後一起刪除
- **`m_b_eruda除錯工具` 建議廢棄**：其 `4e39f65` 的 Eruda 載入機制（僅 URL `?eruda=1`）已被 `m_b_每日行程推播_frontend` 的 `42a843b` 整個取代為超集版本（URL 參數 + localStorage toggle + try/catch 保護）。若 merge 此分支會在 `frontend/index.html` 衝突
- **標籤系統缺 OpenSpec change**：三個 `m_b_tag_*` 分支未建立對應 OpenSpec 目錄，違反「新增功能 = 開 OpenSpec change」規則，需在 merge 前補齊（建議編號 `11-tag-system`）

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
瀏覽器（React SPA）
  └─ /api/* → Cloudflare Worker (_worker.js) → Zeabur 後端 (內網連線 PostgreSQL)
  └─ 靜態資源 → Cloudflare Pages (Vite build output)
```

### 前端路由分流（_worker.js）

`_worker.js` 的 `resolveBackend(hostname)`：

- `kjcs-dev.pages.dev`（含 preview 子網域）→ dev 後端
- 其他（含 `kj-champion-system.pages.dev` 與自訂網域）→ 正式後端

---

## 主要功能

| 功能 | 說明 | 角色限制 |
|------|------|---------|
| 月曆視圖 | 團體行事曆，依事件類型標色 | 所有人 |
| 行程列表 | 清單模式瀏覽行程 | 所有人 |
| 行程管理 | 新增 / 編輯 / 刪除（同步 Google Calendar）— 詳情頁 FAB 含紅色刪除按鈕（v2.2.1） | admin / manager |
| 行程儲存 UX | FAB「確認/儲存」明確按鈕語意，必填欄位 alert 提示，離開守衛使用 ref 避免時序競態（v2.0.4） | — |
| 成員管理 | 成員列表、詳情、角色設定 | admin / manager |
| 個人資料 | 查看與編輯個人資訊、同步 LINE 頭像 | 所有人 |
| 首次登入流程 | LINE OAuth 登入後強制 onboarding：用戶資料（4 欄全必填）→ 用戶數據（課程紀錄 ≥ 1 筆）→ 主應用，未完成不得進其他頁（v2.0.5 / v2.0.6 / v2.0.7 / v2.0.8 四修補完成） | 所有人 |
| 財務功能 | 上傳財務報表、選取/編輯模式（多選刪除/下載）、網頁預覽試算表 | manager |
| LINE Login | OAuth 2.0，後端動態偵測前端 origin 編入 OAuth state，callback 後 redirect 回原前端 | 所有人 |
| **每日行程推播 LINE Bot**（v2.2.0 新增） | node-cron 每日定時（預設 21:00 Asia/Taipei）讀取隔日行程 → 依對象（all / manager_above / developer）篩選 → 推送 Flex 字卡（Warm Minimal 風格、event row 卡片化、可點進前端詳情） | 推播：依 `daily_agenda_target` 設定；設定 API：僅開發者 |
| PWA | 可安裝至手機桌面（Vite PWA Plugin） | 所有人 |

---

## 環境變數

| 變數名稱 | 說明 | 必填 |
|---------|------|------|
| `LINE_CHANNEL_ID` | LINE Channel ID | 是 |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret | 是 |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE BOT Access Token（含 push messages 權限，每日推播必需） | 是 |
| `DATABASE_URL` | Zeabur PostgreSQL 連線字串（後端走內網 `postgresql.zeabur.internal:5432`） | 是 |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google Service Account JSON | 是 |
| `GROUP_CALENDAR_ID` | 團體 Google Calendar ID | 是 |
| `FRONTEND_URL` | 前端公開網址（OAuth redirect fallback + Flex 字卡按鈕指回前端） | 是 |
| `APP_URL` | 後端公開網址 | 是 |
| `NODE_ENV` | 環境（`production` / `development`） | 是 |
| `CRON_SECRET` | 排程 API 驗證密鑰（保留給日後外部 trigger 使用，目前 node-cron 內排不需） | 否 |

---

## 每日行程推播（v2.2.0 新增）

### 排程行為

- **時區**：固定 `Asia/Taipei`（由 `node-cron` `timezone` 選項保證，不受容器 TZ 影響）
- **預設時間**：21:00（首次 boot 從 `system_settings` 寫入預設）
- **預設對象**：`developer`（首次 boot 預設值）
- **可調整三個值**：透過 API 或直改 `system_settings` 表（`daily_agenda_time` / `daily_agenda_enabled` / `daily_agenda_target`）

### API（僅開發者，需 LINE userId 認證）

| Method | Path | 說明 |
|---|---|---|
| `GET` | `/api/line/agenda-settings` | 讀取目前設定 |
| `PUT` | `/api/line/agenda-settings` | 更新（body: `{time?, enabled?, target?}`，自動觸發 scheduler 重排） |
| `POST` | `/api/line/push-daily-agenda` | 手動觸發推播（測試用） |

### Flex 字卡設計

- Warm Minimal 風格，無 emoji
- Header `#4A7C59` accent 底白字日期
- Body `#F7F5F2` 米白底，每個 event 為 `#FFFFFF` 白底卡片（邊框 + 圓角 + padding）
- Event row 點擊 → `${FRONTEND_URL}/event/${id}`
- Footer「開啟行事曆」按鈕 → `${FRONTEND_URL}/calendar`

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
