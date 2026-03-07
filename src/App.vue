<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue';
import { productsApi, membersApi } from './utils/api';
import { ordersApi } from './utils/ordersApi';
import AdminPanel from './components/AdminPanel.vue';
import { useAuth } from './composables/useAuth';

const isAdminPath = computed(() => window.location.pathname.startsWith('/admin'));
const isSuccessPath = computed(() => window.location.pathname.startsWith('/success'));
const { currentUser, login, register, logout } = useAuth();

// 會員驗證專用
const authEmail = ref('');
const authPassword = ref('');
const authName = ref('');
const authPhone = ref('');
const isRegisterMode = ref(false);

const shippingName = ref('');
const shippingAddress = ref('');

const products = ref([]);
const cart = ref([]);
const loading = ref(false);
const message = ref('');
const cartOpen = ref(false);
const heroVisible = ref(false);
const productsVisible = ref(false);

const showReturnsModal = ref(false);
const showContactModal = ref(false);
const showAboutModal = ref(false);

// 商品詳情 Modal
const selectedProduct = ref(null);
const detailQty = ref(1);

const openDetail = (product) => {
  selectedProduct.value = product;
  detailQty.value = 1;
};
const closeDetail = () => {
  selectedProduct.value = null;
};
const addFromDetail = () => {
  if (!selectedProduct.value) return;
  const p = selectedProduct.value;
  const exist = cart.value.find(item => item.product_id === p.product_id);
  if (exist) {
    exist.qty += detailQty.value;
  } else {
    cart.value.push({ ...p, qty: detailQty.value });
  }
  cartOpen.value = true;
  closeDetail();
};

// 購物車數量 badge
const cartCount = computed(() => cart.value.reduce((n, i) => n + i.qty, 0));

// 載入商品列表
const loadProducts = async () => {
  if (isAdminPath.value) return;
  loading.value = true;
  try {
    const data = await productsApi.getAll();
    products.value = data.filter(p => p.status === 'active' && p.stock > 0);
  } catch (error) {
    message.value = '商品載入失敗：' + error.message;
  } finally {
    loading.value = false;
  }
};

// 加入購物車 (quick add，不開 modal)
const addToCart = (product, e) => {
  if (e) e.stopPropagation();
  const exist = cart.value.find(item => item.product_id === product.product_id);
  if (exist) {
    exist.qty += 1;
  } else {
    cart.value.push({ ...product, qty: 1 });
  }
  cartOpen.value = true;
};

