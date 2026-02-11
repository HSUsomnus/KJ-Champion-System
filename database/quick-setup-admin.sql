-- 一鍵設定：新增 role 欄位並設定自己為開發者
-- 請在 Supabase SQL Editor 執行此腳本

-- Step 1: 確認 role 欄位是否存在
DO $$ 
BEGIN
  -- 如果 role 欄位不存在，則新增
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'members' AND column_name = 'role'
  ) THEN
    -- 新增 role 欄位
    ALTER TABLE members ADD COLUMN role VARCHAR(20) DEFAULT '一般人';
    
    -- 新增註解
    COMMENT ON COLUMN members.role IS '權限角色：開發者、管理者、負責人、一般人';
    
    -- 新增索引
    CREATE INDEX idx_members_role ON members(role);
    
    -- 新增檢查約束
    ALTER TABLE members 
    ADD CONSTRAINT members_role_check 
    CHECK (role IN ('開發者', '管理者', '負責人', '一般人'));
    
    RAISE NOTICE '✅ role 欄位已新增';
  ELSE
    RAISE NOTICE '✅ role 欄位已存在';
  END IF;
END $$;

-- Step 2: 顯示所有成員（找到自己的名字）
SELECT 
  line_id,
  name,
  email,
  role,
  created_at
FROM members
ORDER BY created_at DESC;

-- ============================================================
-- 接下來，請手動執行以下 SQL 來設定自己為開發者：
-- （將「你的名字」替換成上面查詢結果中你的真實姓名）
-- ============================================================

-- UPDATE members 
-- SET role = '開發者' 
-- WHERE name = '你的名字';

-- 或使用 LINE ID（更精確）：
-- UPDATE members 
-- SET role = '開發者' 
-- WHERE line_id = 'U你的LINE_ID';

-- ============================================================
-- 執行完 UPDATE 後，執行以下 SQL 驗證：
-- ============================================================

-- SELECT name, role, line_id 
-- FROM members 
-- WHERE role = '開發者';
