-- Change 20：團隊調查表單系統（KJ Survey）
-- 建在既有 PostgreSQL（dev: postgresql-dev / prod: postgresql），不建新 DB。
-- 表名加 survey_ 前綴，避免撞名既有 members 表。

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- survey_members：KJ Survey 自己的團隊名單庫（與主系統 members 是兩張獨立表）
-- ============================================================

CREATE TABLE IF NOT EXISTS survey_members (
  id                SERIAL PRIMARY KEY,
  name              VARCHAR(255) NOT NULL UNIQUE,
  star_rank         VARCHAR(10) NOT NULL CHECK (star_rank IN ('白', '綠', '橙', '紅', '紫')),
  recommender_name  VARCHAR(255) DEFAULT '',
  status            VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending')),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_survey_members_name ON survey_members(name);
CREATE INDEX IF NOT EXISTS idx_survey_members_recommender ON survey_members(recommender_name);

COMMENT ON TABLE survey_members IS 'KJ Survey 團隊名單庫（獨立於主系統 members）';
COMMENT ON COLUMN survey_members.recommender_name IS '推薦人姓名字串，v1 不正規化關聯';
COMMENT ON COLUMN survey_members.status IS 'confirmed=種子/已核對，pending=前台選其他手動輸入待核對';

-- ============================================================
-- survey_forms：一張調查表單一筆
-- ============================================================

CREATE TABLE IF NOT EXISTS survey_forms (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  token       VARCHAR(64) NOT NULL UNIQUE,
  fields      JSONB NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_survey_forms_token ON survey_forms(token);

COMMENT ON TABLE survey_forms IS '調查表單定義（Phase 1 固定表單 + 未來自建表單皆為一筆）';
COMMENT ON COLUMN survey_forms.token IS '隨機不可猜字串，前台分享連結用，不可用流水號';
COMMENT ON COLUMN survey_forms.fields IS 'JSON 陣列：[{ key, label, type, options? }]';

-- ============================================================
-- survey_submissions：一筆填寫一筆
-- ============================================================

CREATE TABLE IF NOT EXISTS survey_submissions (
  id             SERIAL PRIMARY KEY,
  form_id        INTEGER NOT NULL REFERENCES survey_forms(id),
  answers        JSONB NOT NULL,
  review_status  VARCHAR(20) CHECK (review_status IN ('pending', 'approved', 'rejected')),
  reviewer_note  TEXT DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_survey_submissions_form_id ON survey_submissions(form_id);

COMMENT ON TABLE survey_submissions IS '表單填寫紀錄';
COMMENT ON COLUMN survey_submissions.answers IS 'JSON：key 對應 survey_forms.fields 的 key';
COMMENT ON COLUMN survey_submissions.review_status IS 'Phase 2 預留（截圖審核），Phase 1 一律留空';

-- ============================================================
-- 種子資料：40 人名單（組織圖 OCR 整理，發佈前需人工核對罕用字）
-- ============================================================

INSERT INTO survey_members (name, star_rank, recommender_name, status) VALUES
  ('李冠陞', '紫', '', 'confirmed'),
  ('徐毓紘', '橙', '李冠陞', 'confirmed'),
  ('曹琬琦', '橙', '李冠陞', 'confirmed'),
  ('李政儒', '橙', '李冠陞', 'confirmed'),
  ('黃仲龍', '綠', '曹琬琦', 'confirmed'),
  ('譚又順', '綠', '黃仲龍', 'confirmed'),
  ('林義淳', '綠', '潘暻葶', 'confirmed'),
  ('田家鈞', '綠', '李冠陞', 'confirmed'),
  ('周莞琇', '綠', '李冠陞', 'confirmed'),
  ('林泓棟', '綠', '林盈棟', 'confirmed'),
  ('林盈棟', '綠', '徐毓紘', 'confirmed'),
  ('王煜翔', '綠', '曹琬琦', 'confirmed'),
  ('賴麒文', '綠', '李冠陞', 'confirmed'),
  ('陳安琪', '綠', '曹琬琦', 'confirmed'),
  ('吳瑞恩', '綠', '曹琬琦', 'confirmed'),
  ('林沛臻', '綠', '周莞琇', 'confirmed'),
  ('江易儒', '綠', '周莞琇', 'confirmed'),
  ('潘暻葶', '綠', '曹琬琦', 'confirmed'),
  ('林旻翰', '綠', '曹琬琦', 'confirmed'),
  ('俞家凌', '綠', '曹琬琦', 'confirmed'),
  ('陳昱志', '綠', '李政儒', 'confirmed'),
  ('楊于婷', '綠', '李冠陞', 'confirmed'),
  ('賴坤毅', '綠', '陳昱志', 'confirmed'),
  ('林彥廷', '綠', '李冠陞', 'confirmed'),
  ('江子妍', '綠', '李冠陞', 'confirmed'),
  ('倪文璽', '綠', '李冠陞', 'confirmed'),
  ('劉陶興', '綠', '李冠陞', 'confirmed'),
  ('胡芷瑄', '綠', '曹琬琦', 'confirmed'),
  ('鄒政樺', '綠', '周莞琇', 'confirmed'),
  ('劉名軒', '綠', '李冠陞', 'confirmed'),
  ('吳玉清', '綠', '徐毓紘', 'confirmed'),
  ('何晏全', '綠', '賴麒文', 'confirmed'),
  ('張云榕', '白', '林旻翰', 'confirmed'),
  ('呂昆哲', '白', '譚又順', 'confirmed'),
  ('蕭日龍', '白', '李冠陞', 'confirmed'),
  ('徐歆媛', '白', '徐毓紘', 'confirmed'),
  ('彭湘庭', '白', '周莞琇', 'confirmed'),
  ('陳幸玫', '白', '周莞琇', 'confirmed'),
  ('陳祖華', '白', '李冠陞', 'confirmed'),
  ('劉書瑋', '白', '李冠陞', 'confirmed')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Phase 1 固定表單（一筆 published forms 記錄）
-- ============================================================

INSERT INTO survey_forms (title, token, fields, status) VALUES (
  '康九團隊調查',
  encode(gen_random_bytes(24), 'hex'),
  '[
    { "key": "name", "label": "姓名", "type": "searchable_select", "options": { "source": "survey_members", "field": "name" } },
    { "key": "star_rank", "label": "夥伴星等", "type": "searchable_select", "options": { "source": "static", "values": ["白", "綠", "橙", "紅", "紫"] } },
    { "key": "recommender", "label": "推薦人", "type": "searchable_select", "options": { "source": "survey_members", "field": "name" } },
    { "key": "join_master", "label": "天驥加盟主", "type": "yesno" },
    { "key": "tree_finance_d2", "label": "財務進化樹Day2", "type": "yesno" },
    { "key": "tree_path", "label": "實踐路徑樹", "type": "yesno" },
    { "key": "tree_abundance", "label": "富足人生樹", "type": "yesno" },
    { "key": "tree_decode", "label": "人生解碼樹", "type": "yesno" }
  ]'::jsonb,
  'published'
)
ON CONFLICT (token) DO NOTHING;