// 調整數量
const updateQty = (productId, delta) => {
  const item = cart.value.find(i => i.product_id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeFromCart(productId);
};

// 移除購物車品項
const removeFromCart = (productId) => {
  cart.value = cart.value.filter(item => item.product_id !== productId);
  if (cart.value.length === 0) cartOpen.value = false;
};

// 計算總金額
const cartTotal = computed(() => {
  return cart.value.reduce((total, item) => total + (item.price * item.qty), 0);
});

// 處理登入/註冊
const handleAuth = async () => {
  if (!authEmail.value || !authPassword.value) {
    return alert('請填寫信箱與密碼');
  }
  loading.value = true;
  message.value = '驗證處理中...';
  try {
    if (isRegisterMode.value) {
      if (!authName.value || !authPhone.value) throw new Error("請填寫姓名與手機號碼");
      const user = await register(authEmail.value, authPassword.value, authName.value, authPhone.value);
      message.value = '註冊成功！';
    } else {
      await login(authEmail.value, authPassword.value);
      message.value = '登入成功！';
    }
  } catch (error) {
    message.value = '登入失敗：' + error.message;
  } finally {
    loading.value = false;
  }
};

// 監聽登入狀態改變自動代入姓名 (若有的話)
watch(currentUser, (newUser) => {
  if (newUser && newUser.name) {
    shippingName.value = newUser.name;
  }
});

// ⚡ 結帳並導向綠界
const handleCheckout = async () => {
  if (cart.value.length === 0) { alert('購物車是空的！'); return; }
  if (!currentUser.value) { alert('請先登入會員以完成結帳綁定'); return; }
  if (!shippingName.value || !shippingAddress.value) { alert('請填寫收件人姓名與寄送地址！'); return; }

  loading.value = true;
  message.value = '正在建立訂單與金流連線...';
  try {
    const payload = {
      uid: currentUser.value.uid,
      items: cart.value.map(item => ({ id: item.product_id, qty: item.qty, price: item.price })),
      total_amount: cartTotal.value,
      shipping_info: { 
        email: currentUser.value.email,
        name: shippingName.value,
        address: shippingAddress.value
      },
      client_base_url: window.location.origin
    };
    const orderData = await ordersApi.checkout(payload);
    message.value = `訂單 ${orderData.order_id} 建立成功，準備跳轉綠界...`;
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = orderData.ecpay_url;
    for (const key in orderData.ecpay_params) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = String(orderData.ecpay_params[key]);
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
  } catch (error) {
    message.value = '結帳失敗：' + error.message;
    loading.value = false;
  }
};

onMounted(() => {
  loadProducts();
  // 觸發進場動畫
  setTimeout(() => { heroVisible.value = true; }, 100);
  setTimeout(() => { productsVisible.value = true; }, 600);
});
</script>

<template>
  <div class="app-root">
    <!-- 後台管理 -->
    <AdminPanel v-if="isAdminPath" />

    <!-- 支付成功頁 -->
    <div v-else-if="isSuccessPath" class="success-page">
      <div class="success-card">
        <div class="success-icon-ring">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2>感謝您的購買</h2>
        <p>我們已經收到您的付款，<br/>您的精品咖啡將在 1-3 天內送達。</p>
        <img src="/success.png" alt="成功" class="success-img" />
        <a href="/" class="btn-back">繼續探索</a>
      </div>
    </div>

    <!-- 前台購物網 -->
    <template v-else>
      <!-- Grain Overlay -->
      <div class="grain-overlay" aria-hidden="true"></div>

      <!-- Navbar -->
      <nav class="navbar" id="main-nav">
        <a href="/" class="brand">
          <span class="brand-icon">◉</span>
          <span class="brand-text">DRIP<span class="brand-dot">.</span></span>
        </a>
        <div class="nav-center">
          <a href="#products-section" class="nav-link">精选</a>
          <a href="#" @click.prevent="showAboutModal = true" class="nav-link">關於</a>
          <a href="#" @click.prevent="showReturnsModal = true" class="nav-link">退換貨</a>
          <a href="#" @click.prevent="showContactModal = true" class="nav-link">聯絡我們</a>
        </div>
        <div class="nav-right">
          <span v-if="currentUser" class="user-badge">
            <span class="user-avatar">{{ currentUser.email?.charAt(0).toUpperCase() }}</span>
            <a href="#" @click.prevent="logout" class="logout-link">登出</a>
          </span>
          <button class="cart-toggle" @click="cartOpen = !cartOpen" id="cart-toggle-btn">
            <svg class="cart-icon-svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="21" r="1.2" fill="currentColor" stroke="none"/>
              <circle cx="20" cy="21" r="1.2" fill="currentColor" stroke="none"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
            </svg>
            <span v-if="cartCount > 0" class="cart-badge">{{ cartCount }}</span>
          </button>
        </div>
      </nav>

      <!-- Hero -->
      <section class="hero" id="hero-section">
        <div class="hero-bg" style="background-image: url('/hero.png')"></div>
        <div class="hero-overlay">
          <div class="hero-content" :class="{ visible: heroVisible }">
            <p class="hero-eyebrow">SPECIALTY COFFEE</p>
            <h1 class="hero-title">
              <span class="hero-line">探索世界</span>
              <span class="hero-line hero-line--accent">精品咖啡</span>
            </h1>
            <p class="hero-sub">每一杯，都是一趟產地直送的旅程</p>
            <a href="#products-section" class="hero-cta">探索豆單</a>
          </div>
        </div>
        <div class="hero-scroll-hint">
          <div class="scroll-line"></div>
        </div>
      </section>

      <!-- 訊息 Bar -->
      <Transition name="msg">
        <div v-if="message" class="msg-bar" @click="message = ''">
          <span>{{ message }}</span>
          <span class="msg-close">✕</span>
        </div>
      </Transition>

      <!-- 商品區 -->
      <main class="main-content" id="products-section">
        <div class="section-header" :class="{ visible: productsVisible }">
          <p class="section-eyebrow">OUR SELECTION</p>
          <h2 class="section-title">精選豆單</h2>
        </div>

        <div v-if="loading && products.length === 0" class="loading-state">
          <div class="loader"></div>
          <p>正在為您挑選最好的咖啡...</p>
        </div>

        <div class="product-grid" :class="{ visible: productsVisible }">
          <div
            v-for="(p, idx) in products"
            :key="p.product_id"
            class="product-card"
            :style="{ '--delay': idx * 0.1 + 's' }"
            @click="openDetail(p)"
          >
            <div class="product-img-wrap">
              <img
                :src="p.image_url || '/product-default.png'"
                :alt="p.name"
                class="product-img"
                @error="(e) => e.target.src = '/product-default.png'"
              />
              <div class="product-img-overlay">
                <button @click="addToCart(p, $event)" class="btn-quick-add" :id="'add-' + p.product_id">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  快速加入
                </button>
              </div>
            </div>
            <div class="product-info">
              <h3 class="product-name">{{ p.name }}</h3>
              <div class="product-meta">
                <span class="product-price">NT$ {{ p.price }}</span>
                <span class="product-stock">餘 {{ p.stock }} 件</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- 商品詳情 Modal -->
      <Transition name="modal">
        <div v-if="selectedProduct" class="detail-backdrop" @click.self="closeDetail">
          <div class="detail-modal">
            <button class="detail-close" @click="closeDetail">✕</button>
            <div class="detail-layout">
              <div class="detail-img-wrap">
                <img
                  :src="selectedProduct.image_url || '/product-default.png'"
                  :alt="selectedProduct.name"
                  class="detail-img"
                  @error="(e) => e.target.src = '/product-default.png'"
                />
              </div>
              <div class="detail-content">
                <p class="detail-eyebrow">DRIP. SPECIALTY</p>
                <h2 class="detail-name">{{ selectedProduct.name }}</h2>
                <p class="detail-price">NT$ {{ selectedProduct.price }}</p>
                <div class="detail-divider"></div>
                <div class="detail-desc">
                  <h4>商品介紹</h4>
                  <p>{{ selectedProduct.description || '精心挑選的優質咖啡，以最佳烘焙曲線呈現產地風味。適合手沖、濾掛等多種沖泡方式，讓您在家也能享受精品咖啡的美好。' }}</p>
                </div>
                <div class="detail-stock">
                  <span>庫存：{{ selectedProduct.stock }} 件</span>
                </div>
                <div class="detail-actions">
                  <div class="detail-qty">
                    <button @click="detailQty = Math.max(1, detailQty - 1)" class="qty-btn">−</button>
                    <span class="qty-display">{{ detailQty }}</span>
                    <button @click="detailQty = Math.min(selectedProduct.stock, detailQty + 1)" class="qty-btn">+</button>
                  </div>
                  <button @click="addFromDetail" class="btn-detail-add">
                    加入購物車 — NT$ {{ selectedProduct.price * detailQty }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 關於我們 Modal -->
      <Transition name="modal">
        <div v-if="showAboutModal" class="detail-backdrop" @click.self="showAboutModal = false">
          <div class="detail-modal text-modal">
            <button class="detail-close" @click="showAboutModal = false">✕</button>
            <div class="text-modal-content">
              <p class="detail-eyebrow">DRIP. SPECIALTY</p>
              <h2 class="detail-name">關於我們</h2>
              <div class="detail-divider"></div>
              <p>我們相信，每一杯好咖啡，都是一段值得細細品味的旅程。從尋豆、烘焙到包裝，DRIP. 致力於將世界各地的莊園級風味，原封不動地交到您手中。</p>
              <div style="display:flex; justify-content:space-around; margin-top:30px; text-align:center;">
                <div>
                  <div style="font-size:1.8rem; font-weight:bold; color:var(--c-accent-l); margin-bottom:5px;">12+</div>
                  <div style="font-size:0.8rem; color:var(--c-text3);">產地來源</div>
                </div>
                <div style="width:1px; background:var(--c-border);"></div>
                <div>
                  <div style="font-size:1.8rem; font-weight:bold; color:var(--c-accent-l); margin-bottom:5px;">100%</div>
                  <div style="font-size:0.8rem; color:var(--c-text3);">精品級生豆</div>
                </div>
                <div style="width:1px; background:var(--c-border);"></div>
                <div>
                  <div style="font-size:1.8rem; font-weight:bold; color:var(--c-accent-l); margin-bottom:5px;">48hr</div>
                  <div style="font-size:0.8rem; color:var(--c-text3);">新鮮烘焙出貨</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 退換貨 Modal -->
      <Transition name="modal">
        <div v-if="showReturnsModal" class="detail-backdrop" @click.self="showReturnsModal = false">
          <div class="detail-modal text-modal">
            <button class="detail-close" @click="showReturnsModal = false">✕</button>
            <div class="text-modal-content">
              <p class="detail-eyebrow">DRIP. SPECIALTY</p>
              <h2 class="detail-name">退換貨政策</h2>
              <div class="detail-divider"></div>
              <p>我們致力於提供最高品質的精品咖啡。如果您收到商品後發現有任何瑕疵或寄送錯誤，請在收到商品後的 7 天內與我們聯繫。</p>
              <h4 style="color:var(--c-accent-l); margin-top:20px; font-weight:bold;">退換貨條件：</h4>
              <ul style="color:var(--c-text); padding-left:20px; line-height:1.8; margin-top:10px;">
                <li>商品須保持未拆封、未使用之原始狀態。</li>
                <li>咖啡豆/濾掛包因食品安全疑慮，如已拆封將不接受退換。</li>
                <li>若是商品寄送錯誤或是運送過程遭遇損壞，退換貨運費將由我們全額負擔。</li>
              </ul>
              <p style="margin-top:20px;">退款將於我們收到退貨並檢查無誤後，於 7-14 個工作天內刷退至您的原信用卡帳戶。</p>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 聯絡我們 Modal -->
      <Transition name="modal">
        <div v-if="showContactModal" class="detail-backdrop" @click.self="showContactModal = false">
          <div class="detail-modal text-modal">
            <button class="detail-close" @click="showContactModal = false">✕</button>
            <div class="text-modal-content">
              <p class="detail-eyebrow">DRIP. SPECIALTY</p>
              <h2 class="detail-name">聯絡我們</h2>
              <div class="detail-divider"></div>
              <p>有任何問題嗎？我們很樂意為您解答。您可以透過以下方式聯繫 DRIP 客服團隊：</p>
              <div style="margin-top:30px;">
                <p><strong>客服信箱：</strong><br/>support@drip-specialty.com</p>
                <div class="detail-divider" style="margin: 15px 0;"></div>
                <p><strong>服務電話：</strong><br/>(02) 2345-6789</p>
                <div class="detail-divider" style="margin: 15px 0;"></div>
                <p><strong>營業時間：</strong><br/>週一至週五 09:00 - 18:00 (國定假日公休)</p>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Cart Drawer (側滑購物車) -->
      <Transition name="drawer">
        <div v-if="cartOpen" class="cart-backdrop" @click.self="cartOpen = false">
          <aside class="cart-drawer" id="cart-drawer">
            <div class="cart-header">
              <h2>購物車</h2>
              <button @click="cartOpen = false" class="cart-close">✕</button>
            </div>

            <div v-if="cart.length === 0" class="cart-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
              <p>尚無商品</p>
            </div>

            <ul v-else class="cart-list">
              <li v-for="item in cart" :key="item.product_id" class="cart-item">
                <img :src="item.image_url || '/product-default.png'" alt="" class="cart-item-img" @error="(e) => e.target.src = '/product-default.png'" />
                <div class="cart-item-detail">
                  <span class="cart-item-name">{{ item.name }}</span>
                  <span class="cart-item-unit">NT$ {{ item.price }}</span>
                </div>
                <div class="cart-item-actions">
                  <button @click="updateQty(item.product_id, -1)" class="qty-btn">−</button>
                  <span class="qty-display">{{ item.qty }}</span>
                  <button @click="updateQty(item.product_id, 1)" class="qty-btn">+</button>
                </div>
                <span class="cart-item-subtotal">NT$ {{ item.price * item.qty }}</span>
                <button @click="removeFromCart(item.product_id)" class="btn-remove">✕</button>
              </li>
            </ul>

            <div v-if="cart.length > 0" class="cart-footer">
              <div class="cart-total-row">
                <span>合計</span>
                <span class="cart-total-price">NT$ {{ cartTotal }}</span>
              </div>

              <!-- 未登入 -->
              <div v-if="!currentUser" class="auth-section">
                <h4>{{ isRegisterMode ? '註冊會員' : '登入會員' }}</h4>
                <div class="auth-fields">
                  <input v-model="authEmail" type="email" placeholder="信箱" id="auth-email" />
                  <input v-model="authPassword" type="password" placeholder="密碼" id="auth-password" />
                  <template v-if="isRegisterMode">
                    <input v-model="authName" type="text" placeholder="姓名" id="auth-name" />
                    <input v-model="authPhone" type="tel" placeholder="聯絡電話" id="auth-phone" />
                  </template>
                </div>
                <button @click="handleAuth" :disabled="loading" class="btn-primary" id="auth-submit">
                  {{ isRegisterMode ? '註冊 (後繼續)' : '登入 (後繼續)' }}
                </button>
                <a href="#" @click.prevent="isRegisterMode = !isRegisterMode" class="auth-toggle">
                  {{ isRegisterMode ? '已有帳號？點此登入' : '還沒帳號？點此註冊' }}
                </a>
              </div>

              <!-- 已登入 -->
              <div v-else class="auth-section">
                <h4>寄送資訊</h4>
                <div class="auth-fields">
                  <input v-model="shippingName" type="text" placeholder="收件人姓名 (必填)" />
                  <input v-model="shippingAddress" type="text" placeholder="寄送地址 (必填)" />
                </div>
                <button @click="handleCheckout" :disabled="loading" class="btn-checkout" id="checkout-btn" style="margin-top: 1rem;">
                  {{ loading ? '處理中...' : '前往結帳' }}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </Transition>

      <!-- Footer -->
      <footer class="site-footer">
        <div class="footer-inner">
          <div class="footer-brand">
            <span class="brand-icon">◉</span> DRIP<span class="brand-dot">.</span>
          </div>
          <p class="footer-copy">© 2024 DRIP — 精品咖啡，匠心呈獻</p>
          <div class="footer-links">
            <a href="#">隱私政策</a>
            <a href="#">退換貨</a>
            <a href="#">聯絡我們</a>
          </div>
        </div>
      </footer>
    </template>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=DM+Sans:wght@400;500;700&family=Noto+Sans+TC:wght@400;500;700;900&display=swap');

:root {
  --c-bg:       #0c0a09;
  --c-bg2:      #1c1917;
  --c-surface:  #292524;
  --c-surface2: #44403c;
  --c-border:   #57534e;
  --c-border-l: #78716c;
  --c-text:     #fafaf9;
  --c-text2:    #a8a29e;
  --c-text3:    #78716c;
  --c-accent:   #d97706;
  --c-accent2:  #b45309;
  --c-accent-l: #fbbf24;
  --c-cream:    #fef3c7;
  --c-success:  #16a34a;
  --c-danger:   #dc2626;
  --radius:     16px;
  --radius-sm:  8px;
  --shadow:     0 24px 48px -12px rgba(0,0,0,0.5);
  --shadow-sm:  0 4px 12px rgba(0,0,0,0.3);
  --font-display: 'Playfair Display', 'Noto Sans TC', serif;
  --font-body:    'DM Sans', 'Noto Sans TC', sans-serif;
  --ease:       cubic-bezier(0.16, 1, 0.3, 1);
}

* { margin: 0; padding: 0; box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  background: var(--c-bg);
  color: var(--c-text);
  font-family: var(--font-body);
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: hidden;
}

.app-root { min-height: 100vh; position: relative; }

/* ===== Grain Overlay ===== */
.grain-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 200px;
}

/* ===== Navbar ===== */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 3rem;
  background: rgba(12, 10, 9, 0.8);
  backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid rgba(87, 83, 78, 0.3);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  transition: background 0.3s;
}
.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: var(--c-text);
}
.brand-icon {
  color: var(--c-accent);
  font-size: 1.3rem;
}
.brand-text {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 900;
  letter-spacing: 3px;
}
.brand-dot { color: var(--c-accent); }

