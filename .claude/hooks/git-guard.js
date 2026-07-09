#!/usr/bin/env node
/**
 * PreToolUse hook (Bash) — git 操作守衛
 *
 * 攔截三類危險操作：
 * 1. git add -A 或 git add .（孤立的點）→ deny；git add .claude/ 等路徑不受影響
 * 2. git commit 在 main 分支且 staged 有功能程式碼（server/、frontend/ 等）→ deny
 *    規則類（.claude/、CLAUDE.md、CHANGELOG.md、scripts/、.gitignore）允許直推，不攔截
 * 3. git push origin main → 顯示 deploy.md checklist（警告，不攔截；push 本來就有人工確認流程）
 */
const { execSync } = require('child_process');

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const command = (data.tool_input && data.tool_input.command) || '';
    const denyReasons = [];

    // ── 1. git add -A 或 git add .（孤立的點，非路徑前綴）─────────────
    // 將 command 切成各段（&&、||、;、換行），只比對每段開頭的 git add 指令，
    // 避免 heredoc commit message 內出現「git add .」文字時誤觸發。
    const cmdSegments = command.split(/&&|\|\|?|;|\n/);
    const isGitAddForbidden = cmdSegments.some(seg => {
      const t = seg.trimStart();
      return /^git add\s+-A\b/.test(t) || /^git add\s+\.(?![/\w])/.test(t);
    });
    if (isGitAddForbidden) {
      denyReasons.push(
        '⛔ [git-guard] 禁止使用 git add -A 或 git add .（deploy.md 明文規定）',
        '原因：可能意外加入 .env、Key/、金鑰 *.json 等機密檔案。',
        '正確做法：git add <具體檔案路徑>'
      );
    }

    // ── 2. 在 main 直接 commit 功能程式碼 ────────────────────────────────
    // 只攔截產品程式碼；規則類（.claude/、CLAUDE.md、CHANGELOG.md、scripts/、.gitignore 等）允許直推
    if (/git commit\b/.test(command)) {
      let branch = '';
      try { branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim(); } catch (_) {}

      if (branch === 'main') {
        let staged = '';
        try { staged = execSync('git diff --name-only --cached', { encoding: 'utf8' }); } catch (_) {}
        const productCode = staged.split('\n').filter(f => {
          const file = f.trim();
          if (!file) return false;
          return /^(server|frontend|public)\//.test(file) ||
            /^(package\.json|package-lock\.json|_worker\.js|vercel\.json|zbpack\.json|wrangler\.toml)$/.test(file) ||
            /\/(migrations|schema|seeds)\//.test(file);
        });

        if (productCode.length > 0) {
          denyReasons.push(
            '⛔ [git-guard] 當前在 main 分支，staged 中有功能程式碼：',
            ...productCode.map(f => `  - ${f}`),
            '',
            '禁止在 main 直接 commit 功能程式碼！',
            '正確做法：切到對應 m_b_* 功能分支再 commit。',
            '（.claude/、CLAUDE.md、CHANGELOG.md、scripts/、.gitignore 等規則類是例外）'
          );
        }
      }
    }

    if (denyReasons.length > 0) {
      const output = {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: denyReasons.join('\n')
        }
      };
      process.stdout.write(JSON.stringify(output) + '\n');
      process.exit(0);
    }

    // ── 3. 推送到 main（警告，不攔截）────────────────────────────────────
    if (/git push\b.*\borigin\b.*\bmain\b/.test(command) && !/--delete/.test(command)) {
      const messages = [
        '🔴 [git-guard] 推送 main 前必須完成 deploy.md checklist（缺一不可）：',
        '  1. now.md 已更新，且與本次 push 同一個 commit',
        '  2. 機密檢查：git status 確認無 .env / Key/ / 金鑰 *.json',
        '  3. 使用者已明確確認（列出推送清單等待口頭 OK）',
        '',
        '  push 完成後 → 立刻執行全分支 sync（deploy.md「main 推送後同步規則」）',
        '  → 不可只 cherry-pick 到特定分支，必須 merge main 到所有 m_b_*'
      ];
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
