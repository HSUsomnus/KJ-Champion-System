# LINE 登入可以不用 LIFF（LINE App）嗎？＋ 功能對照表

## 一、LINE 登入可以不用 LINE App 嗎？

**可以。** 專案裡已經有兩種方式：

| 方式 | 說明 | 使用情境 |
|------|------|----------|
| **LINE Login（OAuth 2.0）** | 在**一般瀏覽器**（Chrome、Safari 等）導向 LINE 授權頁 → 使用者登入 → 回調到你的後端 → 後端導回指定網址並帶 `userId` | 任何「只需要知道是誰」的網頁，不一定要在 LINE App 裡開。 |
| **LIFF（在 LINE App 內）** | 使用者在 **LINE App** 裡打開你的網址（例如從聊天室、圖文選單點進來）→ 自動帶 LINE 身份，可用 `liff.login()`、分享等 | 需要「在 LINE 裡分享／邀請／開連結」時。 |

**結論**：  
- **只做「用 LINE 登入、辨識身份」** → 用 **LINE Login（OAuth）** 即可，**不需要** 在 LINE App（LIFF）裡開。  
- **要做「分享到 LINE 聊天／邀請好友／在 LINE 內開連結」** → 就**必須**在 LINE App（LIFF）裡開。

專案中 **LINE Login（OAuth）** 的實作在：  
- 後端：`server/routes/auth.js`（`/api/auth/line-login`、`/api/auth/line-callback`）  
- 前端範例：`public/financial-upload.html`（「使用 LINE 登入」按鈕 → 導向 OAuth → 回調帶 `userId`）

---

## 二、哪些功能「必須」在 LINE App（LIFF）裡才能用？

下面整理：**一定要在 LINE App 內開（LIFF）** 的功能 vs **用一般瀏覽器 + LINE Login（OAuth）就能做** 的功能。

### 2.1 必須使用 LINE App（LIFF）的功能

這些功能用了 **LIFF 專用 API**，只在 LINE 內建瀏覽器有效，一般瀏覽器無法取代：

| 功能 | 使用的 LIFF API | 出現位置 |
|------|-----------------|----------|
| **分享到 LINE（選好友／傳到聊天室）** | `liff.shareTargetPicker()`、`liff.shareMessage()` | 行事曆分享行程、列表分享整月、行程詳情分享、新增行程後分享、成員邀請新夥伴、個人頁邀請 |
| **在 LINE 內開外部連結** | `liff.openURL()` | 管理中心「在 LINE 內開財力上傳」、個人頁開連結 |
| **關閉 LIFF 視窗** | `liff.closeWindow()` | `public/js/liff.js`（關閉按鈕） |
| **從 LINE 聊天／選單點連結進入** | 由 LINE 開啟你的網址（LIFF Endpoint） | 所有「從 LINE 點進來」的入口 |

對應的程式位置：

- `public/js/liff.js`：`shareTargetPicker`、`shareMessage`、`openURL`、`closeWindow`
- `public/js/calendar.js`：分享行程（shareTargetPicker / shareMessage）
- `public/js/list.js`：分享整月、分享行程
- `public/js/event-detail.js`：分享行程
- `public/js/add-event.js`：新增後分享
- `public/js/members.js`：邀請新成員（shareTargetPicker）
- `public/js/profile.js`：邀請新夥伴（shareTargetPicker）、openURL
- `public/js/management.js`：openURL（開財力上傳等）
- React 前端：`MembersPage.jsx`、`EventDetailPage.jsx` 的分享

**結論**：  
- **「分享到 LINE」**（選好友、傳訊息）  
- **「邀請新成員／新夥伴」**（用 shareTargetPicker 發字卡）  
- **「在 LINE 內開連結 / 關閉視窗」**  

→ 這些都**必須**在 LINE App（LIFF）裡使用。

---

### 2.2 不需要 LINE App，用「LINE Login（OAuth）」即可的功能

這些功能**只需要「知道是誰」（userId）**，用一般瀏覽器 + 你現有的 LINE Login（OAuth）就能做，**不必**在 LINE App 裡開：

