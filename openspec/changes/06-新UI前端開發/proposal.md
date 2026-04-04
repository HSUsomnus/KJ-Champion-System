# Proposal — 06 新UI前端開發

## 背景

目前前端為 `public/` 目錄下的 Vanilla HTML/JS 靜態頁面，使用者體驗與視覺設計需要全面翻新。
liff.js 已廢棄，不再使用。本 change 目標：以 React + Vite + PWA 技術棧重建前端。

## 問題 / 需求

- 現有 HTML 頁面樣式老舊，缺乏一致的設計語言
- liff.js 已廢棄，需要新的認證流程整合
- 需要 PWA 支援（手機安裝、離線快取）
- 需要建立統一的設計系統（Design System）確保頁面風格一致

## 目標

- [x] 定義新 UI 設計方向：Warm Minimal（暖調極簡）、圓形元素主視覺、無印風色系
- [x] 建立設計系統文件（`frontend/DESIGN_SYSTEM.md`）
- [ ] 實作所有功能頁面新 UI
- [ ] 串接現有後端 API（替換假資料）
- [ ] 推送 DEV 測試站驗證（API 串接 + UI 完整測試一併進行）
- [ ] 確保 LINE Login OAuth 流程在新 UI 正常運作
- [ ] PWA 安裝與離線快取正常

## 範圍

**In scope：**
- `frontend/` 目錄（React + Vite 新前端）
- 登入頁、主頁（狀態頁）、行事曆頁、成員頁、用戶資料頁、用戶數據頁（新）、財力頁
- PWA manifest + Service Worker
- 手機螢幕適配（375px–430px）

**Out of scope：**
- 後端 API 修改
- 資料庫變動
- 舊 `public/` 目錄刪除（等新版完全驗證後再處理）

## 前置條件

- change 025 完成（正式部署驗證通過）

---

*建立日期：2026-04-01*
*最後更新：2026-04-02*
