/**
 * KJ Survey 後台 LINE Login（Change 20 v4，D-A 真驗簽 + 自簽 JWT）
 * 獨立於主系統 /api/auth/line-login，經 Worker proxy 去前綴後對應本服務路徑（D-H）：
 *   登入入口   {FRONTEND_URL}/survey-api/admin-auth/line-login
 *   LINE callback {FRONTEND_URL}/survey-api/admin-auth/line-callback
 */
const express = require('express');
const router = express.Router();
const adminAuthService = require('../services/adminAuthService');
const env = require('../config/env');
const { asyncHandler } = require('../middleware/asyncHandler');

const redirectWithError = (res, code) => res.redirect(`${env.FRONTEND_URL}/admin?authError=${code}`);

/**
 * GET /admin-auth/line-login — 導向 LINE 授權頁
 */
router.get('/line-login', (req, res) => {
  res.redirect(adminAuthService.buildLineLoginUrl());
});

/**
 * GET /admin-auth/line-callback
 * state 白名單（H-2）：state 只含 nonce/iat/exp，不參與決定 redirect 目標，
 * 成功/失敗目的地一律由後端 FRONTEND_URL 固定組出，杜絕 open redirect。
 */
router.get('/line-callback', asyncHandler(async (req, res) => {
  const { code, state, error } = req.query;

  if (error || !code || !state) {
    return redirectWithError(res, 'missing_params');
  }

  if (!adminAuthService.verifyAndConsumeState(state)) {
    return redirectWithError(res, 'invalid_state');
  }

  let idToken;
  try {
    idToken = await adminAuthService.exchangeCodeForIdToken(code);
  } catch {
    return redirectWithError(res, 'token_exchange_failed');
  }

  let claims;
  try {
    claims = await adminAuthService.verifyLineIdToken(idToken);
  } catch {
    return redirectWithError(res, 'verify_failed');
  }

  const role = await adminAuthService.getMemberRole(claims.sub);
  if (!adminAuthService.isAdminRole(role)) {
    return redirectWithError(res, 'forbidden');
  }

  const token = adminAuthService.issueAdminJwt(claims.sub);
  res.redirect(`${env.FRONTEND_URL}/admin#token=${token}`);
}));

module.exports = router;