.nav-center {
  display: flex;
  gap: 2rem;
}
.nav-link {
  color: var(--c-text2);
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
  letter-spacing: 2px;
  text-transform: uppercase;
  transition: color 0.3s;
  position: relative;
}
.nav-link::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 0;
  height: 1px;
  background: var(--c-accent);
  transition: width 0.3s var(--ease);
}
.nav-link:hover { color: var(--c-text); }
.nav-link:hover::after { width: 100%; }

.nav-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.user-badge {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
  color: var(--c-text2);
}
.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--c-accent);
  color: var(--c-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.75rem;
}
.logout-link {
  color: var(--c-text3);
  text-decoration: none;
  font-size: 0.8rem;
  transition: color 0.2s;
}
.logout-link:hover { color: var(--c-accent); }

.cart-toggle {
  position: relative;
  background: none;
  border: 1px solid var(--c-border);
  color: var(--c-text);
  padding: 0.55rem 0.65rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.3s var(--ease);
  display: flex;
  align-items: center;
  justify-content: center;
}
.cart-toggle:hover {
  border-color: var(--c-accent);
  color: var(--c-accent);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.2);
}
.cart-toggle:hover .cart-icon-svg {
  animation: cartBounce 0.5s var(--ease);
}
@keyframes cartBounce {
  0%   { transform: translateY(0); }
  30%  { transform: translateY(-3px); }
  50%  { transform: translateY(1px); }
  70%  { transform: translateY(-1px); }
  100% { transform: translateY(0); }
}
.cart-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: var(--c-accent);
  color: var(--c-bg);
  font-size: 0.65rem;
  font-weight: 700;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ===== Hero ===== */
