#!/usr/bin/env bash
# main 推送後全分支同步 — 唯一事實來源
#
# 預設政策（change 22 修訂）：衝突時一律 abort、記錄到 FAILED、停下交人工判斷。
# 不自動採 -X theirs 覆蓋分支自己的內容。
# 若使用者已看過衝突內容並確認要採 main 版本覆蓋，可手動加 SYNC_STRATEGY=theirs 針對該次執行啟用。
#
# 用法：
#   bash scripts/sync-branches.sh                    # 正式執行，衝突一律停下回報
#   DRY_RUN=1 bash scripts/sync-branches.sh          # 只列出將處理的分支與預計動作，不做任何 checkout/merge/push
#   SYNC_STRATEGY=theirs bash scripts/sync-branches.sh  # 使用者已確認衝突內容後，手動啟用 -X theirs
set -u

git fetch origin --prune

BRANCHES=$(git ls-remote --heads origin 'refs/heads/m_b_*' | sed 's|.*refs/heads/||')
STRATEGY="${SYNC_STRATEGY:-stop}"

if [ "${DRY_RUN:-0}" = "1" ]; then
  echo "=== DRY RUN：以下分支將被同步（不執行任何動作）==="
  for branch in $BRANCHES; do
    behind=$(git rev-list --count "origin/$branch..origin/main" 2>/dev/null || echo '?')
    action="衝突時停下回報"
    [ "$STRATEGY" = "theirs" ] && action="衝突時改用 -X theirs（使用者已手動啟用）"
    echo "$branch: behind main $behind → 預計 checkout + merge main --no-edit + push（$action）"
  done
  exit 0
fi

OK=(); THEIRS=(); FAILED=()
for branch in $BRANCHES; do
  git checkout -B "$branch" "origin/$branch" >/dev/null 2>&1 || { FAILED+=("$branch(checkout)"); continue; }
  if git merge main --no-edit >/dev/null 2>&1; then
    git push origin "$branch" >/dev/null 2>&1 && OK+=("$branch") || FAILED+=("$branch(push)")
  else
    git merge --abort 2>/dev/null
    if [ "$STRATEGY" = "theirs" ]; then
      if git merge main -X theirs --no-edit >/dev/null 2>&1; then
        git push origin "$branch" >/dev/null 2>&1 && THEIRS+=("$branch") || FAILED+=("$branch(push)")
      else
        git merge --abort 2>/dev/null; FAILED+=("$branch(merge)")
      fi
    else
      FAILED+=("$branch(conflict-stopped)")
    fi
  fi
done
git checkout main >/dev/null 2>&1
git fetch origin >/dev/null 2>&1

echo "=== 同步結果 ==="
echo "✅ 成功: ${OK[*]:-無}"
echo "⚠️ 使用 -X theirs（有內容被 main 覆蓋，接手該分支前需檢查 dep）: ${THEIRS[*]:-無}"
echo "❌ 失敗 / 需人工處理: ${FAILED[*]:-無}"
echo "=== behind 驗證（應全為 0，(conflict-stopped) 分支需人工 merge 後重跑）==="
for branch in $BRANCHES; do
  echo "$branch: behind main $(git rev-list --count "origin/$branch..origin/main" 2>/dev/null || echo '?')"
done
