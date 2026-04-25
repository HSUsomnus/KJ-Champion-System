# NOW.md — 當前執行狀態
> 此文件由 Claude Code 自動維護，人工只維護「設計決策」區塊。
> 上下文快滿時輸入 `/打包`，新對話輸入 `/繼續`。

---

## 功能範圍

**v2.1.0 已上線（PC 收工）**：OpenSpec change 10「Zeabur 專案分離」完成 + 連帶 v2.0.5/2.0.6/2.0.7/2.0.8 四個 hotfix 修補首次登入 onboarding 流程。dev 與 prod 環境完全物理隔離，prod DB 公網路關閉、密碼旋轉。`.claude/rules/workflow.md` 規則更新（修 bug 加判斷決策樹）已直推 main。

→ **PC 此次 session 結束，交班給手機 Claude Code Web 接手 m_b_\* 分支進度**。

主要里程碑：
- dev 環境搬到獨立 Zeabur 專案 `kj-champion-dev`，內網與 prod 完全隔絕
- prod DB 公網路關閉，僅內網存取
- prod DB 密碼旋轉（舊密碼曾在 web Claude Code chat 紀錄暴露）
- 新用戶 onboarding 強制流程：用戶資料 → 用戶數據 → 主應用，未完成不得進其他頁

## 設計決策

- UI 風格：Warm Minimal（`#F7F5F2` bg, `#4A7C59` accent, `#2C2C2C` text, `rounded-xl`）
- OAuth 動態 redirect：後端從 request headers（Origin/Referer）偵測前端 origin，編入 OAuth state，callback 後用該 origin redirect。白名單驗證防 open redirect
- `_worker.js` `resolveBackend(hostname)`：`kjcs-dev.pages.dev` → dev 後端；其他 → 正式後端
- FAB onOpen：不用 inline useCallback（會因 early return 違反 hooks 規則），直接用箭頭函式
- 前端目錄：`frontend/`（React + Vite + PWA），舊 `public/` 已於 v2.0.0 刪除
- FAB 顏色統一不變色：左下 `#2C2C2C`、右下 `#4A7C59`，editMode 不改色
- **useLeaveGuard 用 useRef 而非 useState**：避免與 react-router v7 `useBlocker` 的 useEffect 延遲註冊產生時序競態（v2.0.4）
- 編輯頁 FAB 紅色按鈕統一文字：「確認/儲存」（v2.0.4）
- **dev 與 prod 在 Zeabur 不同專案內網完全隔離**（v2.1.0）：
  - prod 環境：Zeabur 專案 `kj-champion`（含 `postgresql` + `kj-champion-system` 後端）
  - dev 環境：Zeabur 專案 `kj-champion-dev`（含 `postgresql-dev` + `kj-champion-system-dev` 後端）
  - 跨專案內網不通，dev 任何錯誤無法物理影響 prod
- **prod DB 公網路預設關閉**（v2.1.0）：所有 prod 流量走 `postgresql.zeabur.internal:5432` 內網。PC 維護時需暫時開公網，做完關掉
- **新用戶 onboarding 強制流程**（v2.0.7 + v2.0.8）：
  - profile 完整 = realName / email / phone / birthday 四欄都不為空
  - stats 完整 = courseRecord 至少 1 筆
  - ProtectedRoute 二級判斷：未完成 profile → 強制 `/profile/edit`、未完成 stats → 強制 `/user-stats/edit`
  - 完成 onboarding 最後一步 → 導 `/`（主頁）

## 目前進度

- **目前分支**：`m_b_zeabur_projects_split`（待 10.14 完成 → merge main 走 v2.1.0 功能上線）
- **OpenSpec change 10 進度**：13 / 14 完成（剩 10.14 文件更新 + archive 08）
- **已上 main 的版本**：v2.0.5 / v2.0.6 / v2.0.7 / v2.0.8（4 個 hotfix）
- **dev 已驗證**：dev 站走新 dev 後端 `kj-champion-dev.zeabur.app` + 走獨立 dev DB（5 tables 與 prod 對齊、空資料）+ 新用戶 onboarding 完整流程順跑

### change 10 已完成的 task
- 10.1 新建 Zeabur 專案 `kj-champion-dev`
- 10.2 新專案建 `postgresql-test`（後改名 `postgresql-dev`）
- 10.3 PC schema dump → 套到新 dev DB
- 10.4 新專案建 `kj-champion-system-dev` 後端（連 dev branch）
- 10.5 新 dev 後端環境變數（`DATABASE_URL` 走 `postgresql.zeabur.internal:5432` 內網）
- 10.6 取得新 dev 後端 URL `kj-champion-dev.zeabur.app`
- 10.7 修改 `_worker.js` 的 `resolveBackend()` 指向新 URL
- 10.8 LINE Console 加新 callback URL（保留舊 URL）
- 10.9 Cloudflare Pages preview build 確認
- 10.10 dev 全鏈路驗證（讀寫雙向 + 資料隔離 24 vs 0）
- 10.11 砍舊 `kj-champion` 專案內的 `postgresql-test` 與 `kj-champion-system-dev`
- 10.12 prod DB 密碼旋轉（用 PC ALTER USER + Zeabur env var 同步 + 重啟 prod 後端）
- 10.13 關 prod DB 公網路（兩步驗證後 toggle 關，prod 站續正常）

