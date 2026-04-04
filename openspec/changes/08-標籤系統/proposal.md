# Change 08: 標籤核心系統

## 問題

目前成員資料只有 `role`（角色）和 `star_level`（星等）兩個分類維度，無法靈活地為成員貼上多維度標籤。需要一個通用標籤系統支援：

- 為成員標記身份、技能、成就等多維度標籤
- 管理者可建立和分配自訂標籤
- UI 上用彩色標籤一目了然呈現成員資訊
- 未來擴展：行程參與者標記、基於標籤的權限控制、成就簽到

## 目標

建立標籤核心系統（DB + Backend + Frontend），分三個獨立分支開發：

1. `m_b_tag_database` — 資料庫 migration（tags + member_tags 表）
2. `m_b_tag_backend` — API 路由 + Service 層
3. `m_b_tag_frontend` — UI 元件 + 頁面修改（等 Change 06 新 UI 合 main 後再開）

## 範圍

### 包含

- tags 標籤定義表（名稱、類別、顏色、系統標籤旗標）
- member_tags 成員-標籤多對多關聯表
- 標籤 CRUD API（管理者以上可管理）
- 成員標籤分配/移除 API
- 星等和角色在 API 層虛擬注入為唯讀系統標籤
- 前端標籤元件（TagBadge、TagSelector）
- 成員詳情/列表頁標籤顯示
- 管理介面標籤管理 Tab

### 不包含

- 行程參與者（Change 09）
- 成就簽到系統（Change 10）
- 基於標籤的功能權限控制

## 合併策略

三支各自開發完合到 dev 聯合測試，全部通過後依序合 main：
database → backend → frontend