| 功能／頁面 | 目前寫法 | 改為 OAuth 後 |
|------------|----------|----------------|
| **登入、取得 userId** | 多數頁面用 LIFF（liffReady、getUserId） | 改用 `/api/auth/line-login` → 回調帶 `userId`（你已在財力上傳這樣做） |
| **財力上傳** | 已用 OAuth，無 LIFF | 維持現狀，不需 LINE App ✅ |
| **財力預覽** | 無登入，僅預覽文件 | 維持現狀，不需 LINE App ✅ |
| **管理中心（數據／財力／權限）** | 用 `liff.js` + `getUserId()` 辨識身份 | 可改為：未登入顯示「使用 LINE 登入」→ OAuth → 回調帶 `userId`，不需 LIFF |
| **成員列表（僅看列表）** | 用 getUserId 呼叫 API | 可改 OAuth 取得 userId，不需 LIFF |
| **成員詳情（僅看詳情）** | 用 getUserId 做權限檢查 | 可改 OAuth，不需 LIFF |
| **個人資料（僅看／編輯資料）** | 用 getUserId、getProfile | profile 可由後端 API 回傳；可改 OAuth，不需 LIFF |
| **行事曆（僅看／點選日期）** | 用 getUserId 拉行程 | 可改 OAuth，不需 LIFF |
| **行程列表（僅看列表）** | 用 getUserId 拉行程 | 可改 OAuth，不需 LIFF |
| **新增／編輯／刪除行程** | 用 getUserId 送 API | 可改 OAuth，不需 LIFF |

也就是說：  
**只要不依賴「分享／邀請／openURL／closeWindow」**，該頁面都可以改成「一般網頁 + LINE Login（OAuth）」，**不需要**在 LINE App（LIFF）裡開。

---

## 三、各頁面與 LIFF 依賴關係總表

| 頁面／功能 | 有載入 liff.js／LIFF SDK | 只用來取 userId／profile | 有使用分享／邀請／openURL | 可否改為「僅 OAuth、不用 LINE App」 |
|------------|---------------------------|---------------------------|----------------------------|--------------------------------------|
| **index.html（行事曆）** | ✅ | ✅ | ✅ 分享行程 | 可改 OAuth 做「看／編輯」；「分享」仍須在 LINE 內 |
| **list.html（行程列表）** | ✅ | ✅ | ✅ 分享整月／行程 | 同上 |
| **members.html（成員列表）** | ✅ | ✅ | ✅ 邀請新夥伴 | 可改 OAuth 做「看列表」；「邀請」須在 LINE 內 |
| **member-detail.html** | ✅ | ✅ | ❌ | ✅ 可改為僅 OAuth |
| **profile.html（個人資料）** | ✅ | ✅ | ✅ 邀請、openURL | 可改 OAuth 做「看／編輯」；「邀請」須在 LINE 內 |
| **add-event.html** | ✅ | ✅ | ✅ 新增後分享 | 可改 OAuth 做「新增」；「分享」須在 LINE 內 |
| **event-detail.html** | ✅ | ✅ | ✅ 分享 | 可改 OAuth 做「看／編輯」；「分享」須在 LINE 内 |
| **management.html（管理中心）** | ✅ | ✅ | ✅ openURL 開連結 | ✅ 可改為僅 OAuth（openURL 改一般 `window.open` 即可） |
| **financial-upload.html** | ❌ | 用 OAuth 取得 userId | ❌ | ✅ 已是不用 LINE App |
| **financial-preview.html** | ❌ | 無登入 | ❌ | ✅ 已是不用 LINE App |
| **standalone 分享頁**（event-detail-standalone、month-events-standalone） | 依實際實作 | - | - | 通常僅供「從 LINE 點連結開啟」時使用 |

---

## 四、實務建議（如何拆「LIFF 必須」與「一般網頁」）

1. **一定要在 LINE App（LIFF）的**  
   - 從 LINE 聊天／選單進入的「主入口」（例如首頁、行事曆）。  
   - 所有「分享到 LINE」「邀請新成員／新夥伴」的按鈕與流程。  
   - 需要在 LINE 內開連結、關閉視窗的流程。

2. **可以改成一般網頁 + LINE Login（OAuth）的**  
   - 管理中心（數據、財力、權限）。  
   - 財力上傳、財力預覽（已或可維持不依賴 LIFF）。  
   - 若你願意捨棄「在該頁按分享／邀請」，則：成員列表、成員詳情、個人資料、行事曆、行程列表、新增／編輯行程的「純 CRUD」部分，都可以用 OAuth 在一般瀏覽器完成。

