# CHANGELOG

版本索引（輕量）。每版詳細上下文：`.claude/context/vX.Y.Z.md`

規則：只在頂部新增。近 5 版保留完整摘要，更早版本壓縮為一行索引
（`## [vX.Y.Z] - 日期 — 一句話標題（詳見 .claude/context/vX.Y.Z.md）`）。版本號與 git tag 對應。

---

## [v2.12.0] - 2026-07-10

git tag: v2.12.0
摘要：change 23「模型分層工作證」— 新增三層角色邊界系統。`.claude/commands/` 新增 `規劃.md`、`實作.md` 兩個打卡 command（Opus/Fable 規劃角色、Sonnet 實作角色），`.claude/agents/` 新增 `收尾員.md` Haiku 功能上線收尾子代理（負責 CHANGELOG / context / now.md / tag 指令）。`.claude/hooks/role-guard.js` 讀 `.claude/.session-role` 標記，deny 攔截 planner 角色寫產品碼、engineer 角色執行 `git tag` / push main；無標記完全不影響既有行為。`.claude/hooks/lang-reminder.js` 在 `UserPromptSubmit` 每回合注入繁體中文回報提醒，強化語言紀律三層治理。CLAUDE.md 新增「Session 角色」小節與語言鐵律一行；workflow / deploy-release skill 補述角色建議與收尾員說明、commit trailer 慣例。`.gitignore` 加入 `.claude/.session-role`。純 `.claude/` 基礎設施變更，無產品程式碼異動。

---

## [v2.11.0] - 2026-07-10

git tag: v2.11.0
摘要：change 22「規則體系重構與 Token 降本」— 常駐規則 token 從 ~19,000 降到 ~2,453。`.claude/rules/*.md`（8 個規則檔）改造為 `.claude/skills/`（uidesign / deploy-release / database / workflow 四個 skill），依情境自動載入取代常駐全文。git-guard.js hook 從純警告升級為 `permissionDecision: deny` 硬攔截（main 直接 commit 產品碼、`git add -A`/`git add .`、commit message 缺型別前綴三類），另加 `m_b_*` commit 未同步 tasks.md 的警告提醒。新增 `scripts/sync-branches.sh` 作為 main→全 `m_b_*` 分支同步的唯一事實來源（取代 deploy.md / workflow.md / post-push-sync.js 三處重複腳本），衝突處理改為預設停下回報、`SYNC_STRATEGY=theirs` 作為明確手動開關（不再自動覆蓋分支內容）。README 全分支強制重寫規則降級為「僅功能上線 merge main 時」。刪除 `.cursorrules`、`.claude/RULES-MAP.md`、`openspec/changes/` 下 17 個已完成 change 資料夾，`openspec/changes/` 改名為根目錄 `changes/`（去 OpenSpec 工具品牌化）。`docs/` 底下 19 份 Vercel/Supabase/ngrok/LIFF 時代過時文件歸檔至 `docs/archive/`。

---

## [v2.10.1] - 2026-06-22

git tag: v2.10.1
摘要：hotfix — 主頁財力金額顯示「$非數值」。`financial_amount` 欄位存的是自由文字（如「1700萬」），`Number('1700萬')` 回傳 NaN，`toLocaleString()` 在中文 locale 渲染為「非數值」。修法：直接顯示原始字串，不做任何數值轉換。

---

## [v2.10.0] - 2026-06-22

git tag: v2.10.0
摘要：change 19「主頁快捷資訊」— 主頁歡迎區塊改為卡片，右側整合財力金額（空值顯示「尚未填寫」灰字）與「上傳財力」按鈕。新增系統連結區三個圖示方塊（LINE 事業部小幫手、康九冠軍 google 日曆、安裝到手機/PC），連結 URL 透過新後端 API `GET /api/line/system-links` 取得。PWA 安裝按鈕依狀態彈出 dialog（已安裝／不支援瀏覽器兩種訊息，手機與 PC 文案不同）。今日行程保留並移至系統連結下方。`main.jsx` 在 React render 前預攔截 `beforeinstallprompt` 事件解決 useEffect 太晚問題。

---

## [v2.9.0] - 2026-06-22

git tag: v2.9.0
摘要：change 18「桌機版面置中」— 桌機橫式螢幕以手機直式欄框居中顯示。`main.jsx` 於 React render 前同步執行 `pickColWidth()`，依視窗寬高比判斷手機/桌機（≤ 9/16 為手機直接全寬，否則從視窗高度反推最接近 430px 的標準比例），寫入 `--col-max-w` / `--col-half-w` CSS 變數（session 固定）。`Layout.jsx` 欄位加 `width:100%` 修正 `#root { display:flex; flex-direction:column }` 環境下 flex item 需顯式設寬才填滿 `maxWidth` 的 bug。`FabAction.jsx` 與 `SidebarNav.jsx` 漢堡按鈕改用 `max(16px, calc(50vw - var(--col-half-w) + 16px))` 跟隨欄位邊緣。`Management.jsx` pill tab 從 inline px 改 Tailwind rem 確保值一致。

---

## [v2.8.1] - 2026-06-21

