-- 標籤系統：tags 定義表 + member_tags 多對多關聯表
-- Change 08: 標籤核心系統

-- ============================================================
-- 標籤定義表 (tags)
-- category 可選值：身份、技能、成就、自訂
-- is_system = true 的標籤不可被管理者刪除
-- ============================================================
CREATE TABLE IF NOT EXISTS tags (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  category      VARCHAR(50) NOT NULL DEFAULT '自訂',
  color         VARCHAR(7) NOT NULL DEFAULT '#8A8680',
  bg_color      VARCHAR(7) NOT NULL DEFAULT '#EFEDE9',
  description   TEXT DEFAULT '',
  is_system     BOOLEAN DEFAULT FALSE,
  sort_order    INT DEFAULT 0,
  created_by    VARCHAR(255) DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 同名同類別不可重複
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_name_category
  ON tags(name, category);

-- 依類別查詢
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);

COMMENT ON TABLE tags IS '標籤定義表';
COMMENT ON COLUMN tags.category IS '標籤類別：身份、技能、成就、自訂';
COMMENT ON COLUMN tags.is_system IS '系統標籤不可被管理者刪除';
COMMENT ON COLUMN tags.color IS '文字色 HEX（如 #4A7C59）';
COMMENT ON COLUMN tags.bg_color IS '背景色 HEX（如 #E8F0EB）';

-- ============================================================
-- 成員-標籤多對多關聯表 (member_tags)
-- ============================================================
CREATE TABLE IF NOT EXISTS member_tags (
  id              SERIAL PRIMARY KEY,
  member_line_id  VARCHAR(255) NOT NULL REFERENCES members(line_id) ON DELETE CASCADE,
  tag_id          INT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  assigned_by     VARCHAR(255) DEFAULT '',
  assigned_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_line_id, tag_id)
);

-- 查詢某成員的所有標籤
CREATE INDEX IF NOT EXISTS idx_member_tags_member ON member_tags(member_line_id);

-- 查詢擁有某標籤的所有成員
CREATE INDEX IF NOT EXISTS idx_member_tags_tag ON member_tags(tag_id);

COMMENT ON TABLE member_tags IS '成員-標籤多對多關聯表';
COMMENT ON COLUMN member_tags.assigned_by IS '分配此標籤的管理者 LINE ID';