3. **登入方式總結**  
   - **LINE 登入可以不用 LIFF（不用在 LINE App 裡開）**：用 **LINE Login（OAuth）** 即可。  
   - **只有當功能需要「分享／邀請／openURL／closeWindow」時**，才必須在 **LINE App（LIFF）** 裡使用。

若你要，我可以再幫你列「具體要改的檔案與程式位置」（例如 management 改成 OAuth 的步驟）。

---

## 五、為什麼不想只用 LIFF 當入口？— 桌面捷徑與同時用 LINE

目前若**入口是 LIFF**（從 LINE App 點連結進入），會有兩個實際困擾：

### 5.1 無法在手機桌面建立捷徑

- LIFF 是在 **LINE 內建瀏覽器** 裡開的網頁，不是獨立 App。
- 使用者**無法**像一般網站那樣，在手機桌面「加入主畫面／建立捷徑」。
- 每次都要：打開 LINE → 找聊天／選單 → 點連結，才能進你的服務。

### 5.2 使用 LIFF 時無法同時用 LINE（例如 LINE 會議室）

- 在 LIFF 頁面時，使用者等於「卡在」LINE 的內建瀏覽器裡。
- 若要開 **LINE 會議室**、回訊息、看其他群組，必須先離開 LIFF（或切換 App），無法「同一個 LINE 裡」一邊用你的服務一邊開會議室。

**結論**：若希望「可以加桌面捷徑」且「用你服務的同時還能用 LINE（例如會議室）」，就需要**主要入口改為一般網頁**，而不是只依賴 LIFF。

---

## 六、建議做法：一般網頁當主入口，LIFF 當輔助

| 入口 | 網址／方式 | 用途 | 可加桌面捷徑？ | 可同時用 LINE？ |
|------|------------|------|----------------|-----------------|
| **主入口（建議）** | 一般瀏覽器開你的網址，例如 `https://你的網域/` | 日常使用：行事曆、成員、個人資料、管理中心等；登入用 **LINE Login（OAuth）** | ✅ 可「加入主畫面」 | ✅ 你的服務在瀏覽器，LINE 在另一個 App／分頁，可同時用 |
| **LIFF 入口（輔助）** | 從 LINE 聊天／選單點連結 → 在 LINE 內開 LIFF | 需要「分享到 LINE」「邀請新成員」時，或從 LINE 直接點進來時 | ❌ 無法 | ❌ 在 LINE 內時無法同時用會議室等 |

具體建議：

1. **把「主入口」改為一般網頁**
   - 同一個前端（或一份複製）用 **一般網址** 發布，例如：`https://你的網域/` 或 `https://你的網域/index.html`。
   - 未登入時顯示「使用 LINE 登入」→ 導向 `/api/auth/line-login`（OAuth），登入後回調帶 `userId`，不需在 LINE App 裡開。
   - 使用者用 **Chrome / Safari** 開這個網址，就可以在瀏覽器選單裡「加入主畫面」，等於桌面捷徑。

2. **LIFF 保留給「從 LINE 進來」或「要分享／邀請」時**
   - LINE 聊天／圖文選單的連結仍然指向 LIFF 網址（`https://liff.line.me/你的LIFF_ID/...`），讓從 LINE 點進來的人照舊用 LIFF。
   - 或在一般網頁裡，當使用者按「分享到 LINE」「邀請新成員」時，導向 LIFF 網址（或開新視窗到 LIFF），在 LINE 內完成分享／邀請後再回一般網頁（若你有做回導邏輯）。

3. **同時使用 LINE（例如會議室）**
   - 主入口在**瀏覽器**時，使用者可以：手機開瀏覽器用你的服務，需要時切到 LINE App 開會議室、回訊息，兩邊並行，不會「卡在 LIFF 裡」。

這樣就能同時滿足：
- **可以保存捷徑在手機桌面**（用一般網址 + 加入主畫面）；
- **使用你服務時仍可繼續用 LINE**（例如 LINE 會議室），因為主入口在瀏覽器而非 LIFF。

---

## 七、把「必須用 LINE」的功能寫在後端，是不是就不用 LIFF？

**可以。** 若你把「發送訊息到 LINE」改成**全部由後端用 Messaging API（Push）** 來做，前端就**不需要**在 LINE 瀏覽器（LIFF）裡開，用一般瀏覽器 + LINE Login（OAuth）即可。

### 7.1 後端已經能做的事（你專案已有）

