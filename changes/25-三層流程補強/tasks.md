# Change 25 — 三層流程補強 tasks

## Phase 0 — 開工

- [ ] 0.1 `/實作` 打卡（`echo "engineer" > .claude/.session-role`）
- [ ] 0.2 建分支：`git fetch origin claude/project-spec-review-95epn4 && git checkout -b m_b_三層流程補強 origin/claude/project-spec-review-95epn4 && git push -u origin m_b_三層流程補強`

## Phase 1 — 角色 command 補強

- [ ] 1.1 `規劃.md` 停止點交接訊息模板改為含 spec 分支 + 起手式三行（spec 3.1 原文替換）
- [ ] 1.2 `實作.md` 加「spec 取得」段（spec 3.2）
- [ ] 1.3 `實作.md` 收尾筆記四段改五段，插入「主 session 連結」（spec 3.3）
- [ ] 1.4 `規劃.md` 停止點前加「確認閘」段——未獲確認前禁止 commit/push/開 PR（spec 3-1.4）
- [ ] 1.5 `實作.md` 職責段改「每 Phase commit 後立即 push 遠端」（spec 3-1.5）
- [ ] 1.6 跑 8.1 gate 全 ✅，commit（`chore:` + trailer，tasks.md 同批）

## Phase 2 — 收尾員 trailer 來源修正

- [ ] 2.1 `收尾員.md` 素材清單加「主 session 連結」；commit 範本改取自收尾筆記 + 缺連結 fallback 一行（spec 四）
- [ ] 2.2 跑 8.2 gate 全 ✅，commit

## Phase 3 — deploy-release skill 補強

- [ ] 3.1 403 fallback 自包含規則 + tag 補做範本 + change 24 教訓案例（spec 5-3.1）
- [ ] 3.2 「SSH 簽章與本地驗證（CCR 沙箱）」小節（spec 5-3.2）
- [ ] 3.3 跑 8.3 gate 全 ✅，commit

## Phase 4 — now.md 地雷區補兩條

- [ ] 4.1 CCR 403 條目句尾補「補做指令必須自包含」；新增簽章 N 屬正常條目（spec 六）
- [ ] 4.2 跑 8.4 gate 全 ✅（含常駐 token 迴歸），commit

## Phase 5 — 停止點與收尾

- [ ] 5.1 寫收尾筆記（新五段格式，版本號 v2.12.2、含本 session 真實連結）
- [ ] 5.2 呼叫收尾員子代理（prompt：「執行收尾，收尾筆記在 changes/25-三層流程補強/收尾筆記.md」）
- [ ] 5.3 收尾員回報後跑 8.5 gate（CHANGELOG 裁切 + trailer 真連結驗證）
- [ ] 5.4 `git rm -r changes/25-三層流程補強` 單獨 `chore:` commit
- [ ] 5.5 跑 8.6 總驗收，產出驗收報告（含缺口 3、4 實地驗證結論）
- [ ] 5.6 `rm -f .claude/.session-role`，向使用者總結並結束
