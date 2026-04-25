# NOW.md — 當前執行狀態
> 此文件由 Claude Code 自動維護，人工只維護「設計決策」區塊。
> 上下文快滿時輸入 `/打包`，新對話輸入 `/繼續`。

---

## 功能範圍

**v2.2.0 後端已上線（手機 CCR 推完，交班 PC）**：OpenSpec change 09「每日行程推播」後端完成 — LINE Bot 每日定時推送隔日行程 Flex 字卡（`Asia/Taipei` `node-cron` + `system_settings` 表動態設定 + 開發者專用 API + Warm Minimal 風格字卡點進前端詳情）。前端設定頁（`m_b_每日行程推播_frontend`）待開發。

→ **手機 CCR 此次 session 結束，交班給 PC 接手**：補建 `v2.2.0` tag、prod 上線驗證、後續 m_b_* 分支進度。

主要里程碑：
- v2.2.0 後端：`server/scheduler/dailyAgenda.js` + `server/services/agendaService.js` + `server/services/lineService.js` Flex 生成 + 3 個 API
- system_settings 表自動 migration（server.js 啟動時 idempotent INSERT 種子值：`time=21:00` / `enabled=true` / `target=developer`）
- 全部 7 條 m_b_* 分支 + dev 同步至 v2.2.0 完成

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

## 目前進度

- **目前分支**：`main`（v2.2.0 已上線，HEAD `9f18745`）
- **手機 CCR 剛完成**：09 後端 merge → main push → 全分支同步
- **dev 已同步**：dev HEAD `53281ae`，v2.2.0 完整內容（README 衝突手動解，保留 dev 專屬「功能分支總表」結構）
- **m_b_每日行程推播_backend 保留**：依使用者決議，**等 `m_b_每日行程推播_frontend` 上線後一起砍**

### change 09 已完成（後端段）
- 1.x ~ 4.x 後端 scheduler + service + API + Flex 字卡
- 5.x dev 整合 + Cloudflare Pages preview 驗證
- 5.6.4 v2.2.0 上線準備（CHANGELOG / README / context / STATUS / tasks）

### change 09 待完成（前端段，下次接手 m_b_每日行程推播_frontend）
- 6.x 前端設定頁（讀寫 `/api/line/agenda-settings`，含 enabled toggle / 時間 picker / 對象 radio）
- 7.x Eruda 手機除錯工具整合（URL `?eruda=1` + localStorage toggle）
- 8.x 前端 v2.3.0 上線

### 全部 m_b_* 分支同步狀態（v2.2.0 後）
| 分支 | merge 結果 | 備註 |
|---|---|---|
| `m_b_eruda除錯工具` | ✅ 乾淨 merge | 仍建議廢棄（已被 `_推播_frontend` 的 `42a843b` 吸收）|
| `m_b_pwa_upgrade` | ⚠️ **`-X theirs`** | 衝突檔 `openspec/STATUS.md`（採 main 版本，分支自己的 STATUS 改動被覆蓋）— 下次接手該分支時對照 commit `7abb8d2` 補回 |
| `m_b_tag_backend` | ✅ 乾淨 merge | — |
| `m_b_tag_database` | ✅ 乾淨 merge | — |
| `m_b_tag_frontend` | ✅ 乾淨 merge | — |
| `m_b_每日行程推播_backend` | ✅ 乾淨 merge | **保留不刪**，等 frontend 一起砍 |
| `m_b_每日行程推播_frontend` | ✅ 乾淨 merge | 後端 API 已就緒，可開始接 |

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

## 下一步（PC 接手）

### 手機 CCR 已完成 — 交班檢查清單
- [x] v2.2.0 後端 merge → main + push（HEAD `9f18745`）
- [x] CHANGELOG / README / `.claude/context/v2.2.0.md` / OpenSpec STATUS 全更新
- [x] dev 同步 v2.2.0（HEAD `53281ae`，README 衝突手解）
- [x] 7 條 m_b_* 分支同步 main（其中 `m_b_pwa_upgrade` 用 `-X theirs`）
- [x] 機密檢查通過

### PC 端要做的事（按優先順序）

1. **🔥 補建 v2.2.0 tag**（CCR 沙箱拒絕 tag push 403）
   ```bash
   git fetch origin
   git tag v2.2.0 9f18745
   git push origin v2.2.0
   ```
   或 GitHub Web UI：https://github.com/HSUsomnus/KJ-Champion-System/releases/new → Choose tag `v2.2.0` → Target `main` → Publish release

2. **prod 上線驗證**
   - Zeabur Logs 看啟動：預期出現 `system_settings 表已建立 / 已存在` + `每日行程推播 scheduler 已啟動 — time=21:00 / target=developer / enabled=true / TZ=Asia/Taipei`
   - 手動觸發 push（你是 developer，登入正式站後 DevTools fetch）：
     ```js
     fetch('/api/line/push-daily-agenda', {method:'POST',headers:{'x-line-userid':'你的userId'}})
     ```
   - 21:00 自動推播：今晚看你 LINE 是否收到隔日（4/26）行程字卡
   - 若想對齊 dev 行為（23:30 / all），用 `PUT /api/line/agenda-settings` 改設定（**不需開 prod DB 公網**）

3. **後續開發**：`m_b_每日行程推播_frontend`（後端 API 已就緒，前端可接）
   - frontend 上線後一起砍 `m_b_每日行程推播_backend` + `m_b_每日行程推播_frontend`
4. **`m_b_tag_*` 三段式合**（database → backend → frontend）— 但缺 OpenSpec change，建議補 `11-tag-system`
5. **`m_b_pwa_upgrade`** PWA 升級（需實機測 install）— 接手時注意 STATUS.md 被覆蓋的問題（見已知地雷）
6. **`m_b_eruda除錯工具`** 確認是否廢棄（功能已被 `_推播_frontend` 的 `42a843b` 吸收）

### 環境變數提醒
- 本機 `.env` 內 `DATABASE_URL`（prod 公網）日常無效（v2.1.0 起公網關閉）。要做 prod DB 維護需先去 Zeabur 暫開公網
- `DEV_DATABASE_URL`（dev 公網）正常可用
- prod 新密碼存在使用者本機 `.env` 內，未在任何文件 commit
- v2.2.0 不需要新增環境變數；`LINE_CHANNEL_ACCESS_TOKEN` 必須有 push messages 權限（既有 LINE Bot token 已具備）

### Cloudflare Pages prod 部署狀態
- main push（`9f18745`）後自動觸發 build，30-60 秒完成
- PC 待驗證 `https://kj-champion-system.pages.dev` 登入正常 + 推播鏈路通