| 功能 | 後端做法 | 是否需要 LIFF？ |
|------|----------|-----------------|
| **發送行程字卡給指定對象** | `POST /api/line/push-share-event`（Body: eventId, userId, targetId 選填） | ❌ 不需要，一般網頁呼叫 API 即可 |
| **發送整月行程給指定對象** | `POST /api/line/push-share-month`（Body: year, month, type, userId, targetId 選填） | ❌ 不需要 |
| **發送邀請／任意訊息給指定 userId** | `lineService.pushMessagesToUser(userId, messages)`（Messaging API Push） | ❌ 不需要 |

也就是說：**「誰要收到」由你的後端決定**（例如：自己、或從成員列表選一個人），由後端呼叫 LINE Messaging API 發送，**不需要**使用者在 LINE App 裡開 LIFF。

### 7.2 不用 LIFF 也能「選好友／群組」：LINE URL Scheme（官方做法）

就像手機相簿分享照片到 LINE 時，是透過系統的「分享」選單選 LINE，不必先開 LIFF；從**網頁**要分享文字或連結給指定好友／群組，LINE 也提供官方 **LINE URL Scheme**：從一般網頁或任何 App 點連結，就能打開 LINE 的「分享給…」畫面，讓使用者選好友、群組、多人聊天，**不需要 LIFF**。

| 方式 | 網址格式 | 說明 |
|------|----------|------|
| **分享文字／連結給好友或群組** | `https://line.me/R/share?text={已編碼的訊息}` | 點擊後會開啟 LINE App，並出現「分享給…」畫面，使用者可選擇好友、群組、多人聊天等。`{訊息}` 需做 UTF-8 百分號編碼（percent-encode）。 |

**範例（一般網頁按鈕）：**

```javascript
// 分享一段文字 + 連結給 LINE 好友／群組（不需 LIFF）
const message = '請看這個行程：' + window.location.href;
const lineShareUrl = 'https://line.me/R/share?text=' + encodeURIComponent(message);
window.open(lineShareUrl, '_blank');  // 或 location.href = lineShareUrl
```

使用者點「分享到 LINE」→ 手機會開 LINE → LINE 顯示「分享給…」→ 選好友或群組 → 送出。**全程不需要在 LINE 內建瀏覽器（LIFF）裡開你的網頁**。

**官方文件**：[Use LINE features with the LINE URL scheme](https://developers.line.biz/en/docs/messaging-api/using-line-url-scheme/) → "Sending text messages" 一節。

**注意**：
- 僅支援 **LINE for iOS / Android**；PC 版（Windows / macOS）不支援此 URL scheme。
- 若裝置未安裝 LINE，點連結會開啟瀏覽器並導向下載 LINE 的說明頁。

### 7.3 其他「不用 LIFF 也能分享」的方式

| 方式 | 適用情境 | 說明 |
|------|----------|------|
| **LINE URL Scheme** `https://line.me/R/share?text=...` | 從網頁／App 分享「文字或連結」到 LINE 好友／群組 | 如上，點連結 → 開 LINE → 選人，不需 LIFF。 |
| **Web Share API** `navigator.share({ title, text, url })` | 從網頁觸發手機的系統分享選單 | 在手機瀏覽器可選「LINE」等 App；由系統列出可分享的 App，不保證一定有 LINE。 |
| **後端 Messaging API Push** | 發給「已知的」userId／群組 ID | 對象由後端或網頁選單決定，不能讓使用者在 LINE 裡從好友名單選人。 |

所以：**若你要的是「在一般網頁按分享 → 開 LINE → 使用者自己選好友／群組」**，用 **`https://line.me/R/share?text=...`** 即可，**不必使用 LIFF**。

### 7.4 結論：全部寫在後端時，可以不用 LIFF（LINE 瀏覽器）

- **登入**：LINE Login（OAuth），一般瀏覽器即可。
- **發送訊息到 LINE**：由後端用 **Messaging API Push** 發給指定 userId／群組，前端只負責呼叫你的 API（例如 `push-share-event`、`push-share-month`、或自訂的「發送邀請」API）。
- **發送對象**：改為「發給自己」或「從成員列表選」或「管理員指定」，不再用 LINE 的 shareTargetPicker。
- **openURL / closeWindow**：不再用 LIFF 時，改為一般連結或 `window.open` 即可。

這樣整份應用都可以在**一般瀏覽器**使用，**不需要** LIFF（LINE 內建瀏覽器）；需要「傳到 LINE」的流程，全部由後端完成。
