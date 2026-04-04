# Change 08: 標籤系統 — Tasks

## 分支 1: m_b_tag_database

- [x] **08-db.1** 撰寫 create_tags.sql migration（tags + member_tags 表）
  - 檔案：`server/migrations/create_tags.sql`
- [ ] **08-db.2** 在測試 DB 執行 migration 驗證

## 分支 2: m_b_tag_backend

- [ ] **08-api.1** 建立 tagDbService.js（標籤 CRUD + 成員標籤 + 虛擬注入）
  - 檔案：`server/services/tagDbService.js`
- [ ] **08-api.2** 建立 tag.js route（/api/tags/* + /api/members/:lineId/tags）
  - 檔案：`server/routes/tag.js`
- [ ] **08-api.3** server.js 掛載 tag route
  - 檔案：`server/server.js`
- [ ] **08-api.4** API 端點測試（curl/Postman 驗證 CRUD + 權限）

## 分支 3: m_b_tag_frontend（等 Change 06 合 main 後）

- [ ] **08-ui.1** api.js 新增 tags API 方法
- [ ] **08-ui.2** 建立 TagBadge 元件
- [ ] **08-ui.3** 建立 TagSelector 元件
- [ ] **08-ui.4** MemberDetail 資料 Tab 顯示標籤
- [ ] **08-ui.5** Members 列表卡片顯示標籤
- [ ] **08-ui.6** Management 新增「標籤」管理 Tab
