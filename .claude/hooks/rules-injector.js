#!/usr/bin/env node
/**
 * PreToolUse hook: 依據檔案路徑與當前分支輸出 1 行規則提示
 * 觸發條件：Edit 或 Write 工具
 * Claude 收到提示後主動 Read 對應規則檔，不在此注入全文。
 */
const { execSync } = require('child_process');

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const filePath = (data.tool_input && (data.tool_input.file_path || data.tool_input.filePath)) || '';
    const normalized = filePath.replace(/\\/g, '/');

    const isMeta =
      normalized.includes('/.claude/') ||
      normalized.includes('/openspec/STATUS') ||
      normalized.endsWith('CLAUDE.md');
    if (isMeta) process.exit(0);

    let branch = 'unknown';
    try {
      branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    } catch (_) {}

    const rules = [];

    if (/\/(public|frontend)\//.test(normalized)) {
      rules.push('.claude/rules/frontend.md');
    } else if (/\/server\/services\//.test(normalized)) {
      rules.push('.claude/rules/backend.md', '.claude/rules/database.md');
    } else if (/\/server\//.test(normalized)) {
      rules.push('.claude/rules/backend.md');
    } else if (/\/(zbpack|_worker|_redirects|wrangler|\.env)/.test(normalized)) {
      rules.push('.claude/rules/deploy.md');
    }

    if (branch === 'main') rules.push('.claude/rules/main.md');

    if (rules.length > 0) {
      const output = {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          additionalContext: `📋 相關規則（需要時用 Read 讀取）：${rules.join('、')}（分支：${branch}）`
        }
      };
      process.stdout.write(JSON.stringify(output) + '\n');
    }
  } catch (_) {}
});
