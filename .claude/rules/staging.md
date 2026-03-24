# Staging Branch Rules — 在 staging 分支時注入

## 你目前在 staging 分支（開發測試環境）

staging = 開發測試，不直接影響正式用戶。
但後端操作仍需謹慎——後端連接的資料庫可能是正式資料。

## ⛔ 後端操作安全閘門

### 第一閘門：需要鏡像測試後端

想修改後端或執行任何 API 寫入操作前：

1. **強制停止**
2. 確認是否已建立**鏡像測試後端**（正式後端的獨立副本）
3. 測試後端未建立 → **停止**，要求先將正式後端鏡像為測試後端再繼續

### 第二閘門：測試完成後的選擇

staging 測試完成，要對接正式後端前：

1. **強制停止**，詢問使用者：
   - **A. 將測試後端推送為正式後端**（正式部署）
   - **B. 棄用測試後端，連接正式後端進行最終驗證**
2. 使用者明確回覆 A 或 B 後才執行

## 版本標籤（每次 push 必做）

```bash
git tag staging-vX.Y.Z
git push --tags
```

> 目的：staging 壞掉時能回到上一個穩定版本

## 不直接 merge 到 main

staging → main 必須走 PR + review，不能直接 merge。

## 前端目錄

- staging 分支的開發前端：`public/`（React 完成前）
- 部署至：Cloudflare Pages（staging 專案：`kj-champion-system.pages.dev`）
