#!/usr/bin/env node
/**
 * PreToolUse hook: 依據檔案路徑與當前分支輸出規則提示
 * 觸發條件：Edit、Write（實作/修 bug）、Read（需求探索，僅前端路徑）
 *
 * 前端路徑特例：直接注入 UIDESIGN.md，不透過 frontend.md 二次轉介，
 * 避免 Claude 忽略 frontend.md 裡「請讀 UIDESIGN.md」的間接提示。
 */
const { execSync } = require('child_process');

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const toolName = (data.tool_name || '').toLowerCase();
    const filePath = (data.tool_input && (data.tool_input.file_path || data.tool_input.filePath)) || '';
    const normalized = filePath.replace(/\\/g, '/');

    const isMeta =
      normalized.includes('/.claude/') ||
      normalized.includes('/openspec/STATUS') ||
      normalized.endsWith('CLAUDE.md');
    if (isMeta) process.exit(0);

    const isRead = toolName === 'read';
    const isFrontend = /\/(public|frontend)\//.test(normalized);

    // Read 工具只在前端路徑注入，其他路徑略過（避免噪音）
    if (isRead && !isFrontend) process.exit(0);

    let branch = 'unknown';
    try {
      branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    } catch (_) {}

    const rules = [];

    if (isFrontend) {
      // Edit/Write 補上 frontend.md（開發規範）；Read 不加（探索階段只需 UI 規範）
      if (!isRead) rules.push('.claude/rules/frontend.md');
      // 直接注入 UIDESIGN.md，不透過 frontend.md 間接提示
      rules.push('.claude/rules/UIDESIGN.md');
    } else if (/\/server\/services\//.test(normalized)) {
      rules.push('.claude/rules/backend.md', '.claude/rules/database.md');
    } else if (/\/server\//.test(normalized)) {
      rules.push('.claude/rules/backend.md');
    } else if (/\/(zbpack|_worker|_redirects|wrangler|\.env)/.test(normalized)) {
      rules.push('.claude/rules/deploy.md');
    }

    // main 分支警告只在實際修改（Edit/Write）時才加，Read 不加
    if (!isRead && branch === 'main') rules.push('.claude/rules/main.md');

    if (rules.length > 0) {
      let msg;
      if (isFrontend) {
        msg = isRead
          ? `🎨 前端 UI 探索 — 設計規範必須優先讀取，再分析元件：${rules.join('、')}（分支：${branch}）`
          : `🎨 前端 UI 實作 — 必須立即 Read 以下規則，不可略過：${rules.join('、')}（分支：${branch}）`;
      } else {
        msg = `📋 相關規則（需要時用 Read 讀取）：${rules.join('、')}（分支：${branch}）`;
      }

      const output = {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          additionalContext: msg
        }
      };
      process.stdout.write(JSON.stringify(output) + '\n');
    }
  } catch (_) {}
});
