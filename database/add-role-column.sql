-- 新增權限欄位到 members 表
-- 執行此 SQL 來為現有資料庫新增權限管理功能

-- 1. 新增 role 欄位（權限角色）
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT '一般人';

-- 2. 新增註解說明
COMMENT ON COLUMN members.role IS '權限角色：開發者、管理者、負責人、一般人';

-- 3. 建立索引（方便查詢特定權限的成員）
CREATE INDEX IF NOT EXISTS idx_members_role ON members(role);

-- 4. 新增檢查約束（確保只能填入有效的角色）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'members_role_check'
  ) THEN
    ALTER TABLE members 
    ADD CONSTRAINT members_role_check 
    CHECK (role IN ('開發者', '管理者', '負責人', '一般人'));
  END IF;
END $$;

-- 5. 查看更新結果
SELECT 
  line_id,
  name,
  role,
  created_at
FROM members
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================
-- 使用說明
-- ============================================================
-- 執行此 SQL 後，所有現有成員的權限預設為「一般人」
-- 
-- 若要手動設定某位成員為開發者，執行：
-- UPDATE members SET role = '開發者' WHERE line_id = 'U你的LINE_ID';
--
-- 若要查詢所有開發者：
-- SELECT line_id, name, role FROM members WHERE role = '開發者';
-- ============================================================
