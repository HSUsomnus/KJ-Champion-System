# CHANGELOG

版本索引（輕量）。每版詳細上下文：`.claude/context/vX.Y.Z.md`

規則：只在頂部新增，舊版永遠保留。版本號與 git tag 對應。

---

## [v2.0.1] - 2026-04-04

git tag: v2.0.1
摘要：Vercel 全站 301 轉址到 Cloudflare Pages — 舊 Vercel 網址自動跳轉至 `kj-champion-system.pages.dev`，確保團隊成員使用固定入口

---

## [v2.0.0] - 2026-04-04

git tag: v2.0.0
摘要：全新 React 前端上線 — React 18 + Vite 5 + Tailwind CSS（Warm Minimal 風格），取代舊純 HTML+JS 前端（`public/` 已刪除），前端目錄改為 `frontend/`；含完整頁面重建、React Router SPA、Vite PWA、LINE Login 整合

---

## [v1.6.0] - 2026-04-04

git tag: v1.6.0
摘要：後端 OAuth 動態 redirect — LINE Login callback 自動偵測前端 origin（從 Origin/Referer header），通過白名單驗證後 redirect 回發起登入的前端站，解決 DEV/正式站登入後混跳問題

---

## [v1.5.7] - 2026-03-28

git tag: v1.5.7
摘要：重構 .claude/rules/——合併 core.md + global.md 為 workflow.md，整合 OpenSpec 工作流與 git 分支流程，加入修改/執行計畫前強制確認分支的安全閘門；更新 CLAUDE.md 工作流摘要

---

## [v1.5.6] - 2026-03-22

git tag: v1.5.6
摘要：清理 .env 死碼（移除 ADMIN_LINE_USER_IDS、DUAL_WRITE_ENABLED、SUPABASE_BACKUP_URL、Google API 分拆舊變數）、補齊 FRONTEND_URL 與 CRON_SECRET；新增 Claude Code hooks（openspec-code-guard、openspec-sync-reminder）；同步 OpenSpec 文件

---

## [v1.5.5] - 2026-03-22

git tag: v1.5.5
摘要：清理 Google Sheets 死碼——刪除已廢棄的 sheetService.js、移除 googleAuth.js 中的 getSheetsClient/getSheetConfig/spreadsheets scope，並將 financial.js 中語意錯誤的 MEMBER_SHEET_ID 改名為 FINANCIAL_SHEET_ID

---

## [v1.5.4] - 2026-03-22

git tag: v1.5.4
摘要：移除雙寫服務（dualWriteService）——eventDbService 與 memberDbService 的寫入改回直接 db.query，Supabase 不再接收任何寫入；同步更新 OpenSpec 文件與 staging README

---

## [v1.5.3] - 2026-03-22

git tag: v1.5.3
摘要：修復 Supabase 雙寫失效問題——補回 staging 分支遺漏的 dualWriteService.js，使新增/更新/刪除行程能正確同步至 Supabase 備份庫

---

## [v1.5.2] - 2026-03-18

git tag: v1.5.2
摘要：建立 staging 分支部署架構，後端遷移至 Zeabur + 前端遷移至 Cloudflare Pages（Task 1 完成：zbpack.json、env.example 更新、CORS 白名單、DB 連線池環境感知、資料庫備份腳本）

---

## [v1.5.1] - 2026-03-15

git tag: v1.5.1
摘要：新增行程分類「紫星行程聊聊」（紫色，Google Calendar Grape 色，含提示詞）

---

## [v1.5.0] - 2026-03-15

git tag: v1.5.0
摘要：整合 ngrok 本機開發工具、加入 concurrently 同步啟動腳本、重寫全部說明文件（README、QUICKSTART、DEPLOYMENT、ngrok 指南）

---

## [v1.4.0] - 2026-03-10

git tag: v1.4.0
摘要：移除廢棄 React 前端、開放 manager 財務頁籤、行程分享改純文字、邀請字卡按鈕 3 改走 open-external 中介頁

---

## [v1.3.0] - 2026-03-08

git tag: v1.3.0
摘要：詳見 `.claude/context/v1.3.0.md`

---

## [v1.2.0] - 2026-03-06

git tag: v1.2.0
摘要：詳見 `.claude/context/v1.2.0.md`

---

## [v1.1.0] - 2026-03-04

git tag: v1.1.0
摘要：詳見 `.claude/context/v1.1.0.md`

---

## [v1.0.0] - 2026-03-01

git tag: v1.0.0
摘要：詳見 `.claude/context/v1.0.0.md`