### change 10 待完成
- 10.14 文件更新 + archive 08（**進行中 — 此次提交範圍**）

### v2.0.5 ~ v2.0.8 hotfix 串
- v2.0.5 — Login.jsx no-profile 點建立資料死循環（profile.edit 沒先 login(userData) 導致被 ProtectedRoute 踢回）
- v2.0.6 — Login.jsx useEffect 跟 handleConfirm 的 navigate race condition（user 變更觸發 useEffect 蓋掉 navigate）
- v2.0.7 — 新用戶 onboarding 強制流程（4 個檔案 + ProtectedRoute guard + 編輯頁必填）
- v2.0.8 — UserStatsEdit 完成 onboarding 後導主頁（onboarding=true → '/'）

## 已知地雷

- 部分成員 avatar 404 是正常的（該成員無頭像），前端有 fallback 顯示姓名首字
- 測試前必須清 Service Worker（DevTools → Application → Service Workers → Unregister）避免舊 SW 快取干擾
- **CCR 沙箱 git 限制（v2.0.4 發現）**：Claude Code Remote 環境的本機 git proxy 會拒絕 tag push 與 branch delete（HTTP 403）。推完 main 後 Claude 必須主動提醒使用者手機或本機手動建 tag + 刪分支。詳見 `.claude/rules/deploy.md` 的「CCR 沙箱 git 限制」章節
- Bash 輸出 `Everything up-to-date` 出現在 403 錯誤之後時不代表成功，必須用 `git ls-remote --tags origin` 驗證
- **CCR 沙箱 outbound host 白名單（10 發現）**：Web 版 Claude Code 沙箱對 outbound 走嚴格白名單，`zeabur.com` 與 Zeabur DB 公網 IP 都不可達。任何「連 Zeabur / 連 prod / dev DB」的指令必須由 PC 本地 Claude Code 或使用者本機執行
- **Zeabur PostgreSQL connection string 模板**：`postgresql` 服務的 `${POSTGRES_CONNECTION_STRING}` 引用 `${PASSWORD}` env var，**不是** `${POSTGRES_PASSWORD}`。改密碼時兩個都改，並重啟使用該 template 的後端服務（例如 `kj-champion-system`）讓 connection pool 拿到新值
- **prod DB 公網預設關閉**（v2.1.0 起）：日常 PC 連不到 prod DB。需要維護時去 Zeabur Dashboard 暫時開「連線埠轉送」toggle，做完立刻關
- **新用戶在 dev 站登入會走完整 onboarding**：因為 dev DB 為空。要測新 UI 流程很方便；要測既有用戶行為要先在 dev DB 寫一筆完整的 member 記錄（PC psql `INSERT INTO members ...`）

## 下一步（手機 Claude Code Web 接手）

### PC 已完成 — 交班檢查清單
- [x] OpenSpec 10 全部 14 個 task 完成 + v2.1.0 上線
- [x] v2.0.5 ~ v2.0.8 四個 hotfix 已 merge main
- [x] dev DB 與 prod DB 物理隔離（跨 Zeabur 專案）
- [x] prod DB 公網關閉 + 密碼旋轉
- [x] `.claude/rules/workflow.md` 加「修 bug 判斷決策樹」直推 main
- [x] dev 已同步 v2.1.0
- [x] 砍 `m_b_zeabur_projects_split` + `m_b_dev_test_database`

### 手機端要做的事（按優先順序）

1. **同步 main → 7 條 m_b_\* 分支**（拿到 v2.1.0 + 新規則）
   - `m_b_eruda除錯工具`、`m_b_pwa_upgrade`、`m_b_tag_backend/database/frontend`、`m_b_每日行程推播_backend/frontend`
   - 衝突採 `-X theirs`（按 deploy.md 慣例），記下被覆蓋的 dep
2. **m_b_每日行程推播_backend** 已合進 dev，可繼續驗證後上 main
3. **m_b_tag_database → m_b_tag_backend → m_b_tag_frontend** 依序合（標籤系統三段式）
4. **m_b_pwa_upgrade**（PWA 升級，需實機測 install）
5. **m_b_eruda除錯工具**（依手機端 commit message 看是否可廢，已被 `_推播_frontend` 的 `42a843b` 吸收）

### 環境變數提醒
- 本機 `.env` 內 `DATABASE_URL`（prod 公網）日常無效（v2.1.0 起公網關閉）。要做 prod DB 維護需先去 Zeabur 暫開公網
- `DEV_DATABASE_URL`（dev 公網）正常可用
- prod 新密碼存在使用者本機 `.env` 內，未在任何文件 commit

### Cloudflare Pages prod 部署狀態
- main push 後自動觸發 build，30-60 秒完成
- 使用者待驗證 `https://kj-champion-system.pages.dev` 登入正常（onboarding guard 不會觸發 prod 既有用戶）
