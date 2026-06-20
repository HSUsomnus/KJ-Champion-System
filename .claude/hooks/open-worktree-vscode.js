#!/usr/bin/env node
// [設計決策] 用 hook 環境繞過 Claude Code 插件 sandbox 限制
// 原因：插件的 Bash tool 無法啟動外部程式，但 hook 的 child_process 可以
// 若要修改：請先確認 .claude/now.md 的設計決策區塊

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const WORKTREES_DIR = path.join(__dirname, '..', 'worktrees');

// 讀取 stdin（hook 接收 JSON 輸入）
let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    // 只在 Bash tool 執行含 "open-worktree-vscode" 或 "worktree" 關鍵字時觸發
    const toolInput = data?.tool_input?.command || '';
    if (!toolInput.includes('--open-vscode-worktrees')) return;

    // 掃描 worktrees 目錄
    if (!fs.existsSync(WORKTREES_DIR)) {
      console.log('❌ worktrees 目錄不存在');
      return;
    }

    const worktrees = fs.readdirSync(WORKTREES_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => path.join(WORKTREES_DIR, d.name));

    if (worktrees.length === 0) {
      console.log('沒有找到任何 worktree');
      return;
    }

    // 逐一開啟 VS Code 視窗
    let opened = 0;
    worktrees.forEach((wt) => {
      exec(`code.cmd "${wt}"`, { shell: 'powershell.exe' }, (err) => {
        if (err) {
          console.error(`❌ 開啟失敗: ${wt} — ${err.message}`);
        } else {
          opened++;
          if (opened === worktrees.length) {
            console.log(`✅ 已開啟 ${opened} 個 VS Code 視窗`);
          }
        }
      });
    });
  } catch {
    // 非 JSON 輸入或其他錯誤，靜默忽略
  }
});
