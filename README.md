# 康九冠軍夥伴系統 — DEV 測試分支

> **分支：`dev`** | 基底版本：v2.3.0（含 v2.4.0-dev change 12）| 測試站：[kjcs-dev.pages.dev](https://kjcs-dev.pages.dev) | 更新：2026-04-26

此分支為 QA 測試環境，**已於 2026-04-13 格式化重置為 main**，歷史清空，重新累積功能分支合入。

---

## ⚠️ 此分支狀態

- 基底等於 `main`（**v2.3.0 — 每日行程推播前端設定頁 + UIDESIGN.md 升格 + 推 main 前強制更新 NOW.md 規則**）
- **已合入 main 的內容**：
  - OpenSpec change 10 — Zeabur 專案分離（v2.1.0，dev/prod 物理隔離）
  - OpenSpec change 09 — 每日行程推播（v2.2.0 後端 + v2.3.0 前端）
  - hotfix v2.0.5 ~ v2.0.8（首次登入 onboarding 流程修補完整串）
  - hotfix v2.2.1 — EventDetail FAB 紅色刪除按鈕
  - 規則類補丁（2026-04-26）：UIDESIGN.md 升格根目錄、CLAUDE.md 加 UI 規範索引、deploy.md 加「推 main 前強制更新 NOW.md」
- **dev 分支獨有（尚未上 main）**：
  - **change 12-統一彈出訊息系統** — 替換 14 處原生 alert/confirm 為 Warm Minimal 風格 Toast / ConfirmDialog / FieldError / BottomSheet（v2.4.0 目標，dev 驗證中）
- 待依序 merge 的功能分支：`m_b_pwa_upgrade` / `m_b_tag_*`

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
| `m_b_統一彈出訊息系統` | Warm Minimal 風格 Feedback 元件（Toast / ConfirmDialog / BottomSheet / FieldError / Dialog base）+ 替換 14 處 alert/confirm + 既有 ConfirmLeaveDialog/ShareConfirmDialog/AmountPicker 遷移 | 🛠 **本次合入 dev 驗證中**（v2.4.0 目標） | 12-統一彈出訊息系統 |
| `m_b_pwa_upgrade` | PWA 全平台升級（Android + iOS + Desktop 最新標準） | ⬜ 待合入 | 08-pwa-upgrade |
| `m_b_tag_database` | 標籤系統 — DB migration | ⬜ 待合入 | ❓ 無 OpenSpec change（需補） |
| `m_b_tag_backend` | 標籤系統 — 後端 API | ⬜ 待合入 | ❓ 無 OpenSpec change（需補） |
| `m_b_tag_frontend` | 標籤系統 — 前端 UI（TagBadge + TagSelector） | ⬜ 待合入 | ❓ 無 OpenSpec change（需補） |

### 分支補充說明

- **`m_b_統一彈出訊息系統` dev 驗證重點**（依 [`tasks.md`](openspec/changes/12-統一彈出訊息系統/tasks.md) 5.x）：
  - 5.2 掃過 8 個 page，確認原 alert / confirm 點位都換成新 UI 且行為正確
  - 5.3 表單錯誤情境：ProfileEdit 四欄都空送出 → 4 個 inline 紅字同時顯示，第一個欄位自動 focus + scrollIntoView
  - 5.4 toast 同時觸發三個 → 堆疊正確、success 2s / info 3s / error 4s 自動消失時長正確
  - 5.5 confirm danger 樣式：EventDetail 刪除按鈕 → 紅色「刪除」按鈕視覺
  - 5.6 PWA install 後再驗一次（避免 SW 快取舊 bundle）
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