.hero {
  position: relative;
  width: 100%;
  height: 100vh;
  min-height: 600px;
  overflow: hidden;
}
.hero-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  transform: scale(1.08);
  transition: transform 8s linear;
}
.hero:hover .hero-bg { transform: scale(1); }

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(12,10,9,0.2) 0%,
    rgba(12,10,9,0.6) 50%,
    rgba(12,10,9,0.95) 100%
  );
  display: flex;
  align-items: flex-end;
  padding: 0 6rem 8rem;
}
.hero-content {
  max-width: 700px;
  opacity: 0;
  transform: translateY(40px);
  transition: all 1.2s var(--ease);
}
.hero-content.visible {
  opacity: 1;
  transform: translateY(0);
}
.hero-eyebrow {
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 6px;
  color: var(--c-accent-l);
  margin-bottom: 1.5rem;
  text-transform: uppercase;
}
.hero-title {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  font-weight: 900;
  line-height: 1.15;
  margin-bottom: 1.5rem;
}
.hero-line {
  display: block;
}
.hero-line--accent {
  color: var(--c-accent-l);
  font-style: italic;
}
.hero-sub {
  font-size: 1.1rem;
  color: var(--c-text2);
  margin-bottom: 2.5rem;
  letter-spacing: 1px;
}
.hero-cta {
  display: inline-block;
  padding: 0.9rem 2.5rem;
  border: 1px solid var(--c-accent);
  color: var(--c-accent);
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  transition: all 0.4s var(--ease);
}
.hero-cta:hover {
  background: var(--c-accent);
  color: var(--c-bg);
  padding-left: 3rem;
  padding-right: 3rem;
}

