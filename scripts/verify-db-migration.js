/**
 * scripts/verify-db-migration.js
 * 驗證 Supabase → Zeabur 資料遷移正確性（Task 2c）
 * 用法：node scripts/verify-db-migration.js
 */

const { Pool } = require('pg');

const SOURCE_URL =
  process.env.SOURCE_DATABASE_URL ||
  'postgresql://postgres:DATAd0443779@db.fsrkhmnqmbbhwdsmacnn.supabase.co:5432/postgres';
const TARGET_URL =
  process.env.TARGET_DATABASE_URL ||
  'postgresql://root:P26cdVp9lg1m3ebiu0ZvCs75kfn8G4jN@43.163.196.8:30756/zeabur';

const source = new Pool({ connectionString: SOURCE_URL, ssl: { rejectUnauthorized: false } });
const target = new Pool({ connectionString: TARGET_URL, ssl: false });

const TABLES = ['calendar_watches', 'events', 'financial_documents', 'members'];

let passed = 0;
let failed = 0;

function log(msg) {
  process.stdout.write(`[${new Date().toISOString().substring(11, 19)}] ${msg}\n`);
}

function ok(msg) {
  passed++;
  log(`  ✓ ${msg}`);
}

function fail(msg) {
  failed++;
  log(`  ✗ FAIL: ${msg}`);
}

// ──────────────────────────────────────────────
// 2c.1 所有 table 的 row count 與 Supabase 相符
// ──────────────────────────────────────────────
async function check_row_counts() {
  log('\n[2c.1] 檢查所有 table row count...');
  for (const table of TABLES) {
    const [srcRes, tgtRes] = await Promise.all([
      source.query(`SELECT COUNT(*) AS cnt FROM public.${table}`),
      target.query(`SELECT COUNT(*) AS cnt FROM public.${table}`)
    ]);
    const srcCnt = parseInt(srcRes.rows[0].cnt);
    const tgtCnt = parseInt(tgtRes.rows[0].cnt);
    if (srcCnt === tgtCnt) {
      ok(`${table}: ${srcCnt} 筆（兩邊一致）`);
    } else {
      fail(`${table}: Supabase=${srcCnt} vs Zeabur=${tgtCnt}（差 ${Math.abs(srcCnt - tgtCnt)} 筆）`);
    }
  }
}

// ──────────────────────────────────────────────
// 2c.2 抽查至少 3 筆 event 記錄，欄位值與 Supabase 一致
// ──────────────────────────────────────────────
async function check_event_samples() {
  log('\n[2c.2] 抽查 events 記錄欄位值...');

  // 取最近 3 筆（按 created_at 排序）
  const srcRes = await source.query(
    `SELECT id, title, start_at, end_at, type, all_day, location, description
     FROM public.events
     ORDER BY created_at DESC
     LIMIT 3`
  );

  if (srcRes.rows.length === 0) {
    log('  ⚠ Supabase events 無資料，跳過抽查');
    return;
  }

  const ids = srcRes.rows.map(r => r.id);
  const tgtRes = await target.query(
    `SELECT id, title, start_at, end_at, type, all_day, location, description
     FROM public.events
     WHERE id = ANY($1)`,
    [ids]
  );

  const tgtMap = new Map(tgtRes.rows.map(r => [r.id, r]));

  const COMPARE_FIELDS = ['title', 'type', 'all_day', 'location', 'description'];

  for (const srcRow of srcRes.rows) {
    const tgtRow = tgtMap.get(srcRow.id);
    if (!tgtRow) {
      fail(`event id=${srcRow.id} 在 Zeabur 不存在`);
      continue;
    }

    // 對比時間戳（允許毫秒誤差）
    const srcStart = new Date(srcRow.start_at).getTime();
    const tgtStart = new Date(tgtRow.start_at).getTime();
    const srcEnd   = new Date(srcRow.end_at).getTime();
    const tgtEnd   = new Date(tgtRow.end_at).getTime();

    if (Math.abs(srcStart - tgtStart) > 1000 || Math.abs(srcEnd - tgtEnd) > 1000) {
      fail(`event id=${srcRow.id}: 時間戳不符 start_at Supabase=${srcRow.start_at} Zeabur=${tgtRow.start_at}`);
      continue;
    }

    // 對比字串欄位
    let fieldOk = true;
    for (const field of COMPARE_FIELDS) {
      if (String(srcRow[field] ?? '') !== String(tgtRow[field] ?? '')) {
        fail(`event id=${srcRow.id}: ${field} 不符 Supabase="${srcRow[field]}" Zeabur="${tgtRow[field]}"`);
        fieldOk = false;
      }
    }

    if (fieldOk) {
      ok(`event id=${srcRow.id} title="${srcRow.title}" 欄位一致`);
    }
  }
}

