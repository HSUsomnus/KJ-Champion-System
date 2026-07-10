# Change 22 最終驗收報告 + 補強工作證 2 — heredoc 型別閘誤判修正

> 本文件由顧問 session（Claude Fable 5）於 2026-07-10 產出。
> 第一、二節供使用者閱覽（考核結果）；第三節起供 Sonnet 直接執行，不需重新調查。
> 執行分支：`m_b_規則體系重構`（**趕在「功能上線」merge main 之前修完**，一次帶進 main）。

---

## 一、最終驗收結果（顧問獨立複測，非只看 Sonnet 自報）

| 驗收項 | 複測方法 | 結果 |
|---|---|---|
| Phase 1–5 + 收尾 + addendum 全部 task | tasks.md 45/45 `[x]`，逐一對照 commit 歷史（546a…→95bf…） | ✅ |
| addendum 第四節 gate（regression） | 顧問取分支版 git-guard.js 於乾淨環境重跑：`add -A` deny ✅、訊息內文提到 git 指令不誤判 ✅、無前綴 deny ✅、合法前綴放行 ✅ | ✅ 全過，與 Sonnet 自報一致 |
| 常駐 token 降本（目標 ≤ 3,500） | 依 spec 估算式實測：CLAUDE.md ≈ 1,031 + now.md ≈ 1,422 ≈ **2,453** | ✅ |
| Skill 化四件套 | 四個 SKILL.md 皆存在且 frontmatter（name / description）完整 | ✅ |
| `scripts/sync-branches.sh` | 讀碼審查：衝突預設 abort 停下回報、`-X theirs` 需手動開關、DRY_RUN、事後 behind 驗證——符合 spec 2.2 修訂精神 | ✅ |
| docs 過時文件歸檔 | 19 份 Vercel/Supabase/ngrok 時代文件 R100 搬入 `docs/archive/` | ✅ |
| **commit 型別閘 heredoc 誤判** | 實測重現：`-m "$(cat <<'EOF' …)"` → deny，收到「`$(cat <<`」 | ❌ **必修（本工作證 F 項）** |
| now.md 地雷記錄紀律 | heredoc 誤判已在對話回報，但未寫入 now.md 已知地雷（本工作證直接修掉，故不需補記） | ⚠️ 小扣 |

## 二、評分與責任歸屬

- **Sonnet 執行考核：94 / 100**
  - 加分：照工作證忠實執行、gate 全跑且結果可獨立重現、**主動發現顧問埋的 bug 並誠實回報**（沒有隱瞞、沒有硬拗）、繞過方式（改單行訊息）選擇正確。
  - 扣分：發現新地雷當下未同步記入 now.md（now.md 頂部規則明定「發現新地雷立即更新」）。
- **Change 22 出貨品質：91 / 100** — 帶一個已知必修項，修掉即可上線。
- **責任歸屬（重要）**：heredoc 誤判的 regex `-m\s+["']([^"']+)` 來自 addendum B 項**顧問提供的參考實作**，Sonnet 依執行約束第 3/4 條原樣沿用；addendum 第四節 gate 清單也沒放 heredoc 案例，所以「gate 全 ✅」仍漏掉。addendum 甚至聲稱「沿用 cmdSegments 切段防護避免 heredoc 誤觸發」——那個防護只擋「訊息**內文**提到 git 指令」的方向，沒擋「訊息**本身**經 `$(cat <<EOF)` 傳入」的方向。**此 bug 扣顧問的分，不扣 Sonnet 的分。** 本工作證的參考實作與 gate，這次已由顧問全數實測通過後才出貨（addendum D 項「gate 指令必須實測」，自己先守）。

---

## 三、F 項 — git-guard.js 型別閘 heredoc 修正

### 執行約束

