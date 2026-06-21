# OpenSpec STATUS

> 每次對話的導航起點。只看不寫（不在此輸入需求）。
> 「修改計畫」或「執行計畫」前必讀，讀完確認位置後再行動。

---

## 路線圖

| # | Change | 狀態 | 說明 |
| --- | --- | --- | --- |
| 01 | zeabur-infra-and-db | ✅ ARCHIVED | Zeabur DB + 後端部署，全完成 |
| 02 | cloudflare-pages-validate | ✅ DONE | Cloudflare Pages 前後端串接驗證 |
| 025 | html-production-deploy | ✅ DONE | staging HTML 版部署 main 完成 |
| 03 | pencil-ui-design | ✅ DONE | 設計稿確認鎖定 |
| 04 | react-vite-pwa-frontend | ✅ DONE | 整合進 06 |
| 05 | production-cutover | ✅ DONE | Vercel / Supabase 完全退場 |
| 06 | 新UI前端開發 | ✅ DONE | React+Vite+PWA 新UI，合併 main（v2.0.0）|
| 07 | oauth動態redirect | ✅ DONE | OAuth redirect 自動偵測 origin（v1.6.0）|
| 08 | dev-test-database | 🗄️ SUPERSEDED | 被 10 取代並 archive |
| 09 | 每日行程推播 | ✅ DONE | 後端 v2.2.0 + 前端 v2.3.0 全部上線 |
| 10 | zeabur-projects-split | ✅ DONE | Zeabur 專案分離 — dev 與 prod 完全物理隔離（v2.1.0）|
| 12 | 統一彈出訊息系統 | 🔄 IN PROGRESS | 分支 `m_b_統一彈出訊息系統`，0/33 task，目標 v2.5.0 |
| 13 | 定時同步Calendar | ✅ DONE | node-cron 每分鐘同步 Google Calendar，raw https.request 繞過 gaxios（v2.4.0）|
| 14 | 側邊欄導覽 | ✅ DONE | 左側抽屜式 SidebarNav 整合 Header + FabNav，Layout 包裹器（v2.5.0）|

---

## 當前 Change：無（下一個 change 待定）

change 12「統一彈出訊息系統」仍在 dev，分支 `m_b_統一彈出訊息系統`，0/33 task，尚未開始實作。

---

## 工作流提醒

| 指令 | 動作順序 |
| --- | --- |
| 「修改計畫」 | 讀此檔 → `spec.md` → `tasks.md` → 更新此檔 |
| 「執行計畫」 | 讀此檔 → `tasks.md` → 實作程式碼 → 更新 `tasks.md` → 更新此檔 |

> **關鍵原則**：修改計畫從 `spec.md` 開始，`tasks.md` 永遠最後更新。

---

*最後更新：2026-06-20（精簡方案執行 — STATUS.md 移除 task 列表，路線圖補 03/04/05；proposal+design 合併為 spec.md）*
