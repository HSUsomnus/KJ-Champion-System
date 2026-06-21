# 康九冠軍夥伴系統

> **版本 dev** | 分支：`dev` | 測試站：[kjcs-dev.pages.dev](https://kjcs-dev.pages.dev) | 更新：2026-06-21

測試環境。正式版本請看 `main` 分支。

---

## 測試站資訊

- URL：[kjcs-dev.pages.dev](https://kjcs-dev.pages.dev)
- 後端：`kj-champion-dev.zeabur.app`（Zeabur `kj-champion-dev` 專案）
- DB：`postgresql-dev`（`kj-champion` 專案內，公網常開）

測試前先清 Service Worker：DevTools → Application → Service Workers → Unregister

---

## 功能分支總表

| 分支名稱 | 功能說明 | 狀態 | 對應 OpenSpec |
|---------|---------|------|--------------|
| `m_b_SidebarNav_UI` | SidebarNav UI 重構（logo 文字、管理者後台入口、Management pill tabs、權限修改開放負責人）+ Admin CSV 匯出 API | 待上線 | change 17 |

---

## 尚未上線至 main 的功能

### change 17 — SidebarNav UI 重構（`m_b_SidebarNav_UI`）

**前端：**
- SidebarNav header 顯示「康九冠軍」文字（logo 右側）
- 管理者後台 `isManager = role !== '一般人'`（負責人 + 開發者可見）
- Management 頁標題改為「管理者後台」
- Management pill tabs 樣式（container `#EFEDE9` / active `#4A7C59` 白字）

**後端：**
- `PUT /api/members/update-roles`：負責人或開發者皆可修改權限（原本僅開發者）
- `GET /api/admin/export-backup-csv?table=xxx`：從 backup DB 匯出 CSV（走內網，不需開公網）
- `GET /api/admin/backup-status`：自動探索所有 public table 筆數

**工具：**
- `scripts/import-csv-to-dev.js`：將 CSV 匯入 dev DB（UPSERT）

---

## 部署架構（v2.7.0）

| 層級 | prod 環境 | dev 環境 |
|---|---|---|
| **前端** | Cloudflare Pages `kj-champion-system.pages.dev` | Cloudflare Pages `kjcs-dev.pages.dev` |
| **後端** | Zeabur `kj-champion` 專案 | Zeabur `kj-champion-dev` 專案 |
| **prod DB** | `postgresql.zeabur.internal`（公網關閉） | — |
| **備份 DB** | `postgresql-backup.zeabur.internal`（公網關閉） | — |
| **dev DB** | `postgresql-dev`（公網開放） | dev 後端走公網連 |

---

## 本機開發

```bash
# 後端
npm install && npm run dev

# 前端
npm --prefix frontend install
npm --prefix frontend run dev
```

開發模式登入：URL 帶 `?dev=1`

---

## 版本記錄

詳見 [CHANGELOG.md](./CHANGELOG.md)。
