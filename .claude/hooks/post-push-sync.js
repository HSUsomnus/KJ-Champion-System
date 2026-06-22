#!/usr/bin/env node
/**
 * PostToolUse hook (Bash) — push main 後全分支 sync 提醒
 *
 * 任何 git push 到 main 完成後，輸出完整的同步腳本。
 * 這是「push 完不 sync = 規則違反」的最後一道提醒。
 */
let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const command = (data.tool_input && data.tool_input.command) || '';

    if (/git push\b.*\borigin\b.*\bmain\b/.test(command) && !/--delete/.test(command)) {
      const syncScript = [
        'git fetch origin --prune',
        '# 同步所有遠端 m_b_* 分支',
        "for branch in $(git ls-remote --heads origin 'refs/heads/m_b_*' | sed 's|.*refs/heads/||'); do",
        '  git checkout -B "$branch" "origin/$branch"',
        '  git merge main --no-edit && git push origin "$branch" || git merge --abort',
        'done',
        'git checkout main'
      ].join('\n');

      const output = {
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: [
            '⚡ [post-push-sync] main 已推送 → 立即執行全分支 sync（必做，不可跳過）',
            '⚠️  執行前：確認所有 worktree 內無未儲存的工作',
            '',
            '```bash',
            syncScript,
            '```',
            '',
            '衝突時改用 -X theirs：git merge main -X theirs --no-edit',
            '完成後必須在回報中列出哪些分支用了 -X theirs、被覆蓋了什麼。'
          ].join('\n')
        }
      };
      process.stdout.write(JSON.stringify(output) + '\n');
    }
  } catch (_) {}
});
