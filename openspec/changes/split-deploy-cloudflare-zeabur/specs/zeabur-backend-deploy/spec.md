# Spec: zeabur-backend-deploy

## ADDED Requirements

### Requirement: zbpack.json 部署設定檔

專案根目錄 SHALL 包含 `zbpack.json`，明確指定 Node.js 版本與啟動指令，確保 Zeabur 正確識別並啟動後端服務（而非誤判為靜態前端）。

#### Scenario: Zeabur 使用正確啟動指令

- **WHEN** Zeabur 讀取 `zbpack.json` 並部署專案
- **THEN** 使用 `node server/server.js` 啟動服務，Node.js 版本 ≥ 18

#### Scenario: 不誤判為前端專案

- **WHEN** Zeabur 掃描 monorepo 結構（含 `frontend/` 目錄）
- **THEN** 依據 `zbpack.json` 設定啟動後端，不嘗試部署靜態檔案

### Requirement: 後端 CORS 設定

`server/server.js` 已有 CORS middleware，SHALL 透過 `FRONTEND_URL` 環境變數允許 Cloudflare Pages 網域，無需修改程式碼。

#### Scenario: Cloudflare Pages 來源允許

- **WHEN** Cloudflare Pages 前端發送帶有 `Origin: https://<project>.pages.dev` 的 API 請求
- **THEN** 後端回應包含正確的 `Access-Control-Allow-Origin` header，請求成功

#### Scenario: OPTIONS preflight 請求正確回應

- **WHEN** 瀏覽器發送 CORS preflight OPTIONS 請求
- **THEN** 後端回應 200 並包含必要的 CORS headers

#### Scenario: 本地開發環境不受影響

- **WHEN** 本地開發時從 `http://localhost:8080` 發送 API 請求
- **THEN** CORS 設定允許此來源，開發流程正常

### Requirement: 環境變數完整性

所有後端服務 SHALL 透過 `process.env` 讀取敏感設定。`env.example` SHALL 列出 Zeabur 部署所需的全部環境變數，含 `FRONTEND_URL`（Cloudflare Pages URL）與 `APP_URL`（Zeabur 後端 URL）。

#### Scenario: env.example 涵蓋所有必要變數

- **WHEN** 開發者對照 `env.example` 在 Zeabur 控制台設定環境變數
- **THEN** 後端服務正常啟動並連接所有外部服務（Supabase、Google API、LINE）

### Requirement: LINE OAuth 回調 URL 相容性

LINE Developer Console 中的 Callback URL SHALL 包含 Zeabur 後端網域。

#### Scenario: LINE OAuth 登入成功

- **WHEN** 使用者完成 LINE OAuth 授權，被重導向至 `https://<zeabur-backend>/api/auth/callback`
- **THEN** 後端正確處理回調，前端完成登入流程
