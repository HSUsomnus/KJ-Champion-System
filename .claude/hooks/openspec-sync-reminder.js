#!/usr/bin/env node
/**
 * PostToolUse hook: 偵測 openspec 文件被修改，提醒同步所有文件
 * 輸出 additionalContext 注入模型上下文
 */
let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const filePath = (data.tool_input && (data.tool_input.file_path || data.tool_input.filePath)) || '';
    const match = filePath.replace(/\\/g, '/').match(/openspec\/changes\/([^/]+)\//);
    if (match) {
      const changeName = match[1];
      const output = {
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: `[openspec-sync] change "${changeName}" 的文件已被修改（${filePath}）。若其他文件需要同步更新，請執行 /openspec-sync-docs ${changeName}`
        }
      };
      process.stdout.write(JSON.stringify(output) + '\n');
    }
  } catch (_) {
    // 非 JSON 或無 file_path，靜默略過
  }
});
