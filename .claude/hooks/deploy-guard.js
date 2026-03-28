#!/usr/bin/env node
/**
 * PreToolUse hook: 攔截 git 指令，注入部署規則
 * 觸發條件：Bash 工具，指令含 git push / commit / add
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const command = (data.tool_input && data.tool_input.command) || '';

    const isGitOp = /git\s+(push|commit|add)/.test(command);
    if (!isGitOp) process.exit(0);

    let branch = 'unknown';
    try {
      branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    } catch (_) {}

    const rulesDir = path.join(__dirname, '../rules');
    const rulesToLoad = ['deploy'];
    if (branch === 'main') rulesToLoad.push('main');
    else if (branch === 'dev') rulesToLoad.push('deploy');

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
            `🚀 [Deploy Guard] git 操作偵測（分支：${branch}），注入規則：${rulesToLoad.join(', ')}\n\n` +
            contents.join('\n\n---\n\n')
        }
      };
      process.stdout.write(JSON.stringify(output) + '\n');
    }
  } catch (_) {
    // 靜默略過
  }
});
