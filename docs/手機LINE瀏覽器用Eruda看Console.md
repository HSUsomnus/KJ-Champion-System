# 手機 LINE 瀏覽器用 Eruda 看 Console

> 在手機 LINE App 內開 LIFF 時，無法用電腦 Chrome 的開發者工具。用 Eruda 可以在手機畫面上直接看 Console、網路請求等，方便除錯（例如邀請字卡失敗時看錯誤訊息）。

---

## ⚠️ 要先「用 LIFF 網址」開，不要直接開 ngrok 網址

在 LINE 裡**直接點 ngrok 網址**（例如 `https://xxx.ngrok-free.dev/members.html`）會被當成一般網頁，**不會**被當成 LIFF，畫面上會出現「請在 LINE App 內開啟以使用完整功能」，字卡分享也會變成文字。

**正確做法**：在 LINE 裡開 **LIFF 網址**，例如：
- `https://liff.line.me/你的LIFF_ID/members.html?eruda=1`（成員頁 + Eruda）
- `https://liff.line.me/你的LIFF_ID/members.html?minimal=1`（成員頁 + 極簡字卡測試）

LIFF ID 在 LINE Developers Console → 你的 Channel → LIFF → 點你的 LIFF 應用即可看到。

---

## 若出現「伺服器連線失敗」、LIFF 開不了

這代表 **LINE 連不到你的後端**（ngrok／本機伺服器），LIFF 頁面根本沒載入，所以 Eruda 也不會出現。請依下面順序檢查：

| 檢查項目 | 做法 |
|----------|------|
| **1. 本機伺服器有在跑** | 電腦終端機執行 `npm start`，確認有出現「伺服器已啟動在 http://localhost:8080」之類的訊息。 |
| **2. ngrok 有在跑** | 另一終端機執行 `ngrok http 8080`，確認有出現 `Forwarding https://xxx.ngrok-free.app -> http://localhost:8080`。 |
| **3. ngrok 網址沒換掉** | 免費版每次重開 ngrok 網址會變。若你重開過 ngrok，要把 **LINE Developers Console → 你的 LIFF → Endpoint URL** 改成**目前** ngrok 畫面上的 https 網址。 |
| **4. 手機能連到 ngrok** | 用手機的 **Chrome 或 Safari**（不要用 LINE）直接開 ngrok 網址，例如 `https://你的ngrok網址.ngrok-free.app/`。若打不開或卡住，可能是網路／防火牆擋住，或 ngrok 免費版首次需在瀏覽器點「Visit Site」。 |
| **5. 用電腦瀏覽器先測** | 電腦 Chrome 開 `https://你的ngrok網址.ngrok-free.app/`，確認能看到 LIFF 畫面。若電腦也打不開，問題在 ngrok 或本機伺服器。 |

以上都確認沒問題後，再用手機在 **LINE App 裡**開同一個 ngrok 網址；若仍出現「伺服器連線失敗」，可把目前狀況（本機有跑、ngrok 有跑、Endpoint 已改、手機瀏覽器能否開 ngrok）貼給開發者一起查。

---

## 一、怎麼開啟 Eruda

1. **在 LIFF 網址後面加上 `?eruda=1`**
   - 例如：`https://你的ngrok網址.ngrok-free.app/members.html?eruda=1`
   - 若網址已有其他參數，改成 `&eruda=1`，例如：`.../members.html?foo=1&eruda=1`

2. **用手機在 LINE App 裡開這個網址**
   - 從聊天室連結、官方帳號選單等點進 LIFF，網址要包含 `?eruda=1`（或 `&eruda=1`）
   - 若你是從電腦複製 ngrok 網址給手機，記得手動在網址最後加上 `?eruda=1` 再傳給自己或開連結

3. **頁面載入後**
   - 畫面右下角會出現一個 **綠色小按鈕**（Eruda 的開關）
   - 點一下就會打開 Eruda 面板

---

## 二、怎麼看 Console（看 log、錯誤）

1. 在 Eruda 面板裡，點 **「Console」** 分頁。
2. 之後你在 LIFF 裡的操作（例如點「邀請新夥伴」）所產生的 `console.log`、`console.error`、`console.warn` 都會出現在這裡。
3. 若邀請字卡失敗，程式會打 `[邀請] 字卡分享失敗，改為文字分享` 以及錯誤內容，可在 Console 裡查看錯誤代碼或訊息。

---

## 三、操作步驟範例（測邀請字卡）

1. 在電腦把目前 ngrok 網址複製下來，例如：`https://abc123.ngrok-free.app`
2. 組出帶 Eruda 的成員頁網址：`https://abc123.ngrok-free.app/members.html?eruda=1`
3. 用 LINE 把這個網址傳給自己（或從官方帳號選單點進 LIFF 後，在網址列補上 `?eruda=1`）
4. 在手機 LINE 裡點開這個連結，進入成員頁
5. 點畫面右下角綠色按鈕 → 打開 Eruda → 點 **Console** 分頁
6. 回到 LIFF 畫面，點 **「➕ 邀請新夥伴」**
7. 看 Console 是否出現：
   - `[邀請] 嘗試分享 Flex 字卡` → 代表有呼叫 shareTargetPicker
   - `[邀請] 字卡分享失敗，改為文字分享` 以及後面錯誤 → 代表 shareTargetPicker 拋錯，可把錯誤代碼／訊息記下來或截圖

---

## 四、注意

- **只有網址帶 `?eruda=1`（或 `&eruda=1`）時才會載入 Eruda**，一般使用者不會看到。
- 內測／正式環境若不想讓別人看到 Eruda，不要對外分享帶 `eruda=1` 的網址即可。
