# Spec: 03-pencil-ui-design

> ✅ DONE（設計稿已確認，06 新UI前端開發已完成）

## 背景與範圍

React 重寫工程量大，若沒有確定的設計稿就開始寫程式碼，容易在做到一半時發現 UX 問題，導致大量返工。設計先行的目的：

- 確認所有頁面的跳轉關係，避免遺漏頁面
- 與後端 API 對齊，確認資料欄位與互動流程一致
- 讓使用者在「畫面」層確認，而不是在「程式碼」層確認

### 進入下一階段條件

設計稿確認鎖定 → 進入 04-react-vite-pwa-frontend

---

## 技術設計

### 工具

使用 Pencil MCP 工具設計 `.pen` 檔，可直接在 Claude Code 環境內操作，不需切換外部工具。

### 待設計頁面（從 `public/` 盤點）

| 頁面 | 對應檔案 |
| --- | --- |
| 主頁（月曆） | `index.html` |
| 列表模式 | `list.html` |
| 新增行程 | `add-event.html` |
| 行程詳情 | `event-detail.html` |
| 成員列表 | `members.html` |
| 成員詳情 | `member-detail.html` |
| 個人資料 | `profile.html` |
| 管理後台 | `management.html` |
| 財務上傳 | `financial-upload.html` |
| 財務預覽 | `financial-preview.html` |
| 邀請分享 | `invite-share.html` |

### API 對齊原則

設計時每個頁面須確認：顯示欄位與後端 API 回傳一致、操作行為對應正確 API endpoint、錯誤狀態 UI 處理方式。
