# Frontend Rules — 觸碰 public/* 時注入

## 當前前端目錄（依分支）

| 分支 | 前端目錄 | 說明 |
| --- | --- | --- |
| main | `public/` | 正式上線版本，謹慎修改 |
| staging | `public/` | 開發測試版本 |

> `frontend/` 目錄目前不存在。未來 React 完成後在 staging 建立，屆時此規則更新。

## 修改前確認

1. 確認當前分支（`git branch --show-current`）
2. **main 分支**：強烈警告，修改直接影響正式上線用戶
3. **staging 分支**：正常開發流程

## 目錄規則

- 所有前端修改在 `public/` 目錄
- 開發模式測試：`http://localhost:8080?dev=1`（自動模擬登入）
- 未登入測試：清除 localStorage 的 `lineUserId` 再重整

## 登入機制

- 正式登入：LINE Login OAuth（不依賴 LIFF SDK）
- 本機測試：URL 帶 `?dev=1` 自動模擬登入
- 核心檔案：`public/js/liff.js`（自製 `window.LIFF` 介面）

## 分享機制

- 手機：LINE URL Scheme（`https://line.me/R/share?text=...`）
- 電腦：Web Share API 或複製到剪貼簿
