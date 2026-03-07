import { fetchGasApi } from './api';

export const ordersApi = {
  // 建立訂單並取得綠界結帳表單參數
  checkout: (checkoutPayload) => fetchGasApi('createOrder', checkoutPayload),
  
  // 取得所有訂單 (後台用)
  getAll: () => fetchGasApi('getOrders')
};
