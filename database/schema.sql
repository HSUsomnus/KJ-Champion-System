-- Supabase PostgreSQL Schema
-- LINE LIFF 行事曆應用程式資料庫結構

-- ============================================================
-- 成員表 (members)
-- 對應原 Google Sheets「成員資料」A～L 欄
-- ============================================================

CREATE TABLE IF NOT EXISTS members (
  id               SERIAL PRIMARY KEY,
  line_id          VARCHAR(255) NOT NULL UNIQUE,
  name             VARCHAR(255) NOT NULL,
  email            VARCHAR(255) DEFAULT '',
  phone            VARCHAR(50) DEFAULT '',
  star_level       VARCHAR(50) DEFAULT '白星',
  course_record    TEXT DEFAULT '',
  picture_url      TEXT DEFAULT '',
  tesla_franchisee VARCHAR(50) DEFAULT '',
  team_responsibilities TEXT DEFAULT '',
  volunteer_records TEXT DEFAULT '',  -- JSON 字串
  birthday         VARCHAR(20) DEFAULT '', -- YYYY-MM-DD
  display_name     VARCHAR(255) DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_members_line_id ON members(line_id);

-- 註解
COMMENT ON TABLE members IS '成員資料表';
COMMENT ON COLUMN members.line_id IS 'LINE User ID (唯一)';
COMMENT ON COLUMN members.star_level IS '星等：白星、綠星、橙星、紅星、紫星';
COMMENT ON COLUMN members.birthday IS '生日 (YYYY-MM-DD 格式)';
COMMENT ON COLUMN members.display_name IS 'LINE 顯示名稱（成員列表用）';

-- ============================================================
-- 行程表 (events)
-- 對應 Google Calendar 事件，由 Calendar 同步寫入，供 LIFF 讀取
-- id 使用 Google Calendar event ID，方便對應與 upsert
-- ============================================================

CREATE TABLE IF NOT EXISTS events (
  id                VARCHAR(255) PRIMARY KEY,  -- Google Calendar event ID
  title             VARCHAR(500) NOT NULL,
  description       TEXT DEFAULT '',
  start_at          TIMESTAMPTZ NOT NULL,
  end_at            TIMESTAMPTZ NOT NULL,
  all_day           BOOLEAN DEFAULT FALSE,
  location          TEXT DEFAULT '',
  type              VARCHAR(100) DEFAULT '活動',  -- 學員上課、活動、諮詢簽約
  is_birthday_event BOOLEAN DEFAULT FALSE,
  creator_email     VARCHAR(255) DEFAULT '',
  synced_at         TIMESTAMPTZ DEFAULT NOW(),  -- 最後一次從 Calendar 同步時間
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_events_start_at ON events(start_at);
CREATE INDEX IF NOT EXISTS idx_events_end_at ON events(end_at);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_is_birthday ON events(is_birthday_event);

-- 註解
COMMENT ON TABLE events IS '行程資料表 (從 Google Calendar 同步)';
COMMENT ON COLUMN events.id IS 'Google Calendar event ID';
COMMENT ON COLUMN events.type IS '行程類型：學員上課、活動、諮詢簽約';
COMMENT ON COLUMN events.is_birthday_event IS '是否為系統產生的生日行程';
COMMENT ON COLUMN events.synced_at IS '最後同步時間';

-- ============================================================
-- Calendar Watch 狀態表 (可選)
-- 用於追蹤 Google Calendar Push Notification 的 Watch 狀態
-- ============================================================

CREATE TABLE IF NOT EXISTS calendar_watches (
  id            SERIAL PRIMARY KEY,
  channel_id    VARCHAR(255) NOT NULL UNIQUE,
  resource_id   VARCHAR(255) NOT NULL,
  calendar_id   VARCHAR(255) NOT NULL,
  expiration    BIGINT NOT NULL,  -- Unix timestamp (milliseconds)
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE calendar_watches IS 'Google Calendar Watch 通道狀態';
COMMENT ON COLUMN calendar_watches.expiration IS '通道到期時間 (Unix timestamp ms)';

-- ============================================================
-- 自動更新 updated_at 觸發器
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 套用到 members 表
DROP TRIGGER IF EXISTS update_members_updated_at ON members;
CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 套用到 events 表
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
