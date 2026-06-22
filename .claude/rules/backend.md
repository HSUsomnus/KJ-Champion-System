# Backend Rules — 觸碰 server/* 時注入

## 修改後必做

修改 `server/` 任何檔案後，**必須提醒使用者重啟本機伺服器**。

## 目錄結構

- 主入口：`server/server.js`
- 後端路由：`server/routes/`
- 業務邏輯：`server/services/`

## API 路由規範

| 前綴 | 說明 |
| --- | --- |
| `/api/calendar/*` | 行事曆（Google Calendar + 本地 DB，raw https.request） |
| `/api/members/*` | 成員管理（update-roles：負責人或開發者可操作） |
| `/api/profile/*` | 個人資料（含 sync-avatar） |
| `/api/line/*` | LINE BOT 整合、每日推播 API、系統連結（`system-links`） |
| `/api/auth/*` | LINE Login OAuth |
| `/api/financial/*` | 財務（限 manager 角色） |
| `/api/debug/*` | 後端自檢（`GET /api/debug/health`：Google Auth + DB 連線六步驟） |
| `/api/admin/*` | Admin 操作（Bearer token 保護）：sync-prod-to-backup / export-backup-csv / backup-status |

## 登入機制（後端部分）

- LINE Login OAuth 回調：`server/routes/auth.js`
- callback 後 redirect 使用 `FRONTEND_URL + returnUrl`
- 不依賴 LIFF SDK
