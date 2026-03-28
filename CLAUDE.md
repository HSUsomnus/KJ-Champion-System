# CLAUDE.md

## 語言

繁體中文（台灣用語）。技術術語可保留英文，但解釋必須用繁體中文。

## 工作流

| 關鍵字 | 動作 |
| ------ | ---- |
| **「新增功能」** | 切分支 + 開 OpenSpec change |
| **「修改計畫」** | 確認分支 → 只動文件 |
| **「執行計畫」** | 確認分支 → 實作程式碼 |
| **「測試功能」** | merge 到 dev |
| **「功能上線」** | merge 到 main，關 change |

詳細規則：`.claude/rules/workflow.md`

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
