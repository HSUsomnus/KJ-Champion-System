# NOW.md — 當前執行狀態
> 此文件由 Claude Code 自動維護，人工只維護「設計決策」區塊。
> 上下文快滿時輸入 `/打包`，新對話輸入 `/繼續`。

---

## 功能範圍

**v2.3.0 已上線（PC session 完整收尾）**：OpenSpec change 09「每日行程推播」整個 DONE — 前端開發者設定頁（`/agenda-settings` toggle / 時間 / 對象 / 立即推播 + Eruda toggle）、FabNav 開發者入口、PWA `mobile-web-app-capable` meta tag 補正、scripts/seed-dev-agenda-test.js（dev DB seed 工具）。main HEAD `bc84023`，tag `v2.3.0` 已推。dev + 5 條 m_b_* 全部同步完成（pwa_upgrade 第二次 -X theirs 蓋 STATUS.md，需接手時補回）。`m_b_每日行程推播_backend` + `_frontend` 兩條 feature 分支已從遠端與本機刪除。

→ **PC 接手已完成事項**：v2.2.0 prod 驗證（手動 push API + LINE 字卡實收）、v2.3.0 上線（CHANGELOG / context / README / NOW / STATUS / tasks 全到位）、dev 全鏈路驗證 8.1~8.5、本機 Node + scoop 環境修復、psql 直連 dev DB 寫入測試資料、prod GUI 把推播時間 23:30 改回 21:00。

主要里程碑：
- v2.2.0 後端：`server/scheduler/dailyAgenda.js` + `server/services/agendaService.js` + `server/services/lineService.js` Flex 生成 + 3 個 API
- system_settings 表自動 migration（server.js 啟動時 idempotent INSERT 種子值：`time=21:00` / `enabled=true` / `target=developer`）
- v2.2.1 hotfix：EventDetail FAB 紅色刪除按鈕（main HEAD `5bc2de1`）
- v2.3.0 前端：`AgendaSettings.jsx`（298 行）+ FabNav role gate + api.js 3 方法 + `/agenda-settings` 路由 + Eruda inline loader + PWA meta（commit pending push）
- prod v2.2.0 驗證：手動 push API（`totalMembers: 1, sent: 1, failed: 0, eventCount: 1`）+ 使用者實收 4/27 Flex 字卡
- dev 全鏈路驗證：seed 開發者帳號 + 一般人帳號 + 4/27 event → 推播 / Eruda / 權限 gate 全通

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
- **每日行程推播 v2.2.0**：
  - **時區固定 `Asia/Taipei`**（`node-cron` `timezone` 選項，不依賴容器 TZ）
  - **system_settings 表三個 key**：`daily_agenda_time` / `daily_agenda_enabled` / `daily_agenda_target`（`all` / `manager_above` / `developer`）
  - 種子值只用於首次建表，前端設定 UI 上線後一律以 DB 為準（不視為「行為預設」，視為「初始 placeholder」）
  - **target 不寫死**：透過 `PUT /api/line/agenda-settings` 即時改寫 + 觸發 scheduler 重排（無需重啟後端）
  - Flex 字卡：Header `#4A7C59` accent / Body `#F7F5F2` 米白底 / 每個 event 為白底卡片 / 點擊 → `${FRONTEND_URL}/event/${id}` / Footer 按鈕 → `${FRONTEND_URL}/calendar`
  - 設定 API 限 `developer` 角色（`requireDeveloper` middleware）
- **v2.3.0 開發者設定頁**：
  - 路徑 `/agenda-settings`，FabNav 開發者專屬入口（齒輪 icon），role gate 雙重防護（前端隱藏 + 後端 403）
  - **Toggle inline style 不用 Tailwind class**：JIT 在動態 class 名（如 `translate-x-${on?'5':'0'}`）會漏掃，production build 沒對應 class，knob 不會動。改用 `style={{ transform: ... }}` 直接寫值
  - **Eruda 載入策略**：URL `?eruda=1` 或 `localStorage.erudaEnabled='true'` 任一為真即從 cdn.jsdelivr.net/npm/eruda 載入。前者急救（手機現場 debug），後者常駐
  - **「立即推播」無 confirm dialog**：依使用者明確需求，與 DevTools 手動 fetch 一致 — 跳過時間設定，直接以 UI 當前選的對象推播。誤觸風險使用者自控
  - **PWA meta tag 雙寫**：`apple-mobile-web-app-capable`（舊 iOS）+ `mobile-web-app-capable`（新 Chrome），兩個並列雙吃

## 目前進度

- **目前分支**：`main`（v2.3.0 已上線，HEAD `bc84023`）
- **dev HEAD**：`2e2e6e4`（main 同步進來，dev 專屬 README 保留）
- **5 條 m_b_*** 全部 behind main = 0
- **v2.2.1 + v2.3.0 tag 都在遠端**
- **`hotfix/event-detail-delete-fab`** 已被刪
- **prod 推播時間** 已用 v2.3.0 GUI 從 23:30 改回 21:00

### change 09 已完成
- 1.x ~ 5.x 後端 scheduler + service + API + Flex 字卡（v2.2.0 上線）
- 6.x ~ 7.x 前端設定頁 + Eruda + PWA meta（v2.3.0 待上線）
- 8.x dev 全鏈路驗證（developer / 一般人雙帳號 + 4/27 event seed）

