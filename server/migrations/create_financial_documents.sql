-- 創建財力文件表
CREATE TABLE IF NOT EXISTS financial_documents (
  id SERIAL PRIMARY KEY,
  line_id VARCHAR(255) NOT NULL,
  original_filename VARCHAR(500) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100),
  compressed_data BYTEA NOT NULL,
  metadata JSONB,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 新增索引
CREATE INDEX IF NOT EXISTS idx_financial_documents_line_id ON financial_documents(line_id);
CREATE INDEX IF NOT EXISTS idx_financial_documents_uploaded_at ON financial_documents(uploaded_at DESC);

-- 新增註解
COMMENT ON TABLE financial_documents IS '財力文件儲存表';
COMMENT ON COLUMN financial_documents.line_id IS '上傳者的 LINE User ID';
COMMENT ON COLUMN financial_documents.original_filename IS '原始檔案名稱';
COMMENT ON COLUMN financial_documents.file_size IS '原始檔案大小（bytes）';
COMMENT ON COLUMN financial_documents.mime_type IS '檔案 MIME 類型';
COMMENT ON COLUMN financial_documents.compressed_data IS '壓縮後的檔案資料';
COMMENT ON COLUMN financial_documents.metadata IS '額外資訊（JSON格式）';

-- 驗證表格建立
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'financial_documents'
ORDER BY ordinal_position;
