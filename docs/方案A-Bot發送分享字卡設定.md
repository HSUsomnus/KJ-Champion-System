# 方案 A：Bot 發送分享字卡（泡泡按鈕）

## 流程說明

- 使用者在 LIFF 按「分享」→ 後端以 **LINE Bot（Messaging API）** 身份，用 **Push Message** 發送字卡／文字到**該使用者與 Bot 的 1-on-1 聊天室**。
- 因為訊息是 **Bot 發的**，所以 **Quick Reply 泡泡按鈕會出現**。

## 環境變數

方案 A 與方案 B 會用到的 LINE 變數，建議一次設好，詳見 **[LINE 變數設定一覽](LINE變數設定一覽.md)**。

- **方案 A** 必備：`LINE_CHANNEL_ACCESS_TOKEN`（Messaging API 分頁發行長效 Token）。
- **方案 B** 還需要：`LINE_CHANNEL_SECRET`（Basic settings → Channel secret，webhook 簽章驗證用）。
- **LIFF**：`LIFF_ID`；`LINE_CHANNEL_ID`、`LINE_CHANNEL_SECRET` 若已設可沿用。

## 後端變更後

修改 `server/` 後請**重啟本機伺服器**，變更才會生效。

## 後續：方案 B

你之後若需要**方案 B**（例如在聊天室用指令／按鈕觸發 Bot 回傳帶泡泡的訊息），再一起做 webhook 與對應邏輯即可。
