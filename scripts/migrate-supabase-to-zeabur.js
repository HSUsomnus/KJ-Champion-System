/**
 * scripts/migrate-supabase-to-zeabur.js
 * 從 Supabase 單向遷移資料至 Zeabur PostgreSQL（Task 2b）
 * 用法：node scripts/migrate-supabase-to-zeabur.js
 */

const { Pool } = require('pg');

const SOURCE_URL = process.env.SUPABASE_DATABASE_URL;
const TARGET_URL = process.env.DATABASE_URL;

if (!SOURCE_URL || !TARGET_URL) {
  console.error('❌ 請設定環境變數：SUPABASE_DATABASE_URL、DATABASE_URL');
  process.exit(1);
}

const source = new Pool({ connectionString: SOURCE_URL, ssl: { rejectUnauthorized: false } });
const target = new Pool({ connectionString: TARGET_URL, ssl: false });

// ──────────────────────────────────────────────
// Schema DDL（依 Supabase 查詢結果手動對應）
// ──────────────────────────────────────────────
const SCHEMA_SQL = `
-- calendar_watches
CREATE TABLE IF NOT EXISTS public.calendar_watches (
  id           SERIAL       NOT NULL,
  channel_id   VARCHAR(255) NOT NULL,
  resource_id  VARCHAR(255) NOT NULL,
  calendar_id  VARCHAR(255) NOT NULL,
  expiration   BIGINT       NOT NULL,
  created_at   TIMESTAMPTZ  DEFAULT now(),
  CONSTRAINT calendar_watches_pkey PRIMARY KEY (id),
  CONSTRAINT calendar_watches_channel_id_key UNIQUE (channel_id)
);

-- events
CREATE TABLE IF NOT EXISTS public.events (
  id               VARCHAR(255) NOT NULL,
  title            VARCHAR(500) NOT NULL,
  description      TEXT         DEFAULT ''::text,
  start_at         TIMESTAMPTZ  NOT NULL,
  end_at           TIMESTAMPTZ  NOT NULL,
  all_day          BOOLEAN      DEFAULT false,
  location         TEXT         DEFAULT ''::text,
  type             VARCHAR(100) DEFAULT '活動'::character varying,
  is_birthday_event BOOLEAN     DEFAULT false,
  creator_email    VARCHAR(255) DEFAULT ''::character varying,
  synced_at        TIMESTAMPTZ  DEFAULT now(),
  created_at       TIMESTAMPTZ  DEFAULT now(),
  updated_at       TIMESTAMPTZ  DEFAULT now(),
  CONSTRAINT events_pkey PRIMARY KEY (id)
);

-- financial_documents
CREATE TABLE IF NOT EXISTS public.financial_documents (
  id                  SERIAL       NOT NULL,
  line_id             VARCHAR(255) NOT NULL,
  original_filename   VARCHAR(500) NOT NULL,
  file_size           INTEGER      NOT NULL,
  mime_type           VARCHAR(100),
  compressed_data     BYTEA        NOT NULL,
  metadata            JSONB,
  uploaded_at         TIMESTAMPTZ  DEFAULT now(),
  updated_at          TIMESTAMPTZ  DEFAULT now(),
  comment             TEXT,
  comment_author      VARCHAR(255),
  comment_updated_at  TIMESTAMP,
  sheet_view_url      TEXT,
  CONSTRAINT financial_documents_pkey PRIMARY KEY (id)
);

-- members
CREATE TABLE IF NOT EXISTS public.members (
  id                   SERIAL       NOT NULL,
  line_id              VARCHAR(255) NOT NULL,
  name                 VARCHAR(255) NOT NULL,
  email                VARCHAR(255) DEFAULT ''::character varying,
  phone                VARCHAR(50)  DEFAULT ''::character varying,
  star_level           VARCHAR(50)  DEFAULT '白星'::character varying,
  course_record        TEXT         DEFAULT ''::text,
  picture_url          TEXT         DEFAULT ''::text,
  tesla_franchisee     VARCHAR(50)  DEFAULT ''::character varying,
  team_responsibilities TEXT        DEFAULT ''::text,
  volunteer_records    TEXT         DEFAULT ''::text,
  birthday             VARCHAR(20)  DEFAULT ''::character varying,
  display_name         VARCHAR(255) DEFAULT ''::character varying,
  created_at           TIMESTAMPTZ  DEFAULT now(),
  updated_at           TIMESTAMPTZ  DEFAULT now(),
  role                 VARCHAR(20)  DEFAULT '一般人'::character varying,
  invited_by           VARCHAR(255),
  financial_amount     VARCHAR(50)  DEFAULT ''::character varying,
  CONSTRAINT members_pkey PRIMARY KEY (id),
  CONSTRAINT members_line_id_key UNIQUE (line_id)
);
`;

