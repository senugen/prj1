const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID'; // 請保留你真實的 ID

// ==========================================
// 綠界金流設定 (此為官方測試環境金鑰)
// ==========================================
const ECPAY_HASH_KEY = '5294y06JbISpM5x9';
const ECPAY_HASH_IV = 'v77hoKGq4kWxNNIS';
const ECPAY_MERCHANT_ID = '2000132';
const ECPAY_API_URL = 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5';

function doPost(e) {
  try {
    // 判斷是否為「綠界 Webhook」回傳 (綠界會直接 POST form-data)
    if (e.postData.type === 'application/x-www-form-urlencoded') {
      return handleEcpayWebhook(e.parameter);
    }

    // 否則就是 Vue 前端打來的 API (text/plain 轉 JSON)
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const payload = postData.payload;

    let result = {};
    switch (action) {
      // ======== 原有功能 ========
      case 'getProducts': result = getRecords('Products'); break;
      case 'addProduct': result = addRecord('Products', payload); break;
      case 'updateProduct': result = updateRecord('Products', 'product_id', payload.product_id, payload); break;
      case 'deleteProduct': result = deleteRecord('Products', 'product_id', payload.product_id); break;
      case 'registerMember': result = handleRegister(payload); break;
      case 'loginMember': result = handleLogin(payload); break;
      case 'getMembers': result = getRecords('Members'); break;
      case 'getOrders': result = getRecords('Orders'); break;
      // ======== 新增：結帳與訂單功能 ========
      case 'createOrder':
        result = processCheckout(payload);
        break;
      
      default: throw new Error("Invalid action: " + action);
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// 處理會員登入註冊
// ==========================================
function handleRegister(payload) {
  const members = getRecords('Members');
  const exist = members.find(m => m.email === payload.email);
  if (exist) {
    throw new Error('此信箱已被註冊');
  }
  const newMember = {
    uid: 'UID' + new Date().getTime(),
    email: payload.email,
    password: payload.password, // 請在 Members 表加上 password 欄位
    name: payload.name,
    phone: payload.phone,
    created_at: new Date().toISOString()
  };
  addRecord('Members', newMember);
  delete newMember.password; // 回傳給前端時隱藏密碼
  return newMember;
}

function handleLogin(payload) {
  const members = getRecords('Members');
  const user = members.find(m => m.email === payload.email && m.password === payload.password);
  if (!user) {
    throw new Error('信箱或密碼錯誤');
  }
  const userReturn = { ...user };
  delete userReturn.password;
  return userReturn;
}

// ==========================================
// 處理結帳與產生 ECPay 參數
// ==========================================
function processCheckout(payload) {
  const { uid, items, total_amount, shipping_info, client_base_url } = payload;
  const order_id = `ORD${new Date().getTime()}`; // 產生唯一訂單編號
  const current_time = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy/MM/dd HH:mm:ss");

  // 動態組合付款成功後的跳轉網址
  const successURL = (client_base_url || 'http://localhost:5174') + '/success';

  // 1. 先將訂單寫入 Google Sheets (狀態: pending)
  const orderRecord = {
    order_id: order_id,
    uid: uid,
    items: JSON.stringify(items),
    total_amount: total_amount,
    status: 'pending',
    shipping_info: JSON.stringify(shipping_info),
    created_at: new Date().toISOString(),
    ecpay_trade_no: '' // 預留
  };
  addRecord('Orders', orderRecord);

  // 2. 準備傳給綠界的參數字典
  let ecpayParams = {
    MerchantID: ECPAY_MERCHANT_ID,
    MerchantTradeNo: order_id,
    MerchantTradeDate: current_time,
    PaymentType: 'aio',
    TotalAmount: total_amount.toString(),
    TradeDesc: '濾掛咖啡微型電商訂單',
    ItemName: '濾掛咖啡商品一批',
    ReturnURL: 'YOUR_GAS_WEBAPP_URL_HERE', // TODO: 填入你 GAS 部署出來的 Web App URL (作為 Webhook)
    ClientBackURL: successURL,     // 綠界頁面上「返回商店」按鈕會導向這裡
    OrderResultURL: successURL,    // 付款完成後綠界自動跳轉到這裡
    ChoosePayment: 'Credit',
    EncryptType: '1',
  };

  // 3. 計算 CheckMacValue (Sha256)
  ecpayParams['CheckMacValue'] = generateCheckMacValue(ecpayParams);

  // 4. 把完整的資料與綠界 API URL 回傳給 Vue，由 Vue 建立隱藏表單送出
  return {
    order_id,
    ecpay_url: ECPAY_API_URL,
    ecpay_params: ecpayParams
  };
}

// ==========================================
// 處理 ECPay Webhook (付款結果通知)
// ==========================================
function handleEcpayWebhook(params) {
  // 檢查 RtnCode 是否為 1 (付款成功)
  if (params.RtnCode === '1') {
    try {
      // 取出訂單編號與綠界交易序號
      updateRecord('Orders', 'order_id', params.MerchantTradeNo, {
        status: 'paid',
        ecpay_trade_no: params.TradeNo
      });
    } catch (err) {
      console.log('Webhook 更新失敗', err);
    }
  }
  // 必須回傳 1|OK 給綠界，否則綠界會一直重試
  return ContentService.createTextOutput("1|OK").setMimeType(ContentService.MimeType.TEXT);
}

// ==========================================
// ECPay CheckMacValue 加密演算法 (SHA256)
// ==========================================
function generateCheckMacValue(params) {
  // 1. 依照參數名稱排序 (A-Z)
  let keys = Object.keys(params).sort();
  let queryString = keys.map(key => `${key}=${params[key]}`).join('&');
  
  // 2. 加上 HashKey 與 HashIV
  let rawString = `HashKey=${ECPAY_HASH_KEY}&${queryString}&HashIV=${ECPAY_HASH_IV}`;
  
  // 3. URL Encode (GAS 的 encodeURIComponent 行為與綠界官方的 UrlEncode 略有不同，需對特例替換)
  let encodedString = encodeURIComponent(rawString)
      .replace(/%20/g, '+')
      .replace(/%21/g, '!')
      .replace(/%2A/g, '*')
      .replace(/%28/g, '(')
      .replace(/%29/g, ')')
      .toLowerCase();
      
  // 4. SHA256 加密轉大寫
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, encodedString, Utilities.Charset.UTF_8);
  let txtHash = '';
  for (let i = 0; i < rawHash.length; i++) {
    let hashVal = rawHash[i];
    if (hashVal < 0) { hashVal += 256; }
    if (hashVal.toString(16).length == 1) { txtHash += '0'; }
    txtHash += hashVal.toString(16);
  }
  return txtHash.toUpperCase();
}

// ==========================================
// 共用 CRUD 函式 (不變)
// ==========================================
function getSheet(sheetName) { return SpreadsheetApp.openById(SHEET_ID).getSheetByName(sheetName); }
function getRecords(sheetName) {
  const sheet = getSheet(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1).map(row => {
    let obj = {};
    data[0].forEach((header, i) => obj[header] = row[i]);
    return obj;
  });
}
function addRecord(sheetName, dataObj) {
  const sheet = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => dataObj[header] !== undefined ? dataObj[header] : "");
  sheet.appendRow(newRow);
  return dataObj;
}
function updateRecord(sheetName, keyField, keyValue, updateObj) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const keyIndex = headers.indexOf(keyField);
  for (let i = 1; i < data.length; i++) {
    if (data[i][keyIndex] === keyValue) {
      headers.forEach((header, colIndex) => {
        if (updateObj[header] !== undefined) sheet.getRange(i + 1, colIndex + 1).setValue(updateObj[header]);
      });
      return { [keyField]: keyValue, updated: true };
    }
  }
  throw new Error("Record not found for update");
}
function deleteRecord(sheetName, keyField, keyValue) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const keyIndex = data[0].indexOf(keyField);
  for (let i = 1; i < data.length; i++) {
    if (data[i][keyIndex] === keyValue) {
      sheet.deleteRow(i + 1);
      return { [keyField]: keyValue, deleted: true };
    }
  }
  throw new Error("Record not found");
}
