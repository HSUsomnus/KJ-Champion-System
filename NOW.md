# NOW.md — 當前執行狀態
> 此文件由 Claude Code 自動維護，人工只維護「設計決策」區塊。
> 上下文快滿時輸入 `/打包`，新對話輸入 `/繼續`。

---

## 功能範圍

進行中：**OpenSpec change 08 — dev 測試資料庫獨立化**（分支 `m_b_dev_test_database`）。將 dev 後端切換到獨立的 `postgresql-test`，與正式 DB 完全隔離。

已完成：v2.0.4 hotfix 上線（修復「新增行程」兩個 UX bug + 全站編輯頁 FAB「確認」→「確認/儲存」）。

## 設計決策

- UI 風格：Warm Minimal（`#F7F5F2` bg, `#4A7C59` accent, `#2C2C2C` text, `rounded-xl`）
- OAuth 動態 redirect：後端從 request headers（Origin/Referer）偵測前端 origin，編入 OAuth state，callback 後用該 origin redirect。白名單驗證防 open redirect
- `_worker.js` `resolveBackend(hostname)`：`kjcs-dev.pages.dev` → dev 後端；其他 → 正式後端
- FAB onOpen：不用 inline useCallback（會因 early return 違反 hooks 規則），直接用箭頭函式
- 前端目錄：`frontend/`（React + Vite + PWA），舊 `public/` 已於 v2.0.0 刪除
- FAB 顏色統一不變色：左下 `#2C2C2C`、右下 `#4A7C59`，editMode 不改色
- **useLeaveGuard 用 useRef 而非 useState**：避免與 react-router v7 `useBlocker` 的 useEffect 延遲註冊產生時序競態（v2.0.4）
- 編輯頁 FAB 紅色按鈕統一文字：「確認/儲存」（v2.0.4）

## 目前進度

- **目前分支**：`m_b_dev_test_database`（基於 main `98e840b`）
- **OpenSpec change**：08-dev-test-database（`openspec/changes/08-dev-test-database/`）
- **進度**：08.1 已完成（postgresql-test 服務於 Zeabur `kj-champion` 專案內建立完成）
- **下一步**：08.2 + 08.3（pg_dump 正式 DB schema → 套到 test DB）

### ⚠️ 沙箱網路限制 — Web 版 Claude Code 無法執行 08.2 / 08.3

Claude Code Web 沙箱有 outbound host 白名單，**Zeabur 不在白名單內**：

```
github.com → 200            ✅ 可達
zeabur.com → 403            ❌ host_not_allowed
43.163.196.8:30756 (DB)     ❌ TCP timeout
```

→ 08.2 / 08.3 必須由 **PC 本地 Claude Code** 接手執行。

### PC 本地接手指引

PC 本地 Claude Code 進來時直接從這裡讀：

1. **切到本分支**：
   ```bash
   git fetch origin && git checkout m_b_dev_test_database && git pull
   ```
2. **讀 OpenSpec**：`openspec/changes/08-dev-test-database/{proposal,design,tasks}.md`
3. **連線字串來源**：使用者本機 `.env` 內已有 prod `DATABASE_URL`（`postgresql://root:***@43.163.196.8:30756/zeabur`）。test DB 連線字串需向使用者要（已在 Zeabur dashboard，prod chat 紀錄裡也有但 PC 本地不需碰那個歷史）
4. **執行 08.2**：`pg_dump --schema-only --no-owner --no-privileges "$PROD_DATABASE_URL" > /tmp/schema.sql`
5. **執行 08.3**：`psql "$TEST_DATABASE_URL" -f /tmp/schema.sql`
6. **驗證**：`psql "$TEST_DATABASE_URL" -c "\dt"` 比對 prod table 數
7. **推進**：勾完 08.2 / 08.3 後接 08.4（建假資料 seed `scripts/seed-test-db.sql`）

### Web 版本回合貢獻

- 08.1 完成標記
- proposal / design / tasks 三檔起草
- README 改寫為 m_b_dev_test_database 分支說明
- STATUS.md 加入 #08
- NOW.md 交接（本段）

### 已交付給使用者的後續手動項目

- 旋轉正式 DB 密碼（prod 連線字串曾在 chat 中暴露，建議 schema dump 完成後做一次 `ALTER USER root WITH PASSWORD ...`）
- 同步更新 Zeabur `postgresql` 服務的 `POSTGRES_PASSWORD` env var（目前為空，是 connection string 模板渲染失敗的元兇）

### 上一個版本（v2.0.4）參考

- 已 push 到 main：`c3dc878`、`921ddcd`、`434efb6`、`952cc64`
- tag v2.0.0 ~ v2.0.4 完整（v2.0.3、v2.0.4 使用者手機補建）
- dev 分支 `dbb4c39` 已同步 main

### 本次 v2.0.4 修復內容

1. **新增行程靜默無反應**：`handleConfirm` 漏填欄位時 silent return → 改 `alert('請輸入標題')` / `alert('請選擇開始日期')`
2. **useLeaveGuard 時序競態**：原 `useState(saved)` + `useBlocker(!saved)` 在 `setSaved()` 後 navigate 仍誤攔截 → 改 `useRef` + `useCallback` 穩定 shouldBlock
3. **FAB 統一文字**：`AddEvent / ProfileEdit / UserStatsEdit / FinancialUpload / FinancialEdit` 紅色「確認」→「確認/儲存」

## 已知地雷

- DEV 後端 `APP_URL` 為 `https://kj-champion-system-dev.zeabur.app`，LINE Console 已加此 callback URL
- 部分成員 avatar 404 是正常的（該成員無頭像），前端有 fallback 顯示姓名首字
- 測試前必須清 Service Worker（DevTools → Application → Service Workers → Unregister）避免舊 SW 快取干擾
- **CCR 沙箱 git 限制（v2.0.4 發現）**：Claude Code Remote 環境的本機 git proxy 會拒絕 tag push 與 branch delete（HTTP 403）。推完 main 後 Claude 必須主動提醒使用者手機或本機手動建 tag + 刪分支。詳見 `.claude/rules/deploy.md` 的「CCR 沙箱 git 限制」章節
- Bash 輸出 `Everything up-to-date` 出現在 403 錯誤之後時不代表成功，必須用 `git ls-remote --tags origin` 驗證
- **CCR 沙箱 outbound host 白名單（08-dev-test-database 發現）**：Web 版 Claude Code 沙箱對 outbound 走嚴格白名單。已驗證：`github.com` 通、`zeabur.com` 403、Zeabur DB 公網 IP TCP 直連 timeout。任何「連 Zeabur / 連 prod / dev DB」的指令必須由 PC 本地 Claude Code 或使用者本機執行，Web 沙箱跑只會逾時。下次遇到類似工作（連任何非 GitHub 的外部服務）一律先測網路再答應跑，不要事後才發現。
- **Zeabur PostgreSQL connection string 模板 bug**：`postgresql` 服務的 `POSTGRES_PASSWORD` 環境變數預設為空，導致 `${POSTGRES_CONNECTION_STRING}` 模板渲染出 `postgresql://root:@host:port/db`（密碼空白）。真實密碼存在另一個 `PASSWORD` env var 中。`kj-champion-system` 後端的 `DATABASE_URL = ${POSTGRES_CONNECTION_STRING}` 仍能運作（推測模板實際引用的是 `${PASSWORD}` 不是 `${POSTGRES_PASSWORD}`，但 UI 顯示誤導）。解法：旋轉密碼時順便把 `POSTGRES_PASSWORD` 填回正確值，避免未來新服務複製 connection string 踩雷。