.hero-scroll-hint {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
}
.scroll-line {
  width: 1px;
  height: 60px;
  background: linear-gradient(to bottom, var(--c-accent), transparent);
  animation: scrollPulse 2s ease-in-out infinite;
}
@keyframes scrollPulse {
  0%, 100% { opacity: 0.3; transform: scaleY(0.6); }
  50% { opacity: 1; transform: scaleY(1); }
}

/* ===== Message Bar ===== */
.msg-bar {
  background: var(--c-surface);
  border-bottom: 1px solid var(--c-accent);
  color: var(--c-cream);
  text-align: center;
  padding: 0.8rem 2rem;
  font-size: 0.85rem;
  font-weight: 500;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
}
.msg-close { color: var(--c-text3); font-size: 0.75rem; }
.msg-enter-active, .msg-leave-active { transition: all 0.3s var(--ease); }
.msg-enter-from, .msg-leave-to { transform: translateY(-100%); opacity: 0; }

/* ===== About Strip ===== */
.about-strip {
  border-bottom: 1px solid rgba(87,83,78,0.3);
  padding: 3rem 2rem;
}
.about-inner {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 3rem;
}
.about-stat {
  text-align: center;
}
.stat-num {
  display: block;
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 900;
  color: var(--c-accent-l);
  line-height: 1;
  margin-bottom: 0.4rem;
}
.stat-label {
  font-size: 0.8rem;
  color: var(--c-text3);
  letter-spacing: 1px;
}
.about-divider {
  width: 1px;
  height: 40px;
  background: var(--c-border);
}