// Indexes（不含 pkey，已在 DDL 中建立）
const INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_events_end_at       ON public.events USING btree (end_at);
CREATE INDEX IF NOT EXISTS idx_events_is_birthday  ON public.events USING btree (is_birthday_event);
CREATE INDEX IF NOT EXISTS idx_events_start_at     ON public.events USING btree (start_at);
CREATE INDEX IF NOT EXISTS idx_events_type         ON public.events USING btree (type);
CREATE INDEX IF NOT EXISTS idx_financial_documents_line_id     ON public.financial_documents USING btree (line_id);
CREATE INDEX IF NOT EXISTS idx_financial_documents_uploaded_at ON public.financial_documents USING btree (uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_members_invited_by  ON public.members USING btree (invited_by);
CREATE INDEX IF NOT EXISTS idx_members_line_id     ON public.members USING btree (line_id);
CREATE INDEX IF NOT EXISTS idx_members_role        ON public.members USING btree (role);
`;

// 需要複製的 table（依序，無 FK 相依）
const TABLES = ['calendar_watches', 'events', 'financial_documents', 'members'];

// ──────────────────────────────────────────────

function log(msg) {
  process.stdout.write(`[${new Date().toISOString().substring(11, 19)}] ${msg}\n`);
}

async function step1_createSchema() {
  log('Step 1: 建立 schema（tables）...');
  await target.query(SCHEMA_SQL);
  log('  ✓ Tables 建立完成');
}

async function step2_copyData() {
  log('Step 2: 複製資料...');
  for (const table of TABLES) {
    // 取得所有資料
    const { rows, rowCount } = await source.query(`SELECT * FROM public.${table}`);
    log(`  → ${table}: 來源 ${rowCount} 筆`);
    if (rowCount === 0) {
      log(`  ✓ ${table}: 無資料，跳過`);
      continue;
    }

    // 先清空目標表（確保冪等性）
    await target.query(`TRUNCATE public.${table} RESTART IDENTITY CASCADE`);

    // 取得欄位名稱
    const columns = Object.keys(rows[0]);
    const colList = columns.map(c => `"${c}"`).join(', ');

    // 批次 INSERT（每批 100 筆）
    const BATCH = 100;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const values = [];
      const placeholders = batch.map((row, bIdx) => {
        const rowPlaceholders = columns.map((col, cIdx) => {
          values.push(row[col]);
          return `$${bIdx * columns.length + cIdx + 1}`;
        });
        return `(${rowPlaceholders.join(', ')})`;
      });
      await target.query(
        `INSERT INTO public.${table} (${colList}) VALUES ${placeholders.join(', ')}`,
        values
      );
      inserted += batch.length;
    }
    log(`  ✓ ${table}: 已插入 ${inserted} 筆`);
  }
}

async function step3_resetSequences() {
  log('Step 3: 重設 sequences...');
  const seqTables = ['calendar_watches', 'financial_documents', 'members'];
  for (const table of seqTables) {
    const result = await target.query(`SELECT MAX(id) AS max_id FROM public.${table}`);
    const maxId = result.rows[0].max_id || 0;
    await target.query(
      `SELECT setval('public.${table}_id_seq', $1, true)`,
      [Math.max(maxId, 1)]
    );
    log(`  ✓ ${table}_id_seq → ${Math.max(maxId, 1)}`);
  }
}

async function step4_createIndexes() {
  log('Step 4: 建立 indexes...');
  await target.query(INDEX_SQL);
  log('  ✓ Indexes 建立完成');
}

async function step5_verifyCount() {
  log('Step 5: 核對資料筆數...');
  let allMatch = true;
  for (const table of TABLES) {
    const [srcRes, tgtRes] = await Promise.all([
      source.query(`SELECT COUNT(*) AS cnt FROM public.${table}`),
      target.query(`SELECT COUNT(*) AS cnt FROM public.${table}`)
    ]);
    const srcCnt = parseInt(srcRes.rows[0].cnt);
    const tgtCnt = parseInt(tgtRes.rows[0].cnt);
    const match = srcCnt === tgtCnt ? '✓' : '✗ MISMATCH';
    log(`  ${match} ${table}: Supabase=${srcCnt}, Zeabur=${tgtCnt}`);
    if (srcCnt !== tgtCnt) allMatch = false;
  }
  return allMatch;
}

async function main() {
  log('=== Supabase → Zeabur 資料遷移開始 ===');
  try {
    // 測試連線
    log('測試連線...');
    await source.query('SELECT 1');
    log('  ✓ Supabase 連線正常');
    await target.query('SELECT 1');
    log('  ✓ Zeabur 連線正常');

    await step1_createSchema();
    await step2_copyData();
    await step3_resetSequences();
    await step4_createIndexes();
    const ok = await step5_verifyCount();

    if (ok) {
      log('');
      log('=== ✅ 遷移完成，所有資料筆數一致 ===');
      log('下一步：執行 Task 2c 驗證（抽查欄位值、foreign key）');
    } else {
      log('');
      log('=== ❌ 遷移有異常，請檢查上方 MISMATCH 項目 ===');
      process.exit(1);
    }
  } catch (err) {
    log(`❌ 錯誤：${err.message}`);
    console.error(err);
    process.exit(1);
  } finally {
    await source.end();
    await target.end();
  }
}

main();
