#!/usr/bin/env node
/**
 * PreToolUse hook (Bash) — git 操作守衛
 *
 * 攔截三類危險操作：
 * 1. git push origin main → 強制顯示 deploy.md checklist
 * 2. git commit 在 dev / main 分支且 staged 有非 .claude/ 檔案 → 分支守衛
 * 3. git add -A 或 git add . → 禁止（deploy.md 明文規定，避免意外加入機密）
 */
const { execSync } = require('child_process');

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const command = (data.tool_input && data.tool_input.command) || '';
    const messages = [];

    // ── 1. 推送到 main ────────────────────────────────────────────────────
    if (/git push\b.*\borigin\b.*\bmain\b/.test(command) && !/--delete/.test(command)) {
      messages.push(
        '🔴 [git-guard] 推送 main 前必須完成 deploy.md checklist（缺一不可）：',
        '  1. now.md 已更新，且與本次 push 同一個 commit',
        '  2. 機密檢查：git status 確認無 .env / Key/ / 金鑰 *.json',
        '  3. 使用者已明確確認（列出推送清單等待口頭 OK）',
        '',
        '  push 完成後 → 立刻執行全分支 sync（deploy.md「main 推送後同步規則」）',
        '  → 不可只 cherry-pick 到特定分支，必須 merge main 到所有 dev + m_b_*'
      );
    }

    // ── 2. 在 dev / main 直接 commit 非 .claude/ 的變更 ──────────────────
    if (/git commit\b/.test(command)) {
      let branch = '';
      try { branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim(); } catch (_) {}

      if (branch === 'dev' || branch === 'main') {
        let staged = '';
        try { staged = execSync('git diff --name-only --cached', { encoding: 'utf8' }); } catch (_) {}
        const nonClaude = staged.split('\n').filter(f => f.trim() && !f.startsWith('.claude/'));

        if (nonClaude.length > 0) {
          messages.push(
            `⛔ [git-guard] 當前在 ${branch} 分支，staged 中有非 .claude/ 的變更：`,
            ...nonClaude.map(f => `  - ${f}`),
            '',
            `禁止在 ${branch} 直接 commit 功能程式碼！`,
            '正確做法：切到對應 m_b_* 功能分支再 commit。',
            '（.claude/ 內的規則類檔案是唯一例外，允許任何分支 commit 後 cherry-pick 到 main）'
          );
        }
      }
    }

    // ── 3. git add -A 或 git add . ────────────────────────────────────────
    if (/git add\s+(-A|\.)\b/.test(command)) {
      messages.push(
        '⛔ [git-guard] 禁止使用 git add -A 或 git add .（deploy.md 明文規定）',
        '原因：可能意外加入 .env、Key/、金鑰 *.json 等機密檔案。',
        '正確做法：git add <具體檔案路徑>'
      );
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
