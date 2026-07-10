#!/usr/bin/env node
/**
 * PostToolUse hook (Bash) — push main 後全分支 sync 提醒
 *
 * 任何 git push 到 main 完成後，提醒執行 scripts/sync-branches.sh。
 * 這是「push 完不 sync = 規則違反」的最後一道提醒。
 */
let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const command = (data.tool_input && data.tool_input.command) || '';

    if (/git push\b.*\borigin\b.*\bmain\b/.test(command) && !/--delete/.test(command)) {
      const output = {
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: [
            '⚡ [post-push-sync] main 已推送 → 立即執行：bash scripts/sync-branches.sh',
            '⚠️ 執行前確認所有 worktree 內無未儲存的工作。結果中若有 -X theirs 分支，必須回報使用者。'
          ].join('\n')
        }
      };
      process.stdout.write(JSON.stringify(output) + '\n');
    }
  } catch (_) {}
});
