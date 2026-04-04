# Change 08: 標籤系統 — Design

## 架構概覽

```
PostgreSQL (Zeabur)
  ├─ tags              ← 標籤定義（名稱、類別、顏色）
  └─ member_tags       ← 成員-標籤多對多關聯

Express.js 後���
  ├─ tagDbService.js   ← DB 操作 + 星等/角色虛擬注入
  └─ tag.js route      ← /api/tags/* + /api/members/:id/tags

React 前端（等 Change 06 後）
  ├�� TagBadge.jsx      ← 彩色 pill badge
  ├─ TagSelector.jsx   ← 多選標籤選擇器
  └─ 頁面整合           ← MemberDetail / Members / Management
```

## 資料庫設計

### tags 表

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | SERIAL PK | |
| name | VARCHAR(100) NOT NULL | 標籤名稱 |
| category | VARCHAR(50) DEFAULT '自訂' | 身份/技能/成就/自訂 |
| color | VARCHAR(7) DEFAULT '#8A8680' | 文字色 HEX |
| bg_color | VARCHAR(7) DEFAULT '#EFEDE9' | 背景色 HEX |
| description | TEXT DEFAULT '' | 說明 |
| is_system | BOOLEAN DEFAULT FALSE | 系統標籤不可刪除 |
| sort_order | INT DEFAULT 0 | 排序 |
| created_by | VARCHAR(255) DEFAULT '' | 建立者 line_id |
| created_at | TIMESTAMPTZ DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ DEFAULT NOW() | |

UNIQUE INDEX on (name, category)

### member_tags 表

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | SERIAL PK | |
| member_line_id | VARCHAR(255) FK→members(line_id) | |
| tag_id | INT FK→tags(id) | |
| assigned_by | VARCHAR(255) DEFAULT '' | 分配者 |
| assigned_at | TIMESTAMPTZ DEFAULT NOW() | |

UNIQUE on (member_line_id, tag_id)

## 星等/角色虛擬注入

不在 DB 建實體記錄。在 `getMemberTags(lineId)` 回傳時，查詢成員的 star_level 和 role，組成虛擬標籤物件附加到陣列前面。

好處：不需維護同步邏輯，star_level/role 改了標籤自動跟著改。

## API 設計

| Method | Path | 權限 | 說明 |
|--------|------|------|------|
| GET | /api/tags | 登入用戶 | 取得標籤列表（?category= 過濾） |
| POST | /api/tags | 管理者+ | 建立標籤 |
| PUT | /api/tags/:id | 管理者+ | 更新標籤 |
| DELETE | /api/tags/:id | 管理者+（非 system） | 刪除標籤 |
| GET | /api/tags/:tagId/members | 管理者+ | 擁有某標籤的成員 |
| GET | /api/members/:lineId/tags | 登入用�� | 成員的所有標籤 |
| POST | /api/members/:lineId/tags | ��理者+ | 分配標籤 { tagId } |
| DELETE | /api/members/:lineId/tags/:tagId | 管理者+ | 移除標籤 |

權限定義：管理者、負責人、開發者均可管理標籤。

## 前端設計（Change 06 合 main 後實作）

- TagBadge：彩色 pill，rounded-full，使用 tag 的 color/bgColor
- TagSelector：多選，依 category 分群，搜尋過濾
- MemberDetail 資料 Tab：姓名下方標籤行
- Members 列表卡片：底部最多 3 個 badge + "+N"
- Management 新增「標籤」Tab：CRUD + 分配
