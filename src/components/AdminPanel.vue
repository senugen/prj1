<script setup>
import { ref, onMounted } from 'vue';
import { productsApi, membersApi } from '../utils/api';
import { ordersApi } from '../utils/ordersApi';

const currentTab = ref('products'); // 'products', 'orders', 'members'
const products = ref([]);
const orders = ref([]);
const members = ref([]);
const loading = ref(false);

// 商品表單
const newProduct = ref({ product_id: '', name: '', price: 0, stock: 0, status: 'active', image_url: '', description: '' });

const fetchProducts = async () => {
  loading.value = true;
  products.value = await productsApi.getAll();
  loading.value = false;
};

const fetchOrders = async () => {
  loading.value = true;
  orders.value = await ordersApi.getAll();
  orders.value.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  loading.value = false;
};

const fetchMembers = async () => {
  loading.value = true;
  members.value = await membersApi.getAll();
  members.value.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  loading.value = false;
};

const handleAddProduct = async () => {
  if (!newProduct.value.product_id || !newProduct.value.name) return alert('ID 與名稱必填');
  await productsApi.add({ ...newProduct.value });
  newProduct.value = { product_id: `P${Date.now().toString().slice(-4)}`, name: '', price: 0, stock: 0, status: 'active', image_url: '', description: '' };
  await fetchProducts();
};

const editingId = ref(null);
const editForm = ref({});

const startEdit = (p) => {
  editingId.value = p.product_id;
  editForm.value = { ...p };
};

const cancelEdit = () => {
  editingId.value = null;
  editForm.value = {};
};

const saveEdit = async () => {
  loading.value = true;
  await productsApi.update(editForm.value);
  editingId.value = null;
  await fetchProducts();
};

const handleDeleteProduct = async (id) => {
  if (!confirm(`確定刪除 ${id}?`)) return;
  await productsApi.delete(id);
  await fetchProducts();
};

// 切換 Tab 時自動載入對應資料
const switchTab = (tab) => {
  currentTab.value = tab;
  if (tab === 'products') fetchProducts();
  if (tab === 'orders') fetchOrders();
  if (tab === 'members') fetchMembers();
};

onMounted(() => {
  newProduct.value.product_id = `P${Date.now().toString().slice(-4)}`;
  fetchProducts();
});

const formatItemsSafe = (itemsStr) => {
  if (!itemsStr) return '-';
  try {
    const items = typeof itemsStr === 'string' ? JSON.parse(itemsStr) : itemsStr;
    if (!Array.isArray(items)) return '-';
    return items.map(i => {
      const p = products.value.find(p => p.product_id === i.id);
      return `${p ? p.name : i.id} x ${i.qty}`;
    }).join('<br>');
  } catch (e) {
    return itemsStr;
  }
};

const formatShippingSafe = (infoStr) => {
  if (!infoStr) return '-';
  try {
    const info = typeof infoStr === 'string' ? JSON.parse(infoStr) : infoStr;
    return `${info.name || '無名稱'}<br><span style="color:#777; font-size:0.8rem">${info.address || '無地址'}</span>`;
  } catch (e) {
    return infoStr;
  }
};
</script>

