# 康九冠軍夥伴系統 — DEV 測試分支

> **分支：`dev`** | 基底版本：v2.2.1（與 `main` 同步）| 測試站：[kjcs-dev.pages.dev](https://kjcs-dev.pages.dev) | 更新：2026-04-25

此分支為 QA 測試環境，**已於 2026-04-13 格式化重置為 main**，歷史清空，重新累積功能分支合入。

---

## ⚠️ 此分支狀態

- 基底等於 `main`（**v2.2.1 — EventDetail 紅色刪除按鈕 hotfix 已上線**）
- **已合入 main 的內容**：
  - OpenSpec change 10 — Zeabur 專案分離（v2.1.0，dev/prod 物理隔離）
  - OpenSpec change 09 — 每日行程推播後端（v2.2.0，cron 排程 + system_settings 自動 migration + Flex 字卡）
  - hotfix v2.0.5 ~ v2.0.8（首次登入 onboarding 流程修補完整串）
  - hotfix v2.2.1 — EventDetail FAB 紅色刪除按鈕
- **dev 分支獨有（尚未上 main）**：
  - 無（v2.2.1 推送後 dev 與 main 同步，等下次 merge `m_b_*` 才會再次領先）
- 待依序 merge 的功能分支：`m_b_每日行程推播_frontend` / `m_b_pwa_upgrade` / `m_b_tag_*` / `m_b_eruda除錯工具`

---

## 測試站

- **網址**：[https://kjcs-dev.pages.dev](https://kjcs-dev.pages.dev)
- **後端**：`kj-champion-dev.zeabur.app`（DEV 專用，搬到獨立 Zeabur 專案 `kj-champion-dev`）
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
- **`m_b_pwa_upgrade` STATUS.md 被覆蓋**：v2.2.0 同步時用了 `-X theirs`，分支自己的 STATUS 改動被 main 蓋掉，下次接手時對照 commit `7abb8d2` 補回
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
