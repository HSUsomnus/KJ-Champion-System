#!/usr/bin/env node
/**
 * SessionStart hook — 殘留 .session-role 標記提示
 *
 * 讀 .claude/.session-role；存在則輸出角色 + 距今寫入時間 + 殘留提醒，
 * 讓新 session 開場就知道有這個標記，不必等到被 role-guard 攔下才發現。
 * fail-open：任何錯誤一律 exit 0，與 role-guard 同哲學（紀律輔助不是安全底線）。
 */
const fs = require('fs');
const path = require('path');

try {
  const filePath = path.join('.claude', '.session-role');
  const role = fs.readFileSync(filePath, 'utf8').trim();
  if (!role) process.exit(0);

  const mtimeMs = fs.statSync(filePath).mtimeMs;
  const hoursAgo = (Date.now() - mtimeMs) / (1000 * 60 * 60);
  const hoursText = hoursAgo < 1
    ? `${Math.round(hoursAgo * 60)} 分鐘前`
    : `${hoursAgo.toFixed(1)} 小時前`;

  process.stdout.write(
    `[session-role-notice] 偵測到殘留角色標記：${role}（寫入於約 ${hoursText}）。` +
    `若此標記是前一個 session 的殘留，請與使用者確認沿用或刪除 .claude/.session-role；` +
    `殘留會攔截 push main 等操作。\n`
  );
  process.exit(0);
} catch (_) {
  process.exit(0);
}