/* ===== Main Content ===== */
.main-content {
  max-width: 100%;
  margin: 0 auto;
  padding: 5rem 4rem;
}
.section-header {
  text-align: center;
  margin-bottom: 4rem;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.8s var(--ease);
}
.section-header.visible {
  opacity: 1;
  transform: translateY(0);
}
.section-eyebrow {
  font-size: 0.75rem;
  letter-spacing: 5px;
  color: var(--c-accent);
  margin-bottom: 0.6rem;
  font-weight: 500;
}
.section-title {
  font-family: var(--font-display);
  font-size: 2.4rem;
  font-weight: 900;
  letter-spacing: 2px;
}

/* ===== Loading ===== */
.loading-state {
  text-align: center;
  padding: 4rem 0;
  color: var(--c-text3);
}
.loader {
  width: 32px;
  height: 32px;
  border: 2px solid var(--c-border);
  border-top-color: var(--c-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== Product Grid ===== */
.product-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.8rem;
}
.product-grid.visible .product-card {
  opacity: 1;
  transform: translateY(0);
}
.product-card {
  background: var(--c-bg2);
  border: 1px solid rgba(87,83,78,0.2);
  border-radius: var(--radius);
  overflow: hidden;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.6s var(--ease);
  transition-delay: var(--delay);
  cursor: pointer;
}
.product-card:hover {
  border-color: var(--c-accent);
  box-shadow: 0 0 0 1px var(--c-accent), var(--shadow);
}
.product-img-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 4/3;
  overflow: hidden;
  background: var(--c-surface);
}
.product-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.7s var(--ease);
}
.product-card:hover .product-img {
  transform: scale(1.06);
}
.product-img-overlay {
  position: absolute;
  inset: 0;
  background: rgba(12,10,9,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}
.product-card:hover .product-img-overlay {
  opacity: 1;
}
.btn-quick-add {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 1.5rem;
  background: var(--c-accent);
  color: var(--c-bg);
  border: none;
  border-radius: var(--radius-sm);
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  transform: translateY(10px);
  transition: all 0.3s var(--ease);
}
.product-card:hover .btn-quick-add {
  transform: translateY(0);
}
.btn-quick-add:hover {
  background: var(--c-accent-l);
}

.product-info {
  padding: 1.2rem 1.4rem;
}
.product-name {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 0.8rem;
  line-height: 1.4;
}
.product-meta {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.product-price {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--c-accent-l);
}
.product-stock {
  font-size: 0.75rem;
  color: var(--c-text3);
  letter-spacing: 1px;
}

/* ===== Cart Drawer ===== */
.cart-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  justify-content: flex-end;
}
.cart-drawer {
  width: 420px;
  max-width: 90vw;
  height: 100%;
  background: var(--c-bg2);
  border-left: 1px solid var(--c-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.cart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--c-border);
}
.cart-header h2 {
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 700;
}
.cart-close {
  background: none;
  border: none;
  color: var(--c-text3);
  font-size: 1.2rem;
  cursor: pointer;
  transition: color 0.2s;
}
.cart-close:hover { color: var(--c-text); }

.cart-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: var(--c-text3);
}

.cart-list {
  flex: 1;
  overflow-y: auto;
  list-style: none;
  padding: 0.5rem 0;
}
.cart-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 1rem 2rem;
  border-bottom: 1px solid rgba(87,83,78,0.2);
  transition: background 0.2s;
}
.cart-item:hover { background: rgba(255,255,255,0.02); }
.cart-item-img {
  width: 50px;
  height: 50px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  background: var(--c-surface);
}
.cart-item-detail {
  flex: 1;
  min-width: 0;
}
.cart-item-name {
  display: block;
  font-weight: 500;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cart-item-unit {
  font-size: 0.75rem;
  color: var(--c-text3);
}
.cart-item-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.qty-btn {
  width: 26px;
  height: 26px;
  border: 1px solid var(--c-border);
  background: none;
  color: var(--c-text);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.qty-btn:hover { border-color: var(--c-accent); color: var(--c-accent); }
.qty-display {
  font-size: 0.85rem;
  font-weight: 700;
  width: 20px;
  text-align: center;
}
.cart-item-subtotal {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--c-accent-l);
  min-width: 70px;
  text-align: right;
}
.btn-remove {
  background: none;
  border: none;
  color: var(--c-text3);
  cursor: pointer;
  font-size: 0.75rem;
  padding: 0.3rem;
  transition: color 0.2s;
}
.btn-remove:hover { color: var(--c-danger); }

.cart-footer {
  padding: 1.5rem 2rem;
  border-top: 1px solid var(--c-border);
  background: var(--c-bg);
}
.cart-total-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 1.5rem;
}
.cart-total-row > span:first-child {
  font-size: 0.9rem;
  color: var(--c-text2);
}
.cart-total-price {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 900;
  color: var(--c-accent-l);
}

