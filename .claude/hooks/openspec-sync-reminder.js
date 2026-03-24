#!/usr/bin/env node
/**
 * PostToolUse hook: 雙向 OpenSpec 同步提醒
 * 1. 修改 OpenSpec 文件 → 提醒同步其他文件
 * 2. 修改非 OpenSpec 程式碼 → 提醒更新 design.md / tasks.md
 */
let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const filePath = (data.tool_input && (data.tool_input.file_path || data.tool_input.filePath)) || '';
    const normalizedPath = filePath.replace(/\\/g, '/');

    const openspecMatch = normalizedPath.match(/openspec\/changes\/([^/]+)\//);

    if (openspecMatch) {
      // 修改的是 OpenSpec 文件 → 提醒同步其他文件
      const changeName = openspecMatch[1];
      const output = {
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: `[openspec-sync] change "${changeName}" 的文件已被修改（${filePath}）。若其他文件需要同步更新，請執行 /openspec-sync-docs ${changeName}`
        }
      };
      process.stdout.write(JSON.stringify(output) + '\n');
    } else if (
      normalizedPath &&
      !normalizedPath.includes('/.claude/') &&
      !normalizedPath.includes('/node_modules/') &&
      !normalizedPath.includes('/openspec/STATUS') &&
      !normalizedPath.endsWith('CLAUDE.md')
    ) {
      // 修改的是程式碼檔案 → 提醒更新 OpenSpec 文件
      const output = {
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: `⚠️ [OpenSpec Sync] 你剛修改了程式碼（${filePath}），請立刻確認：\n- design.md：若有架構變動（新增元件、改變流程、調整部署方式）請更新\n- tasks.md：若對應某個 task 已完成，標記 [x]；若是計畫外修改，補寫新 task 並標記 [x]`
        }
      };
      process.stdout.write(JSON.stringify(output) + '\n');
    }
  } catch (_) {
    // 非 JSON 或無 file_path，靜默略過
  }
});
