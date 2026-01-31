# LINE 變數設定一覽

**LINE LIFF** 和 **LINE Bot** 是兩套不同的東西，變數也分開看比較清楚。

---

## LINE LIFF 跟 LINE Bot 哪裡不一樣？

| | LINE LIFF | LINE Bot（Messaging API） |
|--|-----------|---------------------------|
| **是什麼** | 在 LINE App 裡開的**網頁**（前端） | **官方帳號／機器人**，發送與接收聊天訊息 |
| **誰在用** | 使用者開網頁、登入、點按鈕 | 機器人發訊息給使用者、或收使用者傳來的訊息 |
| **專案裡做什麼** | 行事曆頁面、分享按鈕、登入、LIFF 網址 | 方案 A：Bot 發送分享字卡；方案 B：聊天室指令回傳 |
| **在 Console 哪裡設** | **LIFF** 分頁（每個 LIFF App 一個 LIFF ID） | **Messaging API** 分頁（Token、Webhook） |

可以想成：**LIFF = 你做的網頁**，**Bot = 跟使用者聊天的機器人**。  
在 LINE Developers 裡，**同一個 Channel** 只有**一組** Channel ID、Channel secret；LIFF 和 Bot 都共用這組，**不要重複設**。  
- **LIFF 專用**：`LIFF_ID`（每個 LIFF App 一個）。  
- **Bot 專用**：`LINE_CHANNEL_ACCESS_TOKEN`（只有這一個是 Bot 專用變數）。

---

## 一、LINE LIFF 用到的變數（網頁／登入）

| 變數 | 用途 | 在哪裡取得 |
|------|------|------------|
| **LIFF_ID** | LIFF 網頁的 ID，前端開 LIFF 網址、登入用 | Channel → **LIFF** 分頁 → 你的 LIFF App → **LIFF ID** |
| **LINE_CHANNEL_ID** | 同 Channel 的識別（**Channel 共用，只設一次**） | Channel → **Basic settings** → **Channel ID** |
| **LINE_CHANNEL_SECRET** | 同 Channel 的密鑰（**Channel 共用，只設一次**；方案 B webhook 驗證也用這組） | Channel → **Basic settings** → **Channel secret** |

**.env 範例（LIFF／Channel 共用，這區塊只出現一次）：**

```env
# ========== LINE LIFF（網頁／登入）+ Channel 共用 ==========
LIFF_ID=你的 LIFF ID
LINE_CHANNEL_ID=你的 Channel ID
LINE_CHANNEL_SECRET=你的 Channel secret
```

---

## 二、LINE Bot（Messaging API）專用變數（發送／接收訊息）

**LINE Bot 專用的變數只有一個，不要重複寫 LINE_CHANNEL_SECRET。**

| 變數 | 用途 | 在哪裡取得 |
|------|------|------------|
| **LINE_CHANNEL_ACCESS_TOKEN** | Bot 發送訊息（Push、Reply）時驗證身份 | Channel → **Messaging API** 分頁 → **Channel access token (long-lived)** 發行並複製 |

- 方案 B（Webhook）驗證簽章時會用到 **LINE_CHANNEL_SECRET**，用**上面 LIFF／Channel 區塊那組就好**，同一個 Channel 只有一組 secret，**.env 裡不要寫兩次**。

**.env 範例（Bot 區塊，只有這一行）：**

```env
# ========== LINE Bot（Messaging API，發送／接收訊息） ==========
LINE_CHANNEL_ACCESS_TOKEN=你的長效 Token
```

---

## 三、Console 取得步驟（分開看）

1. 登入 [LINE Developers Console](https://developers.line.biz/)。
2. 選 **Provider** → 選 **Channel**（同一個 Channel 可同時有 LIFF + Messaging API）。

### LIFF 用的（網頁）

- 到 **LIFF** 分頁 → 你的 LIFF App → 複製 **LIFF ID** → `LIFF_ID`。
- 到 **Basic settings** 分頁 → 複製 **Channel ID**、**Channel secret** → `LINE_CHANNEL_ID`、`LINE_CHANNEL_SECRET`。

### Bot 用的（發送／接收訊息）

- 到 **Messaging API** 分頁 → **Channel access token (long-lived)** 發行 → 複製 Token → `LINE_CHANNEL_ACCESS_TOKEN`。
- **不要**在 Bot 區塊再寫一次 `LINE_CHANNEL_SECRET`；方案 B webhook 驗證用上面 LIFF／Channel 區塊那組即可。

---

## 四、.env 整段範例（LIFF 與 Bot 分開寫）

```env
# ========== LINE LIFF（網頁／登入） ==========
LIFF_ID=1234567890-AbcdEfgh
LINE_CHANNEL_ID=1234567890
LINE_CHANNEL_SECRET=abcdef1234567890abcdef1234567890

# ========== LINE Bot（Messaging API，發送／接收訊息） ==========
LINE_CHANNEL_ACCESS_TOKEN=你的長效 Token（從 Messaging API 分頁複製）

# 選填：邀請字卡「加好友」按鈕
# LINE_ADD_FRIEND_URL=https://line.me/R/ti/p/@xxx
```

---

## 五、對應功能速查

- **LIFF 網頁、登入、LIFF 網址** → 用 **LIFF／Channel 區塊**（`LIFF_ID`、`LINE_CHANNEL_ID`、`LINE_CHANNEL_SECRET`，這三個只設一次）。
- **方案 A（Bot 發送分享字卡）** → 只要 **`LINE_CHANNEL_ACCESS_TOKEN`**（Bot 專用，只這一個）。
- **方案 B（Webhook／聊天室指令）** → 用 **`LINE_CHANNEL_ACCESS_TOKEN`** + **`LINE_CHANNEL_SECRET`**（Secret 用上面 LIFF 區塊那組，不要重複設）。

設好後修改 `server/` 記得**重啟本機伺服器**。
