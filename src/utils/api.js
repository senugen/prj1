const GAS_DEPLOY_URL = 'https://script.google.com/macros/s/AKfycbwy4djH2RHuXl277UzXj7_K0c0RdUVadTEUHYkt9H3vMlkymKCBgGcRJGJBy16bRdqAMQ/exec';

// 通用的 API 呼叫函式
export async function fetchGasApi(action, payload = {}) {
  try {
    const response = await fetch(GAS_DEPLOY_URL, {
      method: 'POST',
      // 重要：為了繞過跨域資源共用限制 (CORS Preflight)，這裡將 Content-Type 設為 text/plain
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, payload })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'API 錯誤');
    }

    return result.data;
  } catch (error) {
    console.error(`[API Error] action: ${action}`, error);
    throw error;
  }
}

/** 
 *  以下封裝各種商品操作 (Phase 2 後台用)
 */
export const productsApi = {
  // 取得商品列表
  getAll: () => fetchGasApi('getProducts'),

  // 新增單筆商品
  add: (product) => fetchGasApi('addProduct', product),

  // 更新特定商品
  update: (product) => fetchGasApi('updateProduct', product),

  // 刪除特定商品
  delete: (productId) => fetchGasApi('deleteProduct', { product_id: productId })
};

/**
 * 封裝註冊會員資料寫入 Google Sheets 的功能 (Phase 1 補充)
 */
export const membersApi = {
  register: (memberData) => fetchGasApi('registerMember', memberData),
  login: (credentials) => fetchGasApi('loginMember', credentials),
  getAll: () => fetchGasApi('getMembers')
};
