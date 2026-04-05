#!/bin/bash

# 子代理建立腳本
# 使用方式：bash scripts/new-agent.sh <功能名稱>
# 範例：bash scripts/new-agent.sh calendar-offline

set -e

FEATURE_NAME=$1

if [ -z "$FEATURE_NAME" ]; then
  echo "錯誤：請提供功能名稱"
  echo "使用方式：bash scripts/new-agent.sh <功能名稱>"
  exit 1
fi

BRANCH_NAME="m_b_$FEATURE_NAME"
WORKTREE_PATH=".claude/worktrees/$FEATURE_NAME"

# 檢查 worktree 是否已存在
if [ -d "$WORKTREE_PATH" ]; then
  echo "Worktree 已存在：$WORKTREE_PATH"
  echo "直接開啟 VSCode 視窗..."
  code "$WORKTREE_PATH"
  exit 0
fi

# 從 main 建立分支（如果不存在）
if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
  echo "分支已存在：$BRANCH_NAME"
else
  echo "建立分支：$BRANCH_NAME（從 main）"
  git branch "$BRANCH_NAME" main
fi

# 建立 worktree
echo "建立 worktree：$WORKTREE_PATH"
git worktree add "$WORKTREE_PATH" "$BRANCH_NAME"

# Push 分支到遠端（如果尚未存在）
if git ls-remote --heads origin "$BRANCH_NAME" | grep -q "$BRANCH_NAME"; then
  echo "遠端分支已存在：$BRANCH_NAME"
else
  echo "推送分支到遠端..."
  git push origin "$BRANCH_NAME"
fi

# 建立獨立 NOW.md
cat > "$WORKTREE_PATH/NOW.md" << 'NOWEOF'
# NOW.md — 當前執行狀態
> 此為子代理獨立 NOW.md，不繼承主專案狀態。

---

## 功能範圍

（待定義 — 請使用「新增功能」啟動正規 OpenSpec 流程）

## 目前進度

- 剛建立，尚未開始

## 設計決策

（待定義）

## 已知地雷

（待補充）
NOWEOF

# 開啟新 VSCode 視窗
echo "開啟新 VSCode 視窗..."
code "$WORKTREE_PATH"

echo ""
echo "完成！"
echo "  分支：$BRANCH_NAME"
echo "  路徑：$WORKTREE_PATH"
echo "  請切換到新 VSCode 視窗，對 Claude 說「新增功能」開始開發"
