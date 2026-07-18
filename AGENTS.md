# AGENTS.md — Codex CLI 在 KJ-Champion-System 的工作規則

> 本檔給在 VPS 上透過 Codex CLI 執行的 agent 讀。Claude Code 讀 CLAUDE.md，Codex 讀本檔。
> 分工：Claude 做架構決策 + 寫 spec，Codex 做機械性全端執行；判斷力留在 Claude 與使用者手上。

## 語言

- 一律繁體中文（台灣用語）回報；技術術語可英文。

## 失敗停損（核心 — 防燒 ChatGPT Plus 額度）

- 同一個測試 / 同一個錯誤連續失敗 2 次即停手。
- 停手時列出：試了什麼 / 完整報錯 / 三個可能假設 → 交使用者決定，不盲目再試第 3 次。

## 動手前紀律

- 先讀報錯、講出 root cause 才准改；禁止亂槍打鳥式修改。
- 不假設 API / 套件用法：先 grep 現有 code 或查官方 doc 確認再寫。

## 測試紀律

- 測試範圍最小化：改哪個模組只跑那個模組的測試。
- 全套測試只在 commit 前跑一次（全套測試化為後續 change 移 GitHub Actions，屆時本地只快驗）。
- context 控制：貼測試輸出只留失敗部分，不整包倒。

## Git 鐵律（與 CLAUDE.md 對齊，違反等同破壞專案）

- 禁止在 main 直接 commit 功能程式碼（server/、frontend/、package.json、部署設定、migrations）。
- 禁止 git add -A / git add .，一律指定具體檔案。
- 功能分支命名 m_b_*，必須推遠端；merge 進 main 一律 --no-ff。
- prod / backup DB 任何寫入，需使用者明確確認。

## 分支與流程

- 新功能走 m_b_* 分支（完整流程見 .claude/skills/workflow）。
- 改 server/ 後提醒使用者重啟本機伺服器。

## 環境地雷（VPS / Zeabur）

- 沙箱 npm test / npm run dev 可能不可用時，改走部署驗證（打 /api/debug/health）。
- Zeabur googleapis/gaxios 壞掉、prod DB 公網預設關閉等，詳見 .claude/now.md「已知地雷」。

## 邊界（Codex 不做的事）

- 不做架構決策、不改 spec.md（那是 Claude + 使用者的職責）。
- 遇到「要不要這樣設計」的判斷題時停下問，不自行拍板。
