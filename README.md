# 濾掛咖啡微型電商 MVP

本專案採用 Serverless 架構，分為前台購物網與後台管理端。主要目標是快速驗證市場、降低開發與維護成本，並確保金流與會員資料的安全性。

## 系統架構 (Tech Stack)
* **前/後台介面**：Vue.js 3 (Composition API / Vite)
* **身分驗證**：Firebase Authentication 
* **API 中介層**：Google Apps Script (GAS)
* **核心資料庫**：Google Sheets (Orders, Products, Members)
* **商業分析**：Looker Studio
* **金流服務**：台灣綠界科技 (ECPay)

---

## Phase 1：核心資料庫 (Google Sheets) 結構規劃

請在 Google Sheets 中建立這三個工作表 (Tabs)，並在第一列 (Row 1) 填寫以下英文名稱作為標題：

### 1. `Products` (商品表)
* `product_id`: 商品唯一碼 (例：`P001`)
* `name`: 商品名稱
* `price`: 售價 (數值)
* `stock`: 庫存數量 (數值)
* `status`: 狀態 (`active` / `inactive`)
* `image_url`: 圖片網址
* `description`: 簡單描述文字

### 2. `Members` (會員表)
* `uid`: Firebase 生成的 UID (Primary Key)
* `email`: 註冊信箱
* `name`: 收件人姓名
* `phone`: 手機號碼
* `created_at`: 建立時間 (`ISOString`)

### 3. `Orders` (訂單表)
* `order_id`: 訂單編號 (例：`ORD1700001234`)
* `uid`: 購買者的 Firebase UID
* `items`: 購買品項明細 (JSON 字串，例：`[{"id":"P001","qty":2,"price":300}]`)
* `total_amount`: 結帳總金額
* `status`: 訂單狀態 (`pending` / `paid` / `shipped`)
* `shipping_info`: 寄送資訊 (JSON 字串)
* `created_at`: 下單時間
* `ecpay_trade_no`: 綠界交易序號

---

## Phase 2：後端 API (Google Apps Script) 部署與設定

為了讓 Vue 專案可以對 Google Sheets 進行 CRUD (新增/讀取/修改/刪除) 操作，需要建立 GAS 專案作為中介的 API Server。

### 步驟 1：建立 GAS 專案
1. 打開你剛建好的 Google Sheets。
2. 點擊頂部選單的 **「擴充功能」 -> 「Apps Script」**。
3. 將原本編輯器裡的 `function myFunction() {}` 清空。
4. 將本專案目錄下 `gas/main.gs` 裡的所有程式碼複製，貼上到線上的 GAS 編輯器中。
5. 將最上方的 `SHEET_ID` 替換成剛剛的試算表 ID。
   *(ID 在網址列 `d/` 與 `/edit` 中間那串字元)*

### 步驟 2：發布與部署
1. 點擊 GAS 編輯器右上角的 **「部署」 -> 「新增部署作業」**。
2. 點擊左上方齒輪圖示，選擇 **「網頁應用程式」** (Web App)。
3. 在設定區塊中：
   * **說明**：可自由填寫（如：`v1.0`）
   * **執行身分**：選擇 **「我 (你的信箱)」**
   * **誰可以存取**：選擇 **「所有人 (Anyone)」**
4. 點擊右下角的 **「部署」**。

### 步驟 3：授權存取Google帳號
1. 初次部署會跳出「授權存取」的提示框，點擊 **「審查權限」**。
2. 選擇你自己的 Google 帳號。
3. 看到「Google 尚未驗證這個應用程式」的警告畫面時，點擊左下方 **「進階」 -> 「前往 不安全 的網頁」**。
4. 點擊 **「允許」**。

### 步驟 4：套用到 Vue 專案
1. 授權完成後，GAS 會給你一串 **「網頁應用程式 (Web App) URL」**，將它複製下來。
2. 回到 Vue 專案，打開 `src/utils/api.js`。
3. 將最上方的 `GAS_DEPLOY_URL` 換成你剛剛複製的 URL 字串。

> 💡 **Tip**: 未來如果又修改了 GAS 的程式碼，記得要再次點擊「部署」->「管理部署作業」，然後按右上角鉛筆圖示編輯，版本選 **「建立新版本」** 後再部署，新的程式碼才會生效！

---

## Phase 3：前台購物與金流 (ECPay 串接)

採用 Serverless 掛載綠界金流的痛點在於加密 (CheckMacValue) 必須在後端進行。
1. **生成隱藏表單**：Vue 透過 API 傳送購物車資料給 GAS。
2. **計算 CheckMacValue**：GAS 計算出符合綠界安全規範的 SHA256 加密檢查碼，並建立出始訂單 (狀態 `pending`)。
3. **無痛跳轉**：GAS 將完整的參數回傳給 Vue，Vue 動態建立 `<form>` 表單並自動 `submit`，轉導至綠界收銀台。
4. **Webhook 更新狀態**：付款成功後，綠界會透過 POST 請求背景回傳我們 GAS 的所在網址 (`ReturnURL`)，GAS 將自動去 Google Sheets 更新該訂單狀態為 `paid`。

---

## Phase 4：銷售數據報表 (Looker Studio)

建立視覺化營收儀表板，無須撰寫任何程式碼，因為它能原生即時同步 Google Sheets 資料。

### 步驟 1：建立 Looker Studio 資料來源
1. 前往 [Looker Studio](https://lookerstudio.google.com/) 並登入。
2. 點擊「建立」 -> 「資料來源」。
3. 選擇「Google 試算表」，並授權存取你的雲端硬碟。
4. 選擇你的 **「專案資料庫試算表」**，工作表點選 **`Orders`**，點擊右上角「連線」。
5. 確認欄位型別正確 (如 `total_amount` 為數字、`created_at` 為日期時間格式)，點擊右上方「建立報表」。

### 步驟 2：視覺化圖表規劃建議
1. **總營收 (計分卡)**：
   * 新增「計分卡」圖表。
   * **指標**：`total_amount` (設定為「總和」)。
2. **營收趨勢走勢 (時間序列圖)**：
   * 新增「時間序列圖」。
   * **維度**：`created_at`。
   * **指標**：`total_amount` (總和)。
3. **訂單狀態分佈 (圓餅圖)**：
   * 新增「圓餅圖」。
   * **維度**：`status`。
   * **指標**：`Record Count`。可判斷 `paid` 與 `pending` 比例。
4. 面板上方可新增一個 **「日期範圍控制項」**，隨時拖曳查詢本月或本季營收。