1. 分支：`m_b_規則體系重構`。只動 `.claude/hooks/git-guard.js` 與 `changes/22-規則體系重構/tasks.md`（追加勾選），其他一律不碰。
2. 既有全部行為（add -A deny、main 產品碼 deny、tasks.md 提醒、push main 警告、單行訊息型別閘）不得弱化，第五節 gate 有 regression 把關。
3. 全部完成 = 一個 commit，前綴 `chore:`，tasks.md 勾選同 commit。

### 設計（三層判定，取代現有第 3 段的 msgMatch 區塊）

1. 單行 `-m "..."` → 照舊直接驗前綴。
2. `-m "$(cat <<'EOF' …)"`（Claude Code 標準寫法）→ 解析 heredoc **內文第一行**驗前綴。不能對這型放行了事——這是本閘主要受眾（Claude）最常用的寫法，放行等於閘門對主要受眾失效。
3. 其他動態訊息（如 `$(date)`）→ 靜態驗不了，**fail-open 放行**（閘門原則：解析不了就放行，不硬擋）。

**為什麼不採 Sonnet 提的 `git log -1 --format=%s` 方案**：那是 commit **之後**才驗得到（PostToolUse 時點），deny 變成事後諸葛只能提醒不能攔，還要多掛一個 hook；PreToolUse 靜態解析 + fail-open 較簡單且保留事前攔截。

### 參考實作（顧問已實測，替換第 3 段整個 `const commitSeg …` 區塊內的訊息擷取邏輯）

```js
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
```

---

## 四、驗證 gate（全 ✅ 才 commit；以下 8 案例 + regression 顧問已於 2026-07-10 實測全過）

```bash
node --check .claude/hooks/git-guard.js        # 預期：無輸出

# 每條測試以 stdin 餵 JSON；「deny」= 輸出含 "permissionDecision":"deny"，「放行」= 無 deny 輸出
# F1 heredoc + 合法前綴 → 放行（原 bug 案例，修正後必須通過）
# F2 heredoc + 無前綴   → deny，且「收到：」顯示 heredoc 內文第一行（非 $(cat <<）
# F3 單行 + 合法前綴    → 放行（regression）
# F4 單行 + 無前綴      → deny（regression）
# F5 動態訊息 $(date)   → 放行（fail-open）
# F6 訊息內文提到 git 指令（-m "docs: 說明 git commit -m 用法"）→ 放行（regression）
# F7 heredoc 雙引號 marker（<<"EOF"）+ 合法前綴 → 放行
# F8 heredoc + scope 前綴（feat(profile): …）→ 放行
# regression：git add -A → deny；addendum 第四節 A1/A2（tasks.md 提醒）維持原結果

# F1/F2 實測範例（其餘同型）：
printf '%s' '{"tool_name":"Bash","tool_input":{"command":"git commit -m \"$(cat <<'"'"'EOF'"'"'\nchore: 測試 heredoc\nEOF\n)\""}}' \
  | node .claude/hooks/git-guard.js            # F1 預期：放行（無輸出）
printf '%s' '{"tool_name":"Bash","tool_input":{"command":"git commit -m \"$(cat <<'"'"'EOF'"'"'\n更新 settings.json\nEOF\n)\""}}' \
  | node .claude/hooks/git-guard.js            # F2 預期：deny，收到「更新 settings.json」
```

---

## 五、Tasks（先追加到 tasks.md 末尾，勾選只在 tasks.md 進行）

```markdown
## 8. 補強 2 — heredoc 型別閘修正（addendum2-最終驗收與heredoc修正.md）

- [ ] 8.1 git-guard.js 型別閘訊息擷取改三層判定（F 項）
- [ ] 8.2 第四節 gate 全 ✅（F1–F8 + regression）
- [ ] 8.3 一個 commit（chore: 前綴、tasks.md 勾選同 commit）+ push
```

## 六、完成後回報格式

```
## Change 22 補強 2 驗收報告
- F1–F8 gate 結果：（逐項 ✅/❌）
- regression：add -A deny / tasks.md 提醒 / 單行型別閘 全部維持通過
- heredoc commit 寫法已恢復可用（F1 實證）
- 提醒使用者：可走「功能上線」流程
```
