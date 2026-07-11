#!/usr/bin/env node
/**
 * PreToolUse hook (Edit|Write|Bash) — 模型分層工作證角色圍籬
 *
 * 讀 .claude/.session-role 標記檔，依角色攔截越界操作：
 * - planner：Edit/Write 目標路徑在 server/、frontend/、package.json、migrations → deny
 * - engineer：Bash 指令為 git tag 或 git push origin main（段開頭比對，避免 heredoc 誤判）→ deny
 * - doctor：Edit/Write 同 planner 檢查；Bash 指令為分支/merge/tag 類操作 → deny，
 *   git commit / git push 不攔（診斷報告交付通道，僅限報告檔由指令文字約束）
 *
 * 讀檔失敗（不存在／無權限）一律視為「無標記」放行——本 hook 是紀律輔助，
 * 錯的方向必須是漏攔不是誤鎖，git-guard 才是安全底線。
 */
const fs = require('fs');
const path = require('path');

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    let role = null;
    try {
      role = fs.readFileSync(path.join('.claude', '.session-role'), 'utf8').trim();
    } catch (_) {
      process.exit(0);
    }
    if (!role) process.exit(0);

    const data = JSON.parse(input);
    const toolName = data.tool_name || '';
    const denyReasons = [];

    if ((role === 'planner' || role === 'doctor') && (toolName === 'Edit' || toolName === 'Write')) {
      const filePath = (data.tool_input && (data.tool_input.file_path || data.tool_input.filePath)) || '';
      const normalized = filePath.replace(/\\/g, '/');
      const isProductCode =
        /(^|\/)(server|frontend)\//.test(normalized) ||
        /(^|\/)package\.json$/.test(normalized) ||
        /(^|\/)migrations\//.test(normalized);

      if (isProductCode) {
        denyReasons.push(
          role === 'doctor'
            ? '⛔ [role-guard] 診斷 session 只診斷不動手——把此項寫進診斷報告，交 /規劃 或 /實作。'
            : '⛔ [role-guard] 規劃 session 不寫程式碼——把需求寫進 spec.md。',
          '如何解除：切換角色下 /實作，或刪除 .claude/.session-role。'
        );
      }
    }

    if (role === 'engineer' && toolName === 'Bash') {
      const command = (data.tool_input && data.tool_input.command) || '';
      const cmdSegments = command.split(/&&|\|\|?|;|\n/);
      const isBlocked = cmdSegments.some(seg => {
        const t = seg.trimStart();
        return /^git tag\b/.test(t) || /^git push\b.*\borigin\b.*\bmain\b/.test(t);
      });

      if (isBlocked) {
        denyReasons.push(
          '⛔ [role-guard] 實作 session 到此為止——請呼叫收尾員子代理接手。',
          '如何解除：完成收尾交接後刪除 .claude/.session-role，或請使用者手動執行此指令。'
        );
      }
    }

    if (role === 'doctor' && toolName === 'Bash') {
      const command = (data.tool_input && data.tool_input.command) || '';
      const cmdSegments = command.split(/&&|\|\|?|;|\n/);
      const isBlocked = cmdSegments.some(seg => {
        const t = seg.trimStart();
        return (
          /^git tag\b/.test(t) ||
          /^git branch\b.*\s-[dD]\b/.test(t) ||
          /^git push\b.*--delete\b/.test(t) ||
          /^git checkout\b.*\s-b\b/.test(t) ||
          /^git switch\b.*\s-c\b/.test(t) ||
          /^git merge\b/.test(t) ||
          /^git cherry-pick\b/.test(t) ||
          /^git rebase\b/.test(t) ||
          /^git reset\b/.test(t)
        );
      });

      if (isBlocked) {
        denyReasons.push(
          '⛔ [role-guard] 診斷 session 只診斷不動手——把此項寫進診斷報告，交 /規劃 或 /實作。',
          '如何解除：完成報告交接後刪除 .claude/.session-role，或請使用者手動執行此指令。'
        );
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
    }
  } catch (_) {}
});
