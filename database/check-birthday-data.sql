-- 檢查 Supabase 資料狀態（在 SQL Editor 執行）

-- 1. 檢查成員表：有多少人有填生日
SELECT 
  COUNT(*) as total_members,
  COUNT(CASE WHEN birthday IS NOT NULL AND birthday != '' THEN 1 END) as has_birthday
FROM members;

-- 2. 檢查 events 表：有多少生日行程
SELECT 
  COUNT(*) as total_events,
  COUNT(CASE WHEN is_birthday_event = TRUE THEN 1 END) as birthday_events
FROM events;

-- 3. 列出所有生日行程
SELECT id, title, start_at, is_birthday_event
FROM events
WHERE is_birthday_event = TRUE
ORDER BY start_at;

-- 4. 列出有生日的成員（檢查格式是否正確）
SELECT line_id, name, birthday
FROM members
WHERE birthday IS NOT NULL AND birthday != ''
ORDER BY name;
