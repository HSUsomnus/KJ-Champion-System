#!/usr/bin/env node
/**
 * PreToolUse hook: 依據檔案路徑與當前分支提醒載入對應 skill
 * 觸發條件：Edit、Write（matcher 已移除 Read，change 22 起）
 *
 * 只提醒「載入 skill」，不再命令必須立即 Read 特定規則檔——
 * 規則內容已搬進 .claude/skills/*，由 Claude 自行判斷是否已載入。
 */
const { execSync } = require('child_process');

const SKILL_MAP = [
  { pattern: /\/(public|frontend)\//, skill: 'uidesign', label: '🎨 前端 UI' },
  { pattern: /\/server\/services\//, skill: 'database', label: '🗄️ 資料庫服務' },
  { pattern: /\/server\//, skill: 'database', label: '🗄️ 後端' },
  { pattern: /\/(zbpack|_worker|_redirects|wrangler|\.env)/, skill: 'deploy-release', label: '🚀 部署設定' },
];

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const filePath = (data.tool_input && (data.tool_input.file_path || data.tool_input.filePath)) || '';
    const normalized = filePath.replace(/\\/g, '/');

    const isMeta =
      normalized.includes('/.claude/') ||
      normalized.endsWith('CLAUDE.md');
    if (isMeta) process.exit(0);

    let branch = 'unknown';
    try {
      branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    } catch (_) {}

    const match = SKILL_MAP.find(m => m.pattern.test(normalized));
    const messages = [];

    if (match) {
      messages.push(`${match.label} — 若尚未載入 ${match.skill} skill，請先載入（分支：${branch}）`);
    }

    if (branch === 'main') {
      messages.push('⚠️ 目前在 main 分支，任何修改都直接影響真實用戶——若尚未載入 deploy-release skill，請先載入（內含 main 分支限制）');
    }

    if (messages.length > 0) {
      const output = {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          additionalContext: messages.join('\n')
        }
      };
      process.stdout.write(JSON.stringify(output) + '\n');
    }
  } catch (_) {}
});
