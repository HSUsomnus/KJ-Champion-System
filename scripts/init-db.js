/**
 * init-db.js — 初始化資料庫 schema
 * 用途：對新 DB（dev 或 backup）套用完整 schema
 *
 * 用法：
 *   TARGET_DB_URL="postgresql://root:xxx@host:port/zeabur" node scripts/init-db.js
 */

const { Client } = require('pg');

const TARGET_DB_URL = process.env.TARGET_DB_URL;

if (!TARGET_DB_URL) {
  console.error('❌ 請設定 TARGET_DB_URL 環境變數');
  console.error('   範例：TARGET_DB_URL="postgresql://..." node scripts/init-db.js');
  process.exit(1);
}

const migrations = [
  {
    name: '01_schema_base',
    sql: `
      CREATE TABLE IF NOT EXISTS members (
        id               SERIAL PRIMARY KEY,
        line_id          VARCHAR(255) NOT NULL UNIQUE,
        name             VARCHAR(255) NOT NULL,
        email            VARCHAR(255) DEFAULT '',
        phone            VARCHAR(50) DEFAULT '',
        star_level       VARCHAR(50) DEFAULT '白星',
        course_record    TEXT DEFAULT '',
        picture_url      TEXT DEFAULT '',
        tesla_franchisee VARCHAR(50) DEFAULT '',
        team_responsibilities TEXT DEFAULT '',
        volunteer_records TEXT DEFAULT '',
        birthday         VARCHAR(20) DEFAULT '',
        display_name     VARCHAR(255) DEFAULT '',
        created_at       TIMESTAMPTZ DEFAULT NOW(),
        updated_at       TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_members_line_id ON members(line_id);

      CREATE TABLE IF NOT EXISTS events (
        id                VARCHAR(255) PRIMARY KEY,
        title             VARCHAR(500) NOT NULL,
        description       TEXT DEFAULT '',
        start_at          TIMESTAMPTZ NOT NULL,
        end_at            TIMESTAMPTZ NOT NULL,
        all_day           BOOLEAN DEFAULT FALSE,
        location          TEXT DEFAULT '',
        type              VARCHAR(100) DEFAULT '活動',
        is_birthday_event BOOLEAN DEFAULT FALSE,
        creator_email     VARCHAR(255) DEFAULT '',
        synced_at         TIMESTAMPTZ DEFAULT NOW(),
        created_at        TIMESTAMPTZ DEFAULT NOW(),
        updated_at        TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_events_start_at ON events(start_at);
      CREATE INDEX IF NOT EXISTS idx_events_end_at ON events(end_at);
      CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
      CREATE INDEX IF NOT EXISTS idx_events_is_birthday ON events(is_birthday_event);

      CREATE TABLE IF NOT EXISTS calendar_watches (
        id            SERIAL PRIMARY KEY,
        channel_id    VARCHAR(255) NOT NULL UNIQUE,
        resource_id   VARCHAR(255) NOT NULL,
        calendar_id   VARCHAR(255) NOT NULL,
        expiration    BIGINT NOT NULL,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS update_members_updated_at ON members;
      CREATE TRIGGER update_members_updated_at
          BEFORE UPDATE ON members
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_events_updated_at ON events;
      CREATE TRIGGER update_events_updated_at
          BEFORE UPDATE ON events
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `,
  },
  {
    name: '02_create_financial_documents',
    sql: `
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

      CREATE INDEX IF NOT EXISTS idx_financial_documents_line_id ON financial_documents(line_id);
      CREATE INDEX IF NOT EXISTS idx_financial_documents_uploaded_at ON financial_documents(uploaded_at DESC);
    `,
  },
  {
    name: '03_add_financial_comments',
    sql: `
      ALTER TABLE financial_documents ADD COLUMN IF NOT EXISTS comment TEXT;
      ALTER TABLE financial_documents ADD COLUMN IF NOT EXISTS comment_author VARCHAR(255);
      ALTER TABLE financial_documents ADD COLUMN IF NOT EXISTS comment_updated_at TIMESTAMP;
    `,
  },
  {
    name: '04_add_financial_sheet_view_url',
    sql: `
      ALTER TABLE financial_documents ADD COLUMN IF NOT EXISTS sheet_view_url TEXT;
    `,
  },
  {
    name: '05_add_invited_by',
    sql: `
      ALTER TABLE members ADD COLUMN IF NOT EXISTS invited_by VARCHAR(255);
      CREATE INDEX IF NOT EXISTS idx_members_invited_by ON members(invited_by);
    `,
  },
  {
    name: '06_add_member_role',
    sql: `
      ALTER TABLE members ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT '一般人';
      CREATE INDEX IF NOT EXISTS idx_members_role ON members(role);
    `,
  },
];

async function main() {
  const client = new Client({ connectionString: TARGET_DB_URL });

  console.log('🔌 連接到目標資料庫...');
  await client.connect();
  console.log('✅ 連接成功\n');

  for (const migration of migrations) {
    process.stdout.write(`⏳ 套用 ${migration.name} ...`);
    try {
      await client.query(migration.sql);
      console.log(' ✅');
    } catch (err) {
      console.log(` ❌\n   錯誤：${err.message}`);
      await client.end();
      process.exit(1);
    }
  }

  console.log('\n🎉 Schema 初始化完成！\n');

  const tables = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  console.log('📋 已建立的 tables：');
  tables.rows.forEach(r => console.log(`   - ${r.table_name}`));

  await client.end();
}

main().catch(err => {
  console.error('❌ 未預期錯誤：', err.message);
  process.exit(1);
});