### v2.2.1 hotfix（已上線）
- main HEAD `5bc2de1`
- 改動：`frontend/src/pages/EventDetail.jsx`（+23 / -0）
- 內容：fabItems 第三項加「刪除」（`#dc2626` label / icon / 邊框紅、白底），confirm 二次確認，成功 redirect `/calendar`，失敗顯示後端錯誤不 fallback，生日事件不顯示刪除
- 不開 OpenSpec change（單一 UX 修補無架構變動）

### 全部 m_b_* 分支同步狀態（v2.2.1 後 / v2.3.0 push 前）
| 分支 | 狀態 | 備註 |
|---|---|---|
| `m_b_eruda除錯工具` | 已同步 | 廢棄（功能已併入 v2.3.0 設定頁），v2.3.0 上線後評估砍除 |
| `m_b_pwa_upgrade` | 已同步 | v2.2.0 sync 時 `-X theirs` 蓋掉 STATUS.md（commit `7abb8d2`），接手時需補回 |
| `m_b_tag_backend / database / frontend` | 已同步 | — |
| `m_b_每日行程推播_backend` | 保留 | 待 v2.3.0 上線後與 frontend 一起砍 |
| `m_b_每日行程推播_frontend` | **本次 push 來源** | 上線後砍 |
| `dev` | 已 merge frontend（HEAD `8db32fb`）| v2.2.1 sync 時用 `-X theirs`，README 已重寫修復 |

## 已知地雷

- 部分成員 avatar 404 是正常的（該成員無頭像），前端有 fallback 顯示姓名首字
- 測試前必須清 Service Worker（DevTools → Application → Service Workers → Unregister）避免舊 SW 快取干擾
- **CCR 沙箱 git 限制（v2.0.4 發現）**：Claude Code Remote 環境的本機 git proxy 會拒絕 tag push 與 branch delete（HTTP 403）。推完 main 後 Claude 必須主動提醒使用者手機或本機手動建 tag + 刪分支。詳見 `.claude/rules/deploy.md` 的「CCR 沙箱 git 限制」章節
- Bash 輸出 `Everything up-to-date` 出現在 403 錯誤之後時不代表成功，必須用 `git ls-remote --tags origin` 驗證
- **CCR 沙箱 outbound host 白名單（10 發現）**：Web 版 Claude Code 沙箱對 outbound 走嚴格白名單，`zeabur.com` 與 Zeabur DB 公網 IP 都不可達。任何「連 Zeabur / 連 prod / dev DB」的指令必須由 PC 本地 Claude Code 或使用者本機執行
- **Zeabur PostgreSQL connection string 模板**：`postgresql` 服務的 `${POSTGRES_CONNECTION_STRING}` 引用 `${PASSWORD}` env var，**不是** `${POSTGRES_PASSWORD}`。改密碼時兩個都改，並重啟使用該 template 的後端服務（例如 `kj-champion-system`）讓 connection pool 拿到新值
- **prod DB 公網預設關閉**（v2.1.0 起）：日常 PC 連不到 prod DB。需要維護時去 Zeabur Dashboard 暫時開「連線埠轉送」toggle，做完立刻關
- **新用戶在 dev 站登入會走完整 onboarding**：因為 dev DB 為空。要測新 UI 流程很方便；要測既有用戶行為要先在 dev DB 寫一筆完整的 member 記錄（PC psql `INSERT INTO members ...`）
- **m_b_pwa_upgrade 的 STATUS.md 被覆蓋**（v2.2.0 同步副作用）：下次接手 PWA 分支時，需先 `git diff 7abb8d2~1 7abb8d2 -- openspec/STATUS.md` 看分支自己加的 STATUS 段落，手動補回
- **本機 PC node_modules 損壞**（v2.3.0 PC session 發現）：所有 packages 都只解出最上層檔案（README/LICENSE/package.json），缺 `lib/` 等子目錄，導致 `node` 跑專案內任何依賴庫的腳本都會 `Cannot find module .../lib/main.js`。`npm install` 看資料夾存在會跳過，無法自修。修法：`rm -rf node_modules && npm install` 全砍重裝。**v2.3.0 prep 時改走 psql 直連 dev DB 繞過此問題，未影響上線**
- **PC scoop nodejs-lts shim 缺失**（v2.3.0 PC session 發現）：scoop 顯示 `nodejs-lts (24.15.0) is already installed` 但 `~/scoop/shims/` 沒 node 檔，PowerShell 找不到 `node` 指令。修法：`scoop reset nodejs-lts`（會把 `~/scoop/apps/nodejs-lts/current/bin` 加進 USER PATH，舊 terminal 須關閉重開才生效）

## 下一步

### 尚未動工的功能分支
- `m_b_tag_*` 三段式合（database → backend → frontend），建議補 OpenSpec change `11-tag-system`
- `m_b_pwa_upgrade`（需實機測 install）— 接手時對照 commit `7abb8d2` 補回兩次 -X theirs 蓋掉的 STATUS.md
- `m_b_eruda除錯工具` 評估砍除（功能已併入 v2.3.0 設定頁）

### 本機環境待修
- node_modules 損壞 → `rm -rf node_modules && npm install`（不急，下次要跑 Node 腳本前處理）

### 環境變數
- 本機 `.env` 內 `DATABASE_URL`（prod 公網）日常無效（v2.1.0 起公網關閉）。維護需 Zeabur 暫開公網
- `DEV_DATABASE_URL`（dev 公網）正常可用
- prod 新密碼存在使用者本機 `.env`，未在任何文件 commit
