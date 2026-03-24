# KJ-Champion 專案討論 Context

> 用於 Claude Web Chat / 手機腦力激盪。
> 聚焦架構與方向，不含程式碼細節。
> 語言：繁體中文。

---

## 專案是什麼

**KJ-Champion**（前名 Line_Liff）是一套 LINE 整合的行事曆與團隊管理系統。
使用者角色：admin / manager / 一般成員（學員）。

核心功能：月曆行程、成員管理、財務報表、LINE 邀請字卡分享。
行程分類：學員上課、活動、諮詢簽約、紫星聊聊。

---

## 目前技術架構

| 層 | 技術 | 現況 |
|----|------|------|
| 前端（正式）| 純 HTML + 原生 JS | `public/` 目錄，無框架 |
| 前端（staging）| React + Vite + PWA | `frontend/`，開發中 |
| 後端 | Node.js + Express | `server/` 目錄 |
| 主資料庫 | Zeabur PostgreSQL | 已從 Supabase 遷移完成 |
| 行事曆 | Google Calendar API | 行程 CRUD |
| 報表 | Google Sheets API | 財務資料 |
| 身份驗證 | LINE Login OAuth | 自製（不用 LIFF SDK）|

---

## 部署遷移（三階段，進行中）

```
main（正式）：Vercel 前端 + Vercel 後端 → DB 已切 Zeabur + 雙寫備份至 Supabase
staging：Cloudflare Pages 前端（開發中）+ Zeabur 後端（待部署）

遷移順序：
✅ 第一階段：DB 切 Zeabur + 雙寫上線
⬜ 第二階段：後端平台 Vercel → Zeabur
⬜ 第三階段：前端 Vercel → Cloudflare Pages，Supabase 退場
```

---

## AI 工具鏈（規範式開發 Spec-Driven Development）

三個工具各司其職，串成完整工作流：

### Design OS（策略設計期）
- Brian Casel 的工具，產品想法 → 結構化設計規格
- 產出：願景文件、資料模型、UI 元件規格、TypeScript interfaces

### Pencil.dev（視覺設計期）
- IDE 內的 Infinite Canvas，在 VSCode / Cursor 裡直接設計
- 透過 MCP 直連 Claude Code，`.pen` 設計檔住在 Git repo（版本控制）
- 支援 Figma 複製貼上，設計 ↔ Code 雙向同步

### OpenSpec（實作規格期）
- 每個 feature 生命週期：proposal → design → specs → tasks → archive
- Claude Code 照 spec 實作，決策永久歸檔
- 支援 Claude Code、Cursor 等 20+ AI 工具

### 串接流程
```
Design OS（產品願景、資料模型）
  ↓
Pencil.dev（視覺設計 → React 元件，MCP 直連 Claude Code）
  ↓
OpenSpec（proposal → tasks → 實作 → 歸檔）
  ↓
CLAUDE.md / project-chat-context.md（重要決策累積，跨 session 記憶）
```

---

## 未來可能方向（開放討論）

- **前端升級**：staging 的 React + Vite + PWA 切正式後，前端能力大幅提升
- **PWA 離線支援**：行事曆離線可用，手機體驗接近 App
- **LINE BOT 推播**：行程提醒通知
- **AI 功能**：行程建議、摘要、自動分類
- **多組織 SaaS**：目前單一團隊，是否擴展為多租戶
- **Design OS 正式整入**：設計規格流程化，提升 feature 開發品質

---

## 討論角色設定

你是這個專案的架構思考夥伴。
- 從高層次討論架構取捨、工具選擇、方向優先序
- 靈感來了幫我快速評估可行性與影響範圍
- 不需要看程式碼，概念討論為主
- 重要結論我會手動更新回此文件與 CLAUDE.md

## 文件架構決策（2026-03）

### 問題
task.md 承擔過多職責（執行清單 + 儀表板 + 需求輸入），
導致三份文件互相污染，Claude Code 產生幻覺，反工頻繁。

### 解法
各文件職責明確分離：

| 文件 | 職責 |
|------|------|
| STATUS.md | Mermaid 儀表板，確認流程位置，只看不寫 |
| proposal.md | 計畫變更起點，說明原因與範圍 |
| design.md | 設計決策 |
| task.md | 執行清單，最後產生，不是起點 |

### 工作流
1. 看 STATUS.md 確認位置
2. 對話框說一句話
3. Claude Code 自動依序更新四個檔案

### 關鍵原則
修改計畫永遠從 proposal 開始，task 永遠最後更新。