git tag: v2.8.1
摘要：hotfix — `package.json engines` 加入 `"npm": "10"`，繞過 Zeabur 基礎映像 `promise-retry` 缺失 bug（`npm update -g npm` 在新映像失敗）。Zeabur 偵測到 npm 版本約束後改執行 `npm install -f -g npm@10`，build 恢復正常。

---

## [v2.8.0] - 2026-06-21 — change 17「SidebarNav UI 重構」：管理者後台入口 + pill tab 統一樣式（詳見 .claude/context/v2.8.0.md）

## [v2.7.0] - 2026-06-21 — change 16「備份 DB 同步」：新增 backup DB + dev DB、定時全量覆蓋（詳見 .claude/context/v2.7.0.md）

## [v2.6.0] - 2026-06-21 — change 15「用戶資料整合」：個人資料/數據/財力合併為單一 /profile 頁（詳見 .claude/context/v2.6.0.md）

## [v2.5.0] - 2026-06-21 — change 14「側邊欄導覽」：Header + FabNav 改為左側抽屜式 SidebarNav（詳見 .claude/context/v2.5.0.md）

## [v2.4.0] - 2026-06-21 — change 13「定時同步Calendar」：node-cron 同步 + 移除 googleapis/gaxios（詳見 .claude/context/v2.4.0.md）

## [v2.3.1] - 2026-06-20 — hotfix：`public/` 不存在時 ENOENT 500（詳見 .claude/context/v2.3.1.md）

## [v2.3.0] - 2026-04-26 — change 09「每日行程推播」前端收尾 + Eruda 整合（詳見 .claude/context/v2.3.0.md）

## [v2.2.1] - 2026-04-25 — hotfix：EventDetail 補刪除 FAB（詳見 .claude/context/v2.2.1.md）

## [v2.2.0] - 2026-04-25 — 每日行程推播 LINE Bot 後端（change 09 後端部分）（詳見 .claude/context/v2.2.0.md）

## [v2.1.0] - 2026-04-25 — change 10「Zeabur 專案分離」上線，prod/dev 跨專案物理隔離（詳見 .claude/context/v2.1.0.md）

## [v2.0.8] - 2026-04-25 — hotfix：onboarding 完成後導主頁（詳見 .claude/context/v2.0.8.md）

## [v2.0.7] - 2026-04-25 — hotfix：新用戶 onboarding 強制流程修補（詳見 .claude/context/v2.0.7.md）

## [v2.0.6] - 2026-04-25 — hotfix：Login useEffect navigate race condition（詳見 .claude/context/v2.0.6.md）

## [v2.0.5] - 2026-04-25 — hotfix：首次登入「建立資料」死循環（詳見 .claude/context/v2.0.5.md）

## [v2.0.4] - 2026-04-13 — hotfix：新增行程兩個 UX bug（詳見 .claude/context/v2.0.4.md）

## [v2.0.3] - 2026-04-12 — hotfix：`_worker.js` 依 Pages 網址自動路由後端（詳見 .claude/context/v2.0.3.md）

## [v2.0.2] - 2026-04-06 — 修復試算表預覽顏色不正確（詳見 .claude/context/v2.0.2.md）

## [v2.0.1] - 2026-04-04 — Vercel 全站 301 轉址到 Cloudflare Pages（詳見 .claude/context/v2.0.1.md）

## [v2.0.0] - 2026-04-04 — 全新 React 前端上線，取代舊純 HTML+JS 前端（詳見 .claude/context/v2.0.0.md）

## [v1.6.0] - 2026-04-04 — 後端 OAuth 動態 redirect（詳見 .claude/context/v1.6.0.md）

## [v1.5.7] - 2026-03-28 — 重構 .claude/rules，合併為 workflow.md（詳見 .claude/context/v1.5.7.md）

## [v1.5.6] - 2026-03-22 — 清理 .env 死碼 + 新增 Claude Code hooks（詳見 .claude/context/v1.5.6.md）

## [v1.5.5] - 2026-03-22 — 清理 Google Sheets 死碼（詳見 .claude/context/v1.5.5.md）

## [v1.5.4] - 2026-03-22 — 移除雙寫服務（dualWriteService）（詳見 .claude/context/v1.5.4.md）

## [v1.5.3] - 2026-03-22 — 修復 Supabase 雙寫失效問題（詳見 .claude/context/v1.5.3.md）

## [v1.5.2] - 2026-03-18 — 建立 staging 分支部署架構（Zeabur + Cloudflare Pages）（詳見 .claude/context/v1.5.2.md）

## [v1.5.1] - 2026-03-15 — 新增行程分類「紫星行程聊聊」（詳見 .claude/context/v1.5.1.md）

## [v1.5.0] - 2026-03-15 — 整合 ngrok 本機開發工具（詳見 .claude/context/v1.5.0.md）

## [v1.4.0] - 2026-03-10 — 移除廢棄 React 前端、開放 manager 財務頁籤（詳見 .claude/context/v1.4.0.md）

## [v1.3.0] - 2026-03-08 — 詳見 .claude/context/v1.3.0.md

## [v1.2.0] - 2026-03-06 — 詳見 .claude/context/v1.2.0.md

## [v1.1.0] - 2026-03-04 — 詳見 .claude/context/v1.1.0.md

## [v1.0.0] - 2026-03-01 — 詳見 .claude/context/v1.0.0.md