/* ===== Auth Section ===== */
.auth-section {
  background: var(--c-surface);
  border-radius: var(--radius-sm);
  padding: 1.2rem;
}
.auth-section h4 {
  margin-bottom: 0.8rem;
  font-size: 0.9rem;
  color: var(--c-accent-l);
  font-weight: 500;
}
.auth-fields {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.auth-fields input {
  padding: 0.7rem 1rem;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-bg);
  color: var(--c-text);
  font-size: 0.9rem;
  font-family: var(--font-body);
  outline: none;
  transition: border-color 0.2s;
}
.auth-fields input:focus {
  border-color: var(--c-accent);
}
.auth-fields input::placeholder {
  color: var(--c-text3);
}
.btn-primary {
  width: 100%;
  padding: 0.8rem;
  background: var(--c-accent);
  color: var(--c-bg);
  border: none;
  border-radius: var(--radius-sm);
  font-weight: 700;
  cursor: pointer;
  font-size: 0.9rem;
  font-family: var(--font-body);
  transition: all 0.2s;
}
.btn-primary:hover { background: var(--c-accent-l); }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.auth-toggle {
  display: block;
  text-align: center;
  margin-top: 0.8rem;
  font-size: 0.8rem;
  color: var(--c-text3);
  text-decoration: none;
  transition: color 0.2s;
}
.auth-toggle:hover { color: var(--c-accent); }

/* ===== Checkout Button ===== */
.btn-checkout {
  width: 100%;
  padding: 1rem;
  background: var(--c-accent);
  color: var(--c-bg);
  border: none;
  border-radius: var(--radius-sm);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 2px;
  font-family: var(--font-body);
  transition: all 0.3s var(--ease);
  position: relative;
  overflow: hidden;
}
.btn-checkout::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
  transform: translateX(-100%);
  transition: transform 0.6s;
}
.btn-checkout:hover::before {
  transform: translateX(100%);
}
.btn-checkout:hover {
  background: var(--c-accent-l);
  box-shadow: 0 8px 32px rgba(217, 119, 6, 0.3);
}
.btn-checkout:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-checkout:disabled:hover::before { transform: translateX(-100%); }

