-- 為 financial_documents 表添加評語相關欄位
-- 評語內容
ALTER TABLE financial_documents ADD COLUMN IF NOT EXISTS comment TEXT;

-- 評語作者（LINE User ID）
ALTER TABLE financial_documents ADD COLUMN IF NOT EXISTS comment_author VARCHAR(255);

-- 評語更新時間
ALTER TABLE financial_documents ADD COLUMN IF NOT EXISTS comment_updated_at TIMESTAMP;

-- 添加註解說明
COMMENT ON COLUMN financial_documents.comment IS '評語內容（只有上級和開發者可填寫）';
COMMENT ON COLUMN financial_documents.comment_author IS '評語作者的 LINE User ID';
COMMENT ON COLUMN financial_documents.comment_updated_at IS '評語最後更新時間';
