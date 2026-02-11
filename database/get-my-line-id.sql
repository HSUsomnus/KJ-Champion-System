-- 取得所有成員的 LINE ID（找出你自己的）
-- 執行後，在結果中找到你的名字，複製對應的 line_id

SELECT 
  line_id,
  name,
  "displayName",
  email,
  created_at
FROM members
ORDER BY created_at DESC;

-- 找到你的 LINE ID 後：
-- 1. 複製 line_id 欄位的值（例如：U1234567890abcdef1234567890abcdef）
-- 2. 到 Vercel → Settings → Environment Variables
-- 3. 新增變數：
--    Name: ADMIN_LINE_USER_IDS
--    Value: <你的 LINE ID>
--    Environment: 勾選 Production, Preview, Development
-- 4. 點選 Save 並重新部署
