#!/usr/bin/env node
/**
 * PreToolUse hook: 依據檔案路徑與當前分支注入對應規則
 * 觸發條件：Edit 或 Write 工具
 * 取代原本的 openspec-code-guard.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const filePath = (data.tool_input && (data.tool_input.file_path || data.tool_input.filePath)) || '';
    const normalized = filePath.replace(/\\/g, '/');

    // 排除 meta 檔案（不注入規則）
    const isMeta =
      normalized.includes('/.claude/') ||
      normalized.includes('/openspec/STATUS') ||
      normalized.endsWith('CLAUDE.md');
    if (isMeta) process.exit(0);

    // 取得當前分支
    let branch = 'unknown';
    try {
      branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    } catch (_) {}

    // 決定注入哪些規則
    const rulesToLoad = ['workflow'];

    if (/\/(public|frontend)\//.test(normalized)) {
      rulesToLoad.push('frontend');
    } else if (/\/server\/services\//.test(normalized)) {
      rulesToLoad.push('backend', 'database');
    } else if (/\/server\//.test(normalized)) {
      rulesToLoad.push('backend');
    } else if (/\/(zbpack|_worker|_redirects|wrangler|\.env)/.test(normalized)) {
      rulesToLoad.push('deploy');
    }

    if (branch === 'main') rulesToLoad.push('main');
    else if (branch === 'dev') rulesToLoad.push('deploy');

    // 讀取並合併規則內容
    const rulesDir = path.join(__dirname, '../rules');
    const contents = [];
    for (const rule of rulesToLoad) {
      const rulePath = path.join(rulesDir, `${rule}.md`);
      if (fs.existsSync(rulePath)) {
        contents.push(fs.readFileSync(rulePath, 'utf8'));
      }
    }

    if (contents.length > 0) {
      const output = {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          additionalContext:
            `📋 [Rules Injector] 注入規則：${rulesToLoad.join(', ')}（分支：${branch}）\n\n` +
            contents.join('\n\n---\n\n')
        }
      };
      process.stdout.write(JSON.stringify(output) + '\n');
    }
  } catch (_) {
    // 靜默略過
  }
});
