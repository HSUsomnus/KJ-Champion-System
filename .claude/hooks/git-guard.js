#!/usr/bin/env node
/**
 * PreToolUse hook (Bash) — git 操作守衛
 *
 * 攔截三類危險操作，另有兩類提醒：
 * 1. git add -A 或 git add .（孤立的點）→ deny；git add .claude/ 等路徑不受影響
 * 2. git commit 在 main 分支且 staged 有功能程式碼（server/、frontend/ 等）→ deny
 *    規則類（.claude/、CLAUDE.md、CHANGELOG.md、scripts/、.gitignore）允許直推，不攔截
 * 3. commit message 未帶型別前綴（feat|fix|chore|docs|refactor|test）→ deny
 * 4. m_b_* 分支 commit 未 staged changes/<name>/tasks.md → 提醒（警告，不攔截）
 * 5. git push origin main → 顯示 deploy-release skill checklist（警告，不攔截；push 本來就有人工確認流程）
 */
const { execSync } = require('child_process');

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const command = (data.tool_input && data.tool_input.command) || '';
    const denyReasons = [];
    const warnings = [];

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
        '⛔ [git-guard] 禁止使用 git add -A 或 git add .（deploy-release skill 明文規定）',
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

    // ── 3. commit message 型別前綴格式閘 ──────────────────────────────────
    // 只驗格式不驗語意；型別選擇判準見 deploy-release skill「commit 型別對照表」。
    // 訊息擷取三層判定（addendum2 修訂）：
    //   單行 -m 直接驗；heredoc 寫法（-m "$(cat <<'EOF'…)"）取內文第一行驗；
    //   其他動態訊息（$(date) 等）靜態驗不了 → fail-open 放行。
    const commitSeg = cmdSegments.map(s => s.trimStart()).find(s => /^git commit\b/.test(s));
    if (commitSeg) {
      let msg = null;
      const mFlag = commitSeg.match(/-m\s+["']([^"']*)/);
      if (mFlag && mFlag[1].startsWith('$(')) {
        const heredoc = command.match(/<<-?\s*['"]?(\w+)['"]?[^\n]*\n([\s\S]*?)^\1\s*$/m);
        if (heredoc) msg = heredoc[2].split('\n')[0];
      } else if (mFlag) {
        msg = mFlag[1];
      }
      if (msg !== null && !/^(feat|fix|chore|docs|refactor|test)(\([^)]*\))?: /.test(msg)) {
        denyReasons.push(
          '⛔ [git-guard] commit message 必須以型別前綴開頭：feat|fix|chore|docs|refactor|test',
          `收到：「${msg.slice(0, 60)}」`,
          '型別判準：feat=新功能｜fix=修錯誤行為｜refactor=行為不變重構｜chore=規則/設定/腳本｜docs=純文件',
          '詳見 deploy-release skill「commit 型別對照表」'
        );
      }
    }

    // ── 4. m_b_* 分支 commit 未同步 tasks.md → 提醒（警告，不攔截）─────────
    // 原因：change 22 驗收發現 Phase commit 漏勾 tasks.md，最後才補勾。
    // tasks.md 是進度唯一來源，勾選必須與完成該 task 的 commit 同批。
    if (/git commit\b/.test(command)) {
      let branch = '';
      try { branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim(); } catch (_) {}
      if (/^m_b_/.test(branch)) {
        let staged = '';
        // -c core.quotepath=false：change 目錄多為中文命名，quotepath 預設會把非 ASCII
        // 檔名整行包在引號內並轉義成八進位（例如 "changes/\346..."), 導致下面的路徑 regex 永遠比對不到。
        try { staged = execSync('git -c core.quotepath=false diff --name-only --cached', { encoding: 'utf8' }); } catch (_) {}
        const stagedFiles = staged.split('\n').map(f => f.trim()).filter(Boolean);
        const hasTasksStaged = stagedFiles.some(f => /^changes\/[^/]+\/tasks\.md$/.test(f));
        let hasTasksInRepo = false;
        try {
          hasTasksInRepo = execSync('git ls-files "changes/*/tasks.md"', { encoding: 'utf8' }).trim().length > 0;
        } catch (_) {}
        if (stagedFiles.length > 0 && hasTasksInRepo && !hasTasksStaged) {
          warnings.push(
            '📋 [git-guard] 本次 commit 未包含 changes/*/tasks.md — 若本 commit 完成了任何 task，' +
            '勾選必須同 commit（tasks.md 是進度唯一來源）。純中途修正可忽略本提醒。'
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

    // ── 5. 推送到 main（警告，不攔截）────────────────────────────────────
    if (/git push\b.*\borigin\b.*\bmain\b/.test(command) && !/--delete/.test(command)) {
      warnings.push(
        '🔴 [git-guard] 推送 main 前必須完成 deploy-release skill checklist（缺一不可）：',
        '  1. now.md 已更新，且與本次 push 同一個 commit',
        '  2. 機密檢查：git status 確認無 .env / Key/ / 金鑰 *.json',
        '  3. 使用者已明確確認（列出推送清單等待口頭 OK）',
        '',
        '  push 完成後 → 立刻執行全分支 sync（deploy-release skill「main 推送後同步規則」）',
        '  → 不可只 cherry-pick 到特定分支，必須 merge main 到所有 m_b_*'
      );
    }

    if (warnings.length > 0) {
      const output = {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          additionalContext: warnings.join('\n')
        }
      };
      process.stdout.write(JSON.stringify(output) + '\n');
    }
  } catch (_) {}
});