/* ===== Product Detail Modal ===== */
.detail-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}
.detail-modal {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 32px 64px -16px rgba(0,0,0,0.8);
}
.detail-close {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  background: var(--c-bg2);
  border: 1px solid var(--c-border);
  color: var(--c-text);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s;
}
.detail-close:hover {
  background: var(--c-accent);
  border-color: var(--c-accent);
  color: var(--c-bg);
}
.detail-layout {
  display: flex;
  flex-direction: column;
}
@media (min-width: 768px) {
  .detail-layout { flex-direction: row; }
}
.detail-img-wrap {
  flex: 1;
  background: var(--c-bg2);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  border-bottom: 1px solid var(--c-border);
}
@media (min-width: 768px) {
  .detail-img-wrap { border-bottom: none; border-right: 1px solid var(--c-border); }
}
.detail-img {
  width: 100%;
  max-width: 350px;
  aspect-ratio: 1/1;
  object-fit: contain;
  filter: drop-shadow(0 20px 30px rgba(0,0,0,0.5));
}
.detail-content {
  flex: 1;
  padding: 3rem 2.5rem;
  display: flex;
  flex-direction: column;
}
.detail-eyebrow {
  font-size: 0.75rem;
  letter-spacing: 4px;
  color: var(--c-text3);
  margin-bottom: 0.8rem;
}
.detail-name {
  font-family: var(--font-display);
  font-size: 2rem;
  line-height: 1.2;
  margin-bottom: 0.8rem;
  color: var(--c-cream);
}
.detail-price {
  font-size: 1.4rem;
  color: var(--c-accent-l);
  font-weight: 700;
}
.detail-divider {
  width: 100%;
  height: 1px;
  background: var(--c-border);
  margin: 2rem 0;
}
.detail-desc { margin-bottom: 2rem; }
.detail-desc h4 { color: var(--c-text2); margin-bottom: 0.5rem; font-size: 0.85rem; font-weight: 700; }
.detail-desc p { color: var(--c-text); font-size: 0.95rem; line-height: 1.8; }
.detail-stock { font-size: 0.85rem; color: var(--c-text3); margin-bottom: 1.5rem; }
.detail-actions {
  display: flex;
  gap: 1rem;
  margin-top: auto;
}
.detail-qty {
  display: flex;
  align-items: center;
  background: var(--c-bg2);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  padding: 0.2rem;
}
.qty-btn { background: none; border: none; color: var(--c-text); width: 32px; height: 32px; cursor: pointer; font-size: 1.2rem; }
.qty-btn:hover { color: var(--c-accent); }
.qty-display { width: 40px; text-align: center; font-weight: 700; }
.btn-detail-add {
  flex: 1;
  background: var(--c-accent);
  color: var(--c-bg);
  border: none;
  border-radius: var(--radius-sm);
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-detail-add:hover { background: var(--c-accent-l); transform: translateY(-2px); }

/* Modal Transition */
.modal-enter-active, .modal-leave-active { transition: opacity 0.3s; }
.modal-enter-active .detail-modal { transition: transform 0.4s var(--ease); }
.modal-leave-active .detail-modal { transition: transform 0.3s var(--ease); }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .detail-modal { transform: scale(0.95) translateY(20px); }
.modal-leave-to .detail-modal { transform: scale(0.95) translateY(20px); }

/* Text Modal 專用樣式 */
.text-modal {
  max-width: 600px;
}
.text-modal-content {
  padding: 3rem 2.5rem;
  color: var(--c-text);
  line-height: 1.8;
}
.text-modal-content p {
  margin-bottom: 1rem;
}

/* ===== Drawer Transition ===== */
.drawer-enter-active { transition: opacity 0.3s; }
.drawer-enter-active .cart-drawer { transition: transform 0.4s var(--ease); }
.drawer-leave-active { transition: opacity 0.2s 0.15s; }
.drawer-leave-active .cart-drawer { transition: transform 0.3s var(--ease); }
.drawer-enter-from { opacity: 0; }
.drawer-enter-from .cart-drawer { transform: translateX(100%); }
.drawer-leave-to { opacity: 0; }
.drawer-leave-to .cart-drawer { transform: translateX(100%); }

/* ===== Success Page ===== */
.success-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-bg);
  padding: 2rem;
}
.success-card {
  text-align: center;
  max-width: 480px;
  padding: 3rem 2.5rem;
}
.success-icon-ring {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 2px solid var(--c-success);
  color: var(--c-success);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 2rem;
  animation: ringPop 0.6s var(--ease) forwards;
}
@keyframes ringPop {
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.15); }
  100% { transform: scale(1); opacity: 1; }
}
.success-card h2 {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 900;
  margin-bottom: 1rem;
}
.success-card p {
  color: var(--c-text2);
  font-size: 0.95rem;
  line-height: 1.8;
  margin-bottom: 2rem;
}
.success-img {
  width: 100%;
  max-width: 320px;
  border-radius: var(--radius);
  margin-bottom: 2rem;
}
.btn-back {
  display: inline-block;
  padding: 0.8rem 2.5rem;
  border: 1px solid var(--c-accent);
  color: var(--c-accent);
  text-decoration: none;
  font-weight: 700;
  font-size: 0.85rem;
  letter-spacing: 2px;
  transition: all 0.3s var(--ease);
}
.btn-back:hover {
  background: var(--c-accent);
  color: var(--c-bg);
}

/* ===== Footer ===== */
.site-footer {
  border-top: 1px solid rgba(87,83,78,0.2);
  padding: 3rem 2rem;
}
.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.footer-brand {
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 900;
  letter-spacing: 2px;
}
.footer-copy {
  font-size: 0.8rem;
  color: var(--c-text3);
}
.footer-links {
  display: flex;
  gap: 1.5rem;
}
.footer-links a {
  color: var(--c-text3);
  text-decoration: none;
  font-size: 0.8rem;
  transition: color 0.2s;
}
.footer-links a:hover { color: var(--c-accent); }

/* ===== Responsive ===== */
@media (max-width: 1200px) {
  .product-grid { grid-template-columns: repeat(3, 1fr); }
  .main-content { padding: 4rem 3rem; }
}
@media (max-width: 900px) {
  .product-grid { grid-template-columns: repeat(2, 1fr); gap: 1.2rem; }
  .main-content { padding: 3rem 2rem; }
}
@media (max-width: 768px) {
  .navbar { padding: 1rem 1.5rem; }
  .nav-center { display: none; }
  .hero-overlay { padding: 0 2rem 5rem; }
  .hero-title { font-size: 2.2rem; }
  .hero { min-height: 500px; }
  .about-inner { flex-direction: column; gap: 1.5rem; }
  .about-divider { width: 40px; height: 1px; }
  .main-content { padding: 3rem 1.5rem; }
  .product-grid { grid-template-columns: repeat(2, 1fr); gap: 1rem; }
  .footer-inner { flex-direction: column; gap: 1rem; text-align: center; }
  .cart-header { padding: 1.2rem 1.5rem; }
  .cart-item { padding: 0.8rem 1.5rem; }
  .cart-footer { padding: 1.2rem 1.5rem; }
}
@media (max-width: 480px) {
  .product-grid { grid-template-columns: 1fr; }
  .main-content { padding: 2rem 1rem; }
}

/* ===== Custom Scrollbar ===== */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--c-bg); }
::-webkit-scrollbar-thumb { background: var(--c-surface2); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--c-accent); }

/* ===== Selection ===== */
::selection {
  background: var(--c-accent);
  color: var(--c-bg);
}
</style>
