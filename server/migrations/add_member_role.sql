-- 為 members 表新增角色欄位
-- role 可以是：'一般人'（一般成員）, '負責人'（負責人）, '開發者'（開發者/管理員）
ALTER TABLE members ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT '一般人';

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_members_role ON members(role);

-- 添加註解
COMMENT ON COLUMN members.role IS '成員角色：一般人（一般成員）, 負責人（負責人）, 開發者（開發者/管理員）';
