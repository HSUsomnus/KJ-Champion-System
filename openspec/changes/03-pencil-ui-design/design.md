# Design: 03-pencil-ui-design

> ⬜ 待開始，細節在執行時補充

## 工具選擇：Pencil

使用 Pencil MCP 工具設計 `.pen` 檔，可直接在 Claude Code 環境內操作，不需切換外部工具。

## 待設計頁面清單

從 `public/` 盤點（執行時確認）：

| 頁面 | 檔案 | 狀態 |
| --- | --- | --- |
| 主頁（月曆） | `index.html` | 待設計 |
| 列表模式 | `list.html` | 待設計 |
| 新增行程 | `add-event.html` | 待設計 |
| 行程詳情 | `event-detail.html` | 待設計 |
| 成員列表 | `members.html` | 待設計 |
| 成員詳情 | `member-detail.html` | 待設計 |
| 個人資料 | `profile.html` | 待設計 |
| 管理後台 | `management.html` | 待設計 |
| 財務上傳 | `financial-upload.html` | 待設計 |
| 財務預覽 | `financial-preview.html` | 待設計 |
| 邀請分享 | `invite-share.html` | 待設計 |

## API 對齊原則

設計時每個頁面須確認：
- 顯示的資料欄位與後端 API 回傳一致
- 操作行為（新增/刪除/更新）對應正確的 API endpoint
- 錯誤狀態的 UI 處理方式
