# NOW.md — 當前執行狀態
> 此文件由 Claude Code 自動維護，人工只維護「設計決策」區塊。
> 上下文快滿時輸入 `/打包`，新對話輸入 `/繼續`。

---

## 功能範圍

**2026-04-13：dev 分支格式化**。重置 dev 歷史為 main（v2.0.4），清除 PWA Service Worker 快取錯配造成的 `Qi.getTags is not a function` 錯誤與大量殘留歷史。所有 `m_b_*` 功能分支內容無損失，待重新依序 merge 測試。

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

- **目前分支**：`dev`（剛格式化）
- **main HEAD**：`045cbf9` chore: 補同步規則
- **dev HEAD**：`045cbf9`（= main，2026-04-13 force push 重置）
- **tag 狀態（遠端）**：v2.0.0 ~ v2.0.4 完整
- **遠端 m_b_\* 分支**（全部尚未合入新 dev，等待重新測試）：
  - `m_b_每日行程推播_backend` / `m_b_每日行程推播_frontend`（⚠️ 分支職責混亂，commit 內容對調，需釐清）
  - `m_b_eruda除錯工具`
  - `m_b_pwa_upgrade`
  - `m_b_tag_database` / `m_b_tag_backend` / `m_b_tag_frontend`

### dev 格式化紀錄（2026-04-13）

**原因**：
- `kjcs-dev.pages.dev` 出現 `Qi.getTags is not a function`（PWA Service Worker 快取錯配，api.js 舊版本無 `getTags` 但頁面組件新版本已呼叫）
- dev 累積大量 v1.5.x 以降未上線實驗歷史（雙寫服務、Vercel 轉址、多個 `hotfix/financial-upload-accept` merge、`debug: 暫時加 alert` 殘留）

**執行**：
1. 盤點確認所有實質內容已在 main 或獨立 `m_b_*` 分支，無資料損失
2. `git checkout dev && git reset --hard origin/main`（重置到 `045cbf9`）
3. `git push origin dev --force-with-lease` ✅ 成功
4. 重寫 dev 分支 README（功能分支總表歸零）

**關鍵發現**：
- **CCR 沙箱允許 branch ref 的 force push**（`--force-with-lease`）— 與 NOW.md 原本「CCR 拒絕 force push」的紀錄矛盾，需修正地雷章節
- 目前 CCR 已驗證封鎖：tag 新增、branch 刪除；未封鎖：branch force update

**後續待辦**：
- [ ] 等 Cloudflare Pages 觸發新 deployment（`kjcs-dev`），驗證 bundle hash 刷新 + `Qi.getTags` 錯誤消失
- [ ] 釐清 `m_b_每日行程推播_backend` 與 `_frontend` 分支內容對調問題
- [ ] 逐一重新 merge `m_b_*` 分支到 dev 測試

## 已知地雷

- DEV 後端 `APP_URL` 為 `https://kj-champion-system-dev.zeabur.app`，LINE Console 已加此 callback URL
- 部分成員 avatar 404 是正常的（該成員無頭像），前端有 fallback 顯示姓名首字
- 測試前必須清 Service Worker（DevTools → Application → Service Workers → Unregister）避免舊 SW 快取干擾
- **CCR 沙箱 git 限制（v2.0.4 + 2026-04-13 更新）**：已驗證**拒絕**：tag 新增推送、branch delete（HTTP 403）。已驗證**允許**：branch force update（`--force-with-lease` 或 `--force`）。推完 main 後 Claude 仍須提醒使用者手機或本機手動建 tag + 刪分支。詳見 `.claude/rules/deploy.md` 的「CCR 沙箱 git 限制」章節
- Bash 輸出 `Everything up-to-date` 出現在 403 錯誤之後時不代表成功，必須用 `git ls-remote --tags origin` 驗證
