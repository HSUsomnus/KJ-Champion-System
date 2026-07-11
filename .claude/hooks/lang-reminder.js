#!/usr/bin/env node
// UserPromptSubmit hook: 每回合注入語言提醒
// 原因：CLAUDE.md 的語言規則在長 session 中注意力衰減，實測出現英/韓/日文漂移。
// 成本：每回合約 25 tokens，對比 change 22 每請求省 16.5K，可忽略。
const output = {
  hookSpecificOutput: {
    hookEventName: 'UserPromptSubmit',
    additionalContext: '🈶 [lang] 回覆與 tool call 之間的進度短報一律繁體中文（台灣用語）；技術術語可英文。'
  }
};
process.stdout.write(JSON.stringify(output) + '\n');
