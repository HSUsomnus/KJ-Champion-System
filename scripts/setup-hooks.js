#!/usr/bin/env node
/**
 * 安裝 git hooks
 * 執行：npm run setup-hooks
 *
 * post-checkout hook：切換分支後自動將 .claude/ 完整同步為 main 的版本
 * （包含刪除 main 上不存在的多餘檔案）
 */
const fs = require('fs');
const path = require('path');

const hookContent = `#!/bin/bash
# post-checkout: 切換分支後自動完整同步 .claude/ 為 main 版本
PREV_HEAD=$1
NEW_HEAD=$2
BRANCH_SWITCH=$3

# 只在切換分支時執行（不是 git checkout 單一檔案）
if [ "$BRANCH_SWITCH" = "1" ]; then
  CURRENT=$(git branch --show-current)
  if [ "$CURRENT" != "main" ]; then
    # 取得 main 上 .claude/ 的檔案列表
    MAIN_FILES=$(git ls-tree -r --name-only main -- .claude/ 2>/dev/null)

    # 取得當前分支 .claude/ 的實際檔案
    CURRENT_FILES=$(find .claude -type f 2>/dev/null)

    # 刪除 main 上不存在的多餘檔案
    for f in $CURRENT_FILES; do
      if ! echo "$MAIN_FILES" | grep -qx "$f"; then
        rm -f "$f"
      fi
    done

    # 從 main checkout 所有 .claude/ 檔案
    git checkout main -- .claude/ 2>/dev/null

    echo "✅ .claude/ 已從 main 完整同步至 $CURRENT"
  fi
fi
`;

const hooksDir = path.join(__dirname, '..', '.git', 'hooks');
const hookPath = path.join(hooksDir, 'post-checkout');

if (!fs.existsSync(hooksDir)) {
  console.error('❌ .git/hooks 目錄不存在，請確認在 git repo 根目錄執行');
  process.exit(1);
}

fs.writeFileSync(hookPath, hookContent);
fs.chmodSync(hookPath, 0o755);
console.log('✅ post-checkout hook 安裝完成');
console.log(`   路徑：${hookPath}`);
console.log('   效果：切換至非 main 分支時，完整同步 .claude/ 為 main 版本（含刪除多餘檔案）');