<template>
  <div class="admin-panel">
    <div class="sidebar">
      <h2>後台管理</h2>
      <ul>
        <li :class="{ active: currentTab === 'products' }" @click="switchTab('products')">商品管理</li>
        <li :class="{ active: currentTab === 'orders' }" @click="switchTab('orders')">訂單總覽</li>
        <li :class="{ active: currentTab === 'members' }" @click="switchTab('members')">會員列表</li>
      </ul>
    </div>
    
    <div class="content">
      <!-- 狀態提示 -->
      <div v-if="loading" class="loading-bar">資料載入/處理中...</div>

      <!-- 商品管理區 -->
      <div v-if="currentTab === 'products'" class="tab-content">
        <h3>新增商品</h3>
        <div class="add-form">
          <input v-model="newProduct.product_id" placeholder="ID" />
          <input v-model="newProduct.name" placeholder="名稱" />
          <input v-model.number="newProduct.price" type="number" placeholder="價格" />
          <input v-model.number="newProduct.stock" type="number" placeholder="庫存" />
          <input v-model="newProduct.image_url" placeholder="圖片網址" />
          <input v-model="newProduct.description" placeholder="商品詳情介紹" />
          <button @click="handleAddProduct" :disabled="loading" class="btn btn-add">新增</button>
        </div>

        <h3>商品列表</h3>
        <table>
          <thead><tr><th>ID</th><th>名稱</th><th>價格</th><th>庫存</th><th>狀態</th><th>圖片/描述</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="p in products" :key="p.product_id">
              <td>{{ p.product_id }}</td>
              <td v-if="editingId === p.product_id"><input v-model="editForm.name" class="edit-input"/></td>
              <td v-else>{{ p.name }}</td>
              
              <td v-if="editingId === p.product_id"><input v-model.number="editForm.price" type="number" class="edit-input"/></td>
              <td v-else>${{ p.price }}</td>
              
              <td v-if="editingId === p.product_id"><input v-model.number="editForm.stock" type="number" class="edit-input"/></td>
              <td v-else>{{ p.stock }}</td>
              
              <td v-if="editingId === p.product_id">
                <select v-model="editForm.status" class="edit-input">
                  <option value="active">上架</option>
                  <option value="inactive">下架</option>
                </select>
              </td>
              <td v-else>{{ p.status === 'active' ? '上架' : '下架' }}</td>
              
              <td v-if="editingId === p.product_id">
                <input v-model="editForm.image_url" placeholder="圖URL" class="edit-input" style="margin-bottom: 4px;" /><br/>
                <input v-model="editForm.description" placeholder="描述" class="edit-input" />
              </td>
              <td v-else>
                <div style="font-size:0.75rem; max-width:140px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color: #555;">
                  [圖]{{ p.image_url ? '✔' : '✘' }} | {{ p.description || '無描述' }}
                </div>
              </td>
              
              <td>
                <template v-if="editingId === p.product_id">
                  <button @click="saveEdit" class="btn btn-add" style="padding:0.3rem; margin-right:4px;">儲存</button>
                  <button @click="cancelEdit" class="btn btn-del" style="background:#7f8c8d; padding:0.3rem;">取消</button>
                </template>
                <template v-else>
                  <button @click="startEdit(p)" class="btn btn-add" style="padding:0.3rem 0.6rem; margin-right:4px; background:#3498db;">編輯</button>
                  <button @click="handleDeleteProduct(p.product_id)" class="btn btn-del">刪除</button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 訂單管理區 -->
      <div v-if="currentTab === 'orders'" class="tab-content">
        <h3>訂單總覽 (由 Looker Studio 負責進階分析，此處僅供檢閱)</h3>
        <table>
          <thead><tr><th>訂單編號</th><th>購買明細</th><th>收件人/地址</th><th>金額</th><th>狀態</th><th>時間</th><th>綠界憑證</th></tr></thead>
          <tbody>
            <tr v-for="o in orders" :key="o.order_id">
              <td>{{ o.order_id }}</td>
              <td v-html="formatItemsSafe(o.items)" style="line-height:1.5; font-size:0.9rem"></td>
              <td v-html="formatShippingSafe(o.shipping_info)"></td>
              <td>${{ o.total_amount }}</td>
              <td>
                <span class="badge" :class="o.status">
                  {{ o.status === 'pending' ? '待付款' : (o.status === 'paid' ? '已付款' : (o.status === 'shipped' ? '已出貨' : o.status)) }}
                </span>
              </td>
              <td>{{ new Date(o.created_at).toLocaleString() }}</td>
              <td class="ecpay-no">{{ o.ecpay_trade_no || '無' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 會員管理區 -->
      <div v-if="currentTab === 'members'" class="tab-content">
        <h3>會員列表</h3>
        <table>
          <thead><tr><th>UID</th><th>信箱</th><th>姓名</th><th>電話</th><th>註冊時間</th></tr></thead>
          <tbody>
            <tr v-for="m in members" :key="m.uid">
              <td class="ecpay-no">{{ m.uid }}</td>
              <td>{{ m.email }}</td>
              <td>{{ m.name }}</td>
              <td>{{ m.phone }}</td>
              <td>{{ new Date(m.created_at).toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-panel {
  display: flex;
  min-height: 80vh;
  border-top: 2px solid #333;
  margin-top: 2rem;
  font-family: Arial, sans-serif;
}
.sidebar {
  width: 200px;
  background: #2c3e50;
  color: white;
  padding: 1.5rem;
}
.sidebar h2 { margin-bottom: 2rem; font-size: 1.2rem; }
.sidebar ul { list-style: none; padding: 0; }
.sidebar li {
  padding: 0.8rem;
  cursor: pointer;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}
.sidebar li:hover { background: #34495e; }
.sidebar li.active { background: #16a085; font-weight: bold; }

.content {
  flex: 1;
  padding: 2rem;
  background: #f9f9f9;
  position: relative;
}
.loading-bar {
  position: absolute;
  top: 0; left: 0; width: 100%;
  background: #f39c12; color: #fff; text-align: center;
  padding: 0.3rem;
  font-size: 0.9rem;
}

.add-form {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  background: white;
  padding: 1rem;
  border: 1px solid #ddd;
}
.add-form input { padding: 0.5rem; border: 1px solid #ccc; flex: 1; }

table { width: 100%; border-collapse: collapse; background: white; color: #333; }
th, td { padding: 0.8rem; border: 1px solid #ddd; text-align: left; }
th { background: #f2f2f2; font-weight: bold; }

.edit-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.4rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.btn { padding: 0.5rem 1rem; border: none; cursor: pointer; color: white; border-radius: 4px; }
.btn-add { background: #27ae60; }
.btn-del { background: #e74c3c; padding: 0.3rem 0.6rem; font-size: 0.8rem; }

.badge {
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: bold;
}
.badge.pending { background: #f1c40f; color: #333; }
.badge.paid { background: #2ecc71; color: white; }
.badge.shipped { background: #3498db; color: white; }

.ecpay-no { font-family: monospace; font-size: 0.85rem; color: #7f8c8d; }
</style>
