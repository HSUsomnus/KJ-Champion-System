/**
 * /api/debug/* — 自檢端點（僅 NODE_ENV !== 'production' 開放）
 *
 * GET /api/debug/health
 *   回傳 JSON：{ ok, ts, checks: { credentials, token, calendar, db } }
 *   每個 check：{ ok, detail }
 *
 * 用途：部署到 Zeabur DEV 後，直接用瀏覽器打這個 URL
 *       確認 Google Auth / Calendar API / DB 三層是否正常。
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const https = require('https');
const db = require('../config/db');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

// ── JWT 自簽並換取 token（複製自 googleAuth.js 核心邏輯）────────────
const b64u = (v) =>
  Buffer.from(typeof v === 'string' ? v : JSON.stringify(v))
    .toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const exchangeToken = (creds) =>
  new Promise((resolve, reject) => {
    const now = Math.floor(Date.now() / 1000);
    const unsigned = [
      b64u({ alg: 'RS256', typ: 'JWT', kid: creds.private_key_id }),
      b64u({
        iss: creds.client_email,
        scope: 'https://www.googleapis.com/auth/calendar',
        aud: TOKEN_URL,
        iat: now,
        exp: now + 3600,
      }),
    ].join('.');
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsigned);
    const assertion = `${unsigned}.${b64u(signer.sign(creds.private_key))}`;
    const body = Buffer.from(
      `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer` +
        `&assertion=${encodeURIComponent(assertion)}`
    );
    const req = https.request(
      {
        hostname: 'oauth2.googleapis.com',
        port: 443,
        path: '/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': body.length,
        },
        timeout: 12000,
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            const json = JSON.parse(raw);
            json.access_token ? resolve(json) : reject(new Error(`${res.statusCode}: ${raw}`));
          } catch {
            reject(new Error(`parse error: ${raw}`));
          }
        });
      }
    );
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout 12s')); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

const calendarGet = (path, token) =>
  new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'www.googleapis.com',
        port: 443,
        path,
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        timeout: 12000,
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
          catch { resolve({ status: res.statusCode, body: raw }); }
        });
      }
    );
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout 12s')); });
    req.on('error', reject);
    req.end();
  });

// ── Route ────────────────────────────────────────────────────────────
router.get('/health', async (req, res) => {
  const checks = {};
  let accessToken = null;

  // 【1】憑證解析 + Private Key 簽名
  try {
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}');
    if (!creds.client_email || !creds.private_key) throw new Error('欄位缺失');
    // 測試簽名
    const s = crypto.createSign('RSA-SHA256');
    s.update('test');
    s.sign(creds.private_key);
    checks.credentials = {
      ok: true,
      detail: `SA=${creds.client_email} / project=${creds.project_id}`,
      token_uri_in_json: creds.token_uri || '（未設）',
    };
  } catch (e) {
    checks.credentials = { ok: false, detail: e.message };
  }

  // 【2】Google Token 換取
  if (checks.credentials?.ok) {
    try {
      const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      const data = await exchangeToken(creds);
      accessToken = data.access_token;
      checks.token = { ok: true, detail: `expires_in=${data.expires_in}s` };
    } catch (e) {
      checks.token = { ok: false, detail: e.message };
    }
  } else {
    checks.token = { ok: false, detail: '跳過（credentials 失敗）' };
  }

  // 【3】Google Calendar API
  if (accessToken) {
    const calId = process.env.GROUP_CALENDAR_ID;
    if (!calId) {
      checks.calendar = { ok: false, detail: 'GROUP_CALENDAR_ID 未設' };
    } else {
      try {
        const r = await calendarGet(
          `/calendar/v3/calendars/${encodeURIComponent(calId)}`,
          accessToken
        );
        if (r.body?.error) {
          checks.calendar = {
            ok: false,
            detail: `${r.body.error.code} ${r.body.error.message}`,
          };
        } else {
          checks.calendar = { ok: true, detail: `日曆="${r.body.summary}"` };
        }
      } catch (e) {
        checks.calendar = { ok: false, detail: e.message };
      }
    }
  } else {
    checks.calendar = { ok: false, detail: '跳過（token 失敗）' };
  }

  // 【4】資料庫
  try {
    const r = await db.query('SELECT COUNT(*) AS cnt FROM events');
    checks.db = { ok: true, detail: `events=${r.rows[0].cnt} 筆` };
  } catch (e) {
    checks.db = { ok: false, detail: e.message };
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  res.status(allOk ? 200 : 503).json({
    ok: allOk,
    ts: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    checks,
  });
});

module.exports = router;
