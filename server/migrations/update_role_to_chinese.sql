-- 將現有的英文 role 值轉換為中文
UPDATE members SET role = '開發者' WHERE role = 'admin';
UPDATE members SET role = '負責人' WHERE role = 'manager';
UPDATE members SET role = '一般人' WHERE role = 'member' OR role IS NULL OR role = '';

-- 設定預設值為中文
ALTER TABLE members ALTER COLUMN role SET DEFAULT '一般人';