// ──────────────────────────────────────────────
// 2c.3 確認 FK、index、constraint 均有效（無 orphan 資料）
// ──────────────────────────────────────────────
async function check_constraints() {
  log('\n[2c.3] 確認 constraint 與 index...');

  // 確認 tables 存在（pg_tables 查詢）
  const tableCheck = await target.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = ANY($1)
  `, [TABLES]);
  const existingTables = tableCheck.rows.map(r => r.tablename);
  for (const t of TABLES) {
    if (existingTables.includes(t)) {
      ok(`table public.${t} 存在`);
    } else {
      fail(`table public.${t} 不存在於 Zeabur`);
    }
  }

  // 確認主要 indexes 存在
  const expectedIndexes = [
    'idx_events_start_at',
    'idx_events_end_at',
    'idx_events_type',
    'idx_events_is_birthday',
    'idx_members_line_id',
    'idx_members_role',
    'idx_financial_documents_line_id',
    'idx_financial_documents_uploaded_at',
  ];
  const idxRes = await target.query(`
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname = ANY($1)
  `, [expectedIndexes]);
  const existingIdxs = new Set(idxRes.rows.map(r => r.indexname));
  for (const idx of expectedIndexes) {
    if (existingIdxs.has(idx)) {
      ok(`index ${idx} 存在`);
    } else {
      fail(`index ${idx} 不存在`);
    }
  }

  // 確認 UNIQUE constraint：members.line_id 唯一性
  const dupMember = await target.query(`
    SELECT line_id, COUNT(*) AS cnt
    FROM public.members
    GROUP BY line_id
    HAVING COUNT(*) > 1
  `);
  if (dupMember.rows.length === 0) {
    ok('members.line_id 無重複（UNIQUE 有效）');
  } else {
    fail(`members.line_id 有重複：${dupMember.rows.map(r => r.line_id).join(', ')}`);
  }

  // 確認 calendar_watches.channel_id 唯一性
  const dupWatch = await target.query(`
    SELECT channel_id, COUNT(*) AS cnt
    FROM public.calendar_watches
    GROUP BY channel_id
    HAVING COUNT(*) > 1
  `);
  if (dupWatch.rows.length === 0) {
    ok('calendar_watches.channel_id 無重複（UNIQUE 有效）');
  } else {
    fail(`calendar_watches.channel_id 有重複：${dupWatch.rows.map(r => r.channel_id).join(', ')}`);
  }

  // 確認 financial_documents 的 line_id 均對應到 members（檢查 orphan）
  const orphanDocs = await target.query(`
    SELECT fd.id, fd.line_id
    FROM public.financial_documents fd
    WHERE NOT EXISTS (
      SELECT 1 FROM public.members m WHERE m.line_id = fd.line_id
    )
    LIMIT 10
  `);
  if (orphanDocs.rows.length === 0) {
    ok('financial_documents 無 orphan（所有 line_id 均有對應 member）');
  } else {
    fail(`financial_documents 有 ${orphanDocs.rows.length} 筆 orphan（line_id 無對應 member）`);
    for (const row of orphanDocs.rows) {
      log(`    orphan doc id=${row.id} line_id=${row.line_id}`);
    }
  }

  // 確認 sequences 不落後於資料
  const seqChecks = [
    { table: 'calendar_watches', seq: 'calendar_watches_id_seq' },
    { table: 'financial_documents', seq: 'financial_documents_id_seq' },
    { table: 'members', seq: 'members_id_seq' },
  ];
  for (const { table, seq } of seqChecks) {
    const maxRes = await target.query(`SELECT MAX(id) AS max_id FROM public.${table}`);
    const seqRes = await target.query(`SELECT last_value FROM public.${seq}`);
    const maxId = maxRes.rows[0].max_id || 0;
    const lastVal = parseInt(seqRes.rows[0].last_value);
    if (lastVal >= maxId) {
      ok(`${seq}: last_value=${lastVal} >= max(id)=${maxId}（序列正常）`);
    } else {
      fail(`${seq}: last_value=${lastVal} < max(id)=${maxId}（序列落後，INSERT 會衝突）`);
    }
  }
}

// ──────────────────────────────────────────────
async function main() {
  log('=== Task 2c 資料庫驗證開始 ===');
  try {
    await source.query('SELECT 1');
    log('✓ Supabase 連線正常');
    await target.query('SELECT 1');
    log('✓ Zeabur 連線正常');

    await check_row_counts();
    await check_event_samples();
    await check_constraints();

    log('\n══════════════════════════════════════');
    if (failed === 0) {
      log(`✅ 全部通過（${passed} 項）— 可繼續執行 Task 2d`);
    } else {
      log(`❌ 驗證失敗：${failed} 項未通過，${passed} 項通過`);
      log('   請修正上方 ✗ 項目後重新執行，通過後才進行 Task 2d');
      process.exit(1);
    }
    log('══════════════════════════════════════');
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
