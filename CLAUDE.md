# CLAUDE.md

## 語言

繁體中文（台灣用語）。技術術語可保留英文，但解釋必須用繁體中文。

## 工作流

- **「修改計畫」** → 只動文件（proposal → design → tasks → STATUS）
- **「執行計畫」** → 才可動程式碼（讀 STATUS → 讀 tasks → 實作 → 更新）

詳細規則由 Hook 在需要時自動注入（`.claude/rules/`）。

## 推送前必做（摘要）

機密檢查 + README 完整重寫 + 使用者確認。
詳細步驟見 `.claude/rules/deploy.md`。

## 版本記憶

版本索引：`CHANGELOG.md`，詳細上下文：`.claude/context/vX.Y.Z.md`

## 關鍵檔案

| 檔案 | 說明 |
| --- | --- |
| `public/js/liff.js` | LINE Login + window.LIFF 介面 |
| `server/server.js` | Express 主入口 |
| `server/routes/auth.js` | LINE OAuth 回調 |
| `openspec/STATUS.md` | OpenSpec 狀態儀表板 |
