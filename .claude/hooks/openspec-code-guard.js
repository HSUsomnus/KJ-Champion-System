#!/usr/bin/env node
/**
 * PreToolUse hook: 修改程式碼檔案前，強制提醒確認 OpenSpec 任務授權
 * 觸發條件：Edit 或 Write 工具，且目標檔案是 server/ 或 public/ 的程式碼
 */
let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const filePath = (data.tool_input && (data.tool_input.file_path || data.tool_input.filePath)) || '';
    const normalized = filePath.replace(/\\/g, '/');

    // 只攔截 server/ 和 public/ 的程式碼檔案
    const isCodeFile = /\/(server|public)\//.test(normalized)
      && !normalized.includes('openspec')
      && !normalized.includes('.claude');

    if (isCodeFile) {
      const output = {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          additionalContext: [
            '⛔ [OpenSpec Guard] 你即將修改程式碼檔案：' + normalized,
            '',
            '修改前必須確認以下三點，缺一不可：',
            '1. 已執行 `openspec status --json` 確認目前進行中的 change',
            '2. 此修改對應 tasks.md 中某個 [ ] 未完成的 task',
            '3. 該 task 的所有前置 task 均已完成 [x]',
            '',
            '如果使用者問的是診斷問題（為什麼 X 不運作？） → 只分析回報，不動程式碼。',
            '如果無法對應任何 task → 停下來，告知使用者，等待指示。'
          ].join('\n')
        }
      };
      process.stdout.write(JSON.stringify(output) + '\n');
    }
  } catch (_) {
    // 靜默略過
  }
});
