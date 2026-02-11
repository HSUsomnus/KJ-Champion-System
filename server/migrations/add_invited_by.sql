-- 新增上下級關係欄位
-- 為 members 表新增 invited_by 欄位，記錄邀請人的 LINE ID

ALTER TABLE members
ADD COLUMN IF NOT EXISTS invited_by VARCHAR(255);

-- 新增索引以提升查詢效率（查詢某人邀請的所有下級）
CREATE INDEX IF NOT EXISTS idx_members_invited_by ON members(invited_by);

-- 新增註解說明
COMMENT ON COLUMN members.invited_by IS '邀請人的 LINE User ID（上級）';
