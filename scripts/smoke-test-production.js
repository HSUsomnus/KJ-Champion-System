/**
 * scripts/smoke-test-production.js
 * Task 2d.3 — 正式環境 API 冒煙測試
 *
 * 用法：
 *   node scripts/smoke-test-production.js
 *   BASE_URL=https://your-url.vercel.app node scripts/smoke-test-production.js
 *
 * 通過條件：所有端點回傳 HTTP 200，且回應為陣列（或有 data 欄位）
 */

const BASE_URL = process.env.BASE_URL || 'https://line-liff-calendar.vercel.app';

let passed = 0;
let failed = 0;

function log(msg) {
  process.stdout.write(`[${new Date().toISOString().substring(11, 19)}] ${msg}\n`);
}
function ok(msg)   { passed++; log(`  ✓ ${msg}`); }
function fail(msg) { failed++; log(`  ✗ FAIL: ${msg}`); }

async function testEndpoint({ label, path, validate }) {
  const url = `${BASE_URL}${path}`;
  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      fail(`${label}: HTTP ${res.status} (${url})`);
      return;
    }
    const body = await res.json().catch(() => null);
    if (validate && !validate(body)) {
      fail(`${label}: 回應格式不符預期 → ${JSON.stringify(body).substring(0, 120)}`);
      return;
    }
    const count = Array.isArray(body)
      ? body.length
      : Array.isArray(body?.data) ? body.data.length
      : Array.isArray(body?.events) ? body.events.length
      : Array.isArray(body?.members) ? body.members.length
      : '(非陣列)';
    ok(`${label}: HTTP ${res.status}，${typeof count === 'number' ? count + ' 筆' : count}`);
  } catch (err) {
    fail(`${label}: ${err.message} (${url})`);
  }
}

// ──────────────────────────────────────────────
// 測試清單（Task 2d.3 必測項目）
// ──────────────────────────────────────────────
function toDateStr(offsetDays) {
  return new Date(Date.now() + offsetDays * 86400e3).toISOString().substring(0, 10);
}

const TESTS = [
  {
    label: 'GET /api/members',
    path: '/api/members',
    // 後端回傳 {success, data:[...]} 或直接 [...]
    validate: body => Array.isArray(body) || Array.isArray(body?.data) || Array.isArray(body?.members),
  },
  {
    label: 'GET /api/calendar/events（近 30 天）',
    // 參數名稱為 startDate / endDate，格式 YYYY-MM-DD
    path: `/api/calendar/events?startDate=${toDateStr(-15)}&endDate=${toDateStr(15)}`,
    validate: body => Array.isArray(body) || Array.isArray(body?.data) || Array.isArray(body?.events),
  },
];

async function main() {
  log(`=== Task 2d.3 正式環境冒煙測試 ===`);
  log(`目標：${BASE_URL}`);
  log('');

  for (const test of TESTS) {
    await testEndpoint(test);
  }

  log('');
  log('══════════════════════════════════════');
  if (failed === 0) {
    log(`✅ 全部通過（${passed} 項）— 正式後端連接 Zeabur DB 正常`);
  } else {
    log(`❌ ${failed} 項未通過，${passed} 項通過`);
    log('   請確認 Vercel 環境變數已更新並重新部署，再執行此腳本');
    process.exit(1);
  }
  log('══════════════════════════════════════');
}

main();
