-- 為財力文件表新增「Google Sheet 唯讀檢視連結」欄位
-- 上傳時會將檔案轉成 Google 試算表並存此連結，瀏覽按鈕直接開此網頁
ALTER TABLE financial_documents ADD COLUMN IF NOT EXISTS sheet_view_url TEXT;
COMMENT ON COLUMN financial_documents.sheet_view_url IS '該筆上傳轉成 Google 試算表後的唯讀檢視連結（/view）';
