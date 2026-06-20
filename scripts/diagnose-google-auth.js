#!/usr/bin/env node
/**
 * 診斷腳本：Google Auth + Calendar API + DB 逐步測試
 * 執行：node scripts/diagnose-google-auth.js
 */
require('dotenv').config();
const crypto = require('crypto');
const https = require('https');
const net = require('net');

const SEP = '='.repeat(60);
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

// ── Helpers ────────────────────────────────────────────────
const b64u = (v) =>
  Buffer.from(typeof v === 'string' ? v : JSON.stringify(v))
    .toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const httpsRequest = (method, hostname, path, headers, body) =>
  new Promise((resolve, reject) => {
    const opts = { hostname, port: 443, path, method, headers, timeout: 12000 };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout 12s')); });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });

const tcpTest = (host, port) =>
  new Promise((resolve) => {
    const sock = net.createConnection({ host, port });
    sock.setTimeout(5000);
    sock.on('connect', () => { sock.destroy(); resolve(true); });
    sock.on('error', () => resolve(false));
    sock.on('timeout', () => { sock.destroy(); resolve(false); });
  });

// ── Main ───────────────────────────────────────────────────
async function main() {
  let pass = 0, fail = 0;
  const result = (ok, label, detail = '') => {
    if (ok) { pass++; console.log(`✅ ${label}${detail ? ' — ' + detail : ''}`); }
    else    { fail++; console.error(`❌ ${label}${detail ? ' — ' + detail : ''}`); }
    return ok;
  };

  console.log(SEP);
  console.log('Google Auth + Calendar API + DB 診斷腳本');
  console.log(new Date().toISOString());
  console.log(SEP);

  // ── 【1】解析憑證 ──────────────────────────────────────────
  console.log('\n【1】解析 GOOGLE_SERVICE_ACCOUNT_JSON');
  const credJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!credJson) { result(false, 'GOOGLE_SERVICE_ACCOUNT_JSON 存在'); process.exit(1); }

  let creds;
  try {
    creds = JSON.parse(credJson);
    result(true, 'JSON 格式正確');
    console.log('   client_email  :', creds.client_email);
    console.log('   project_id    :', creds.project_id);
    console.log('   token_uri(JSON):', creds.token_uri, '← 這裡若是 v4 就是根本原因');
    console.log('   private_key_id:', creds.private_key_id);
  } catch (e) {
    result(false, 'JSON 格式正確', e.message);
    process.exit(1);
  }

  // ── 【2】Private Key 簽名測試 ─────────────────────────────
  console.log('\n【2】Private Key 可用性');
  let jwtAssertion;
  try {
    const now = Math.floor(Date.now() / 1000);
    const header  = b64u({ alg: 'RS256', typ: 'JWT', kid: creds.private_key_id });
    const payload = b64u({
      iss: creds.client_email,
      scope: 'https://www.googleapis.com/auth/calendar',
      aud: TOKEN_URL,          // ← 正確 aud
      iat: now,
      exp: now + 3600,
    });
    const toSign = `${header}.${payload}`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(toSign);
    const sig = b64u(signer.sign(creds.private_key));
    jwtAssertion = `${toSign}.${sig}`;
    result(true, 'RSA-SHA256 簽名成功');
  } catch (e) {
    result(false, 'RSA-SHA256 簽名', e.message);
    console.log('   可能原因：private_key 格式錯誤或已撤銷');
    process.exit(1);
  }

  // ── 【3】TCP 連線到 Google ─────────────────────────────────
  console.log('\n【3】TCP 連線 oauth2.googleapis.com:443');
  const tcpOk = await tcpTest('oauth2.googleapis.com', 443);
  result(tcpOk, 'TCP 連線成功');
  if (!tcpOk) {
    console.log('   網路層問題：Zeabur 或本機無法連到 Google');
    process.exit(1);
  }

  // ── 【4】Token 換取（我們自己的實作，正確 aud）────────────
  console.log('\n【4】POST oauth2.googleapis.com/token（自製 JWT，aud 正確）');
  let accessToken;
  try {
    const body = Buffer.from(
      `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer` +
      `&assertion=${encodeURIComponent(jwtAssertion)}`
    );
    const res = await httpsRequest(
      'POST', 'oauth2.googleapis.com', '/token',
      { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': body.length },
      body
    );
    if (res.body?.access_token) {
      accessToken = res.body.access_token;
      result(true, 'Access Token 換取成功', `expires_in=${res.body.expires_in}s`);
    } else {
      result(false, 'Access Token 換取', JSON.stringify(res.body));
      console.log('   可能原因：SA 金鑰已撤銷 / 專案沒有 Calendar API');
    }
  } catch (e) {
    result(false, 'Access Token 換取', e.message);
  }

  // ── 【5】Calendar API 測試 ────────────────────────────────
  if (accessToken) {
    console.log('\n【5】Google Calendar API');
    const calId = process.env.GROUP_CALENDAR_ID;
    if (!calId) {
      console.warn('   ⚠️  GROUP_CALENDAR_ID 未設，跳過');
    } else {
      console.log('   calendar_id:', calId);
      try {
        const encoded = encodeURIComponent(calId);
        const res = await httpsRequest(
          'GET', 'www.googleapis.com', `/calendar/v3/calendars/${encoded}`,
          { Authorization: `Bearer ${accessToken}` }
        );
        if (res.body?.error) {
          result(false, 'Calendar API', `${res.body.error.code} ${res.body.error.message}`);
          console.log('   常見原因：SA 未共用給該日曆 / Calendar API 未啟用');
        } else {
          result(true, 'Calendar API 正常', `日曆名稱="${res.body.summary}"`);
        }

        // 也列出最近 3 筆 events
        const now = new Date().toISOString();
        const evRes = await httpsRequest(
          'GET', 'www.googleapis.com',
          `/calendar/v3/calendars/${encoded}/events?maxResults=3&singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(now)}`,
          { Authorization: `Bearer ${accessToken}` }
        );
        if (evRes.body?.items) {
          console.log(`   接下來 ${evRes.body.items.length} 筆行程：`);
          evRes.body.items.forEach((e) => console.log(`     - ${e.summary} (${e.start?.dateTime || e.start?.date})`));
        }
      } catch (e) {
        result(false, 'Calendar API', e.message);
      }
    }
  }

  // ── 【6】DB 連線 ──────────────────────────────────────────
  console.log('\n【6】資料庫連線');
  const dbUrl = process.env.DEV_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn('   ⚠️  DEV_DATABASE_URL / DATABASE_URL 未設，跳過');
  } else {
    try {
      const { Pool } = require('pg');
      const pool = new Pool({ connectionString: dbUrl, connectionTimeoutMillis: 6000 });
      const r = await pool.query('SELECT COUNT(*) AS cnt FROM events');
      result(true, 'DB 連線成功', `events 共 ${r.rows[0].cnt} 筆`);
      await pool.end();
    } catch (e) {
      result(false, 'DB 連線', e.message);
    }
  }

  // ── 結果 ──────────────────────────────────────────────────
  console.log('\n' + SEP);
  console.log(`診斷完成：${pass} 通過 / ${fail} 失敗`);
  console.log(SEP);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => { console.error('未預期錯誤:', err); process.exit(1); });
