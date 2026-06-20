# Spec: 025-html-production-deploy

> ✅ DONE

## 背景與範圍

02 已驗證 staging 前後端串接完整可用。在進入設計稿（03）與 React 重寫（04）之前，先將當前 HTML 版本正式部署到 main，讓正式用戶用上新架構。同時清空 staging 的後端與資料庫連線，讓 staging 回到乾淨狀態，專注新前端開發。

### 三個步驟

1. **staging → main 正式部署**：git merge、Zeabur 正式後端、LINE Console、Cloudflare Pages 切換
2. **驗證 main 正式環境**：API、DB、LINE Login 完整流程
3. **清空 staging，準備新前端開發**：停止 Zeabur staging 後端、清除連線設定

### 與 05 的關係

05 維持原計畫，作為 React 前端完成後的第二次正式切換（切換至 React 版本 + 自定義網域 DNS）。

---

## 技術設計

### 目標架構

```
main branch
  └─ Cloudflare Pages (kj-champion-system.pages.dev, Production)
  └─ Zeabur 後端 (監聽 main，正式服務)
  └─ Zeabur PostgreSQL (同一個，正式資料)

staging branch（完成後）
  └─ Cloudflare Pages (Preview，供新前端開發預覽)
  └─ 無獨立後端、無獨立 DB 連線
```

### 關鍵步驟

- **Step 3**：LINE Console 新增正式 Callback URL：`https://kj-champion-system.pages.dev/api/auth/line-callback`
- **Step 4**：Cloudflare Pages Production branch 改為 `main`，Preview branch 保留 `staging`

### 風險處理

| 風險 | 處理方式 |
|------|----------|
| main 驗證失敗 | Production branch 切回 staging |
| DB 資料被測試污染 | 驗證時使用非破壞性操作，測試後清除 |
| LINE Callback URL 衝突 | staging 與 main 共用 pages.dev，不衝突 |
