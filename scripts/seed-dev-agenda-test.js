/**
 * 【dev DB only】每日行程推播驗證用 seed 腳本
 *
 * 用途：在獨立的 dev DB 寫入測試資料，讓開發者帳號能進入 /agenda-settings
 * 並驗證「立即推播」與權限控制。
 *
 * 寫入內容：
 *   1. 你的 LINE 帳號 → role='開發者'（已有 record 則只更新 role，不覆寫 onboarding 欄位）
 *   2. 明日（Asia/Taipei）一筆測試 event
 *   3. 一個 role='一般人' 測試帳號（給「非 developer 訪問 /agenda-settings 顯示無權限」測試）
 *
 * 安全：
 *   - 只連 DEV_DATABASE_URL，不會碰 prod
 *   - 連線字串若指向 prod 主機會直接拒絕
 *   - 全部 idempotent，重複執行只覆寫測試資料
 *
 * 使用：
 *   node scripts/seed-dev-agenda-test.js <YOUR_LINE_USER_ID>
 *
 * 取得 LINE userId：dev 站登入後 DevTools Console 跑：
 *   localStorage.getItem('lineUserId')
 */

require('dotenv').config();
const { Pool } = require('pg');

const lineId = process.argv[2];
if (!lineId) {
  console.error('❌ 缺少 LINE userId 參數');
  console.error('Usage: node scripts/seed-dev-agenda-test.js <YOUR_LINE_USER_ID>');
  process.exit(1);
}
if (!/^U[a-f0-9]{32}$/.test(lineId)) {
  console.error(`❌ LINE userId 格式不對：必須是 U 開頭 + 32 個 hex 字元，收到「${lineId}」`);
  process.exit(1);
}

const connStr = process.env.DEV_DATABASE_URL;
if (!connStr) {
  console.error('❌ DEV_DATABASE_URL 未設定（檢查 .env）');
  process.exit(1);
}
// 二次防呆：若連線字串包含 prod 服務名稱關鍵字，拒絕執行
if (/kj-champion(?!-dev)/i.test(connStr) && !/postgresql-dev/i.test(connStr)) {
  console.error('⛔ DEV_DATABASE_URL 看起來指向 prod！拒絕執行');
  console.error('   實際值（部分隱藏）:', connStr.replace(/:[^:@/]+@/, ':***@'));
  process.exit(1);
}

const pool = new Pool({ connectionString: connStr, connectionTimeoutMillis: 5000 });

// 明日 Asia/Taipei 的 YYYY-MM-DD
const tomorrowTaipei = (() => {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const parts = fmt.formatToParts(new Date());
  const y = parseInt(parts.find(p => p.type === 'year').value, 10);
  const m = parseInt(parts.find(p => p.type === 'month').value, 10);
  const d = parseInt(parts.find(p => p.type === 'day').value, 10);
  const todayUtc = new Date(Date.UTC(y, m - 1, d));
  todayUtc.setUTCDate(todayUtc.getUTCDate() + 1);
  const yy = todayUtc.getUTCFullYear();
  const mm = String(todayUtc.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(todayUtc.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
})();

const NON_DEV_LINE_ID = 'U' + '7'.repeat(32);
const TEST_EVENT_ID = 'dev-seed-tomorrow-agenda';

(async () => {
  try {
    console.log(`🔌 連線 dev DB...`);
    await pool.query('SELECT 1');
    console.log('✅ 連線成功');

    // 1. 你的帳號 → 開發者
    const r1 = await pool.query(
      `INSERT INTO members (line_id, name, email, phone, birthday, course_record, role, star_level)
       VALUES ($1, '【dev seed】開發者測試', 'dev-seed@test.local', '0900000001', '1990-01-01', '正式金流課', '開發者', '紫星')
       ON CONFLICT (line_id) DO UPDATE SET role = '開發者'
       RETURNING (xmax = 0) AS inserted, name, role`,
      [lineId]
    );
    const row1 = r1.rows[0];
    console.log(`✅ 你的帳號（${lineId}）→ ${row1.inserted ? '新建' : '更新'} role='${row1.role}'`);

    // 2. 一般人測試帳號
    const r2 = await pool.query(
      `INSERT INTO members (line_id, name, email, phone, birthday, course_record, role, star_level)
       VALUES ($1, '【dev seed】一般人測試', 'general-seed@test.local', '0900000002', '1990-01-01', '正式金流課', '一般人', '白星')
       ON CONFLICT (line_id) DO UPDATE SET role = '一般人'
       RETURNING (xmax = 0) AS inserted`,
      [NON_DEV_LINE_ID]
    );
    console.log(`✅ 一般人測試帳號（${NON_DEV_LINE_ID}）→ ${r2.rows[0].inserted ? '新建' : '更新'}`);

    // 3. 明日測試 event
    const startAt = `${tomorrowTaipei}T10:00:00+08:00`;
    const endAt = `${tomorrowTaipei}T11:00:00+08:00`;
    const r3 = await pool.query(
      `INSERT INTO events (id, title, description, start_at, end_at, all_day, location, type, is_birthday_event, creator_email, synced_at)
       VALUES ($1, '【dev seed】明日推播驗證行程', '由 seed-dev-agenda-test.js 插入，可手動刪除', $2, $3, false, '台北', '活動', false, 'dev-seed@test.local', NOW())
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         start_at = EXCLUDED.start_at,
         end_at = EXCLUDED.end_at,
         synced_at = NOW(),
         updated_at = NOW()
       RETURNING (xmax = 0) AS inserted`,
      [TEST_EVENT_ID, startAt, endAt]
    );
    console.log(`✅ 測試 event（${TEST_EVENT_ID} → ${tomorrowTaipei}）→ ${r3.rows[0].inserted ? '新建' : '更新'}`);

    console.log('');
    console.log('🎉 dev DB seed 完成');
    console.log('');
    console.log('下一步：');
    console.log('  1. dev 站清 Service Worker + 強制重新整理');
    console.log('  2. 用你的 LINE 重新登入（或 refreshUser）');
    console.log('  3. FabNav 應出現「開發者設定」入口');
    console.log('  4. 進入 /agenda-settings 點「立即推播」應推 1 筆給你');
  } catch (err) {
    console.error('❌ seed 失敗:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
