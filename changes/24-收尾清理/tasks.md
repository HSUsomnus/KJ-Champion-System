# Change 24 — 收尾清理 tasks

## Phase 0 — 開工

- [x] 0.1 `/實作` 打卡（`echo "engineer" > .claude/.session-role`）
- [x] 0.2 建分支：`git fetch origin claude/project-spec-review-95epn4 && git checkout -b m_b_收尾清理 origin/claude/project-spec-review-95epn4 && git push -u origin m_b_收尾清理`

## Phase 1 — CHANGELOG 補裁切

- [x] 1.1 v2.8.1 完整摘要壓縮為一行索引（格式照 spec 第三節）
- [x] 1.2 跑 7.1 gate 全 ✅
- [x] 1.3 commit（`docs:` 前綴 + trailer，tasks.md 同批勾選）

## Phase 2 — now.md 更新

- [x] 2.1 刪除 change 19 / 22 / 23 三行 ✅ DONE
- [x] 2.2 change 20/21 行改寫（照 spec 第四節第 4 點原文）
- [x] 2.3 跑 7.2 gate 全 ✅（含 change 12 行未誤刪）
- [x] 2.4 commit（`docs:` 前綴 + trailer）

## Phase 3 — 刪除已完成 change 資料夾

- [x] 3.1 `git rm -r changes/22-規則體系重構 changes/23-模型分層工作證`
- [x] 3.2 跑 7.3 gate 全 ✅
- [x] 3.3 commit（`chore:` 前綴 + trailer）

## Phase 4 — 停止點與收尾（三層交接實地驗證）

- [ ] 4.1 寫收尾筆記 `changes/24-收尾清理/收尾筆記.md`（版本號 v2.12.1 + 四段內容）
- [ ] 4.2 呼叫收尾員子代理（prompt：「執行收尾，收尾筆記在 changes/24-收尾清理/收尾筆記.md」）
- [ ] 4.3 收尾員回報後跑 7.4 gate；若 `^git tag:` 計數為 6 → 補裁 v2.9.0 並在報告揭露
- [ ] 4.4 `git rm -r changes/24-收尾清理` 單獨 `chore:` commit
- [ ] 4.5 跑 7.5 總驗收，產出驗收報告（含三層交接驗證結論）
- [ ] 4.6 `rm -f .claude/.session-role`，向使用者總結並結束
