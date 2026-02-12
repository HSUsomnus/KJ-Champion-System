-- 在 members 表新增財力金額欄位
-- 用來記錄成員的財力金額（例如：500萬、600萬...9900萬）
ALTER TABLE members
ADD COLUMN IF NOT EXISTS financial_amount VARCHAR(50) DEFAULT '';

COMMENT ON COLUMN members.financial_amount IS '財力金額（無、500萬～9900萬）';
