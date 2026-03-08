<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const props = defineProps({ orders: Array, products: Array, members: Array });

// ===== KPI 計算 =====
const totalRevenue = computed(() => props.orders.filter(o => o.status === 'paid').reduce((s, o) => s + Number(o.total_amount || 0), 0));
const totalOrders = computed(() => props.orders.length);
const paidOrders = computed(() => props.orders.filter(o => o.status === 'paid').length);
const pendingOrders = computed(() => props.orders.filter(o => o.status === 'pending').length);
const avgOrderValue = computed(() => paidOrders.value ? Math.round(totalRevenue.value / paidOrders.value) : 0);
const paidRate = computed(() => totalOrders.value ? Math.round(paidOrders.value / totalOrders.value * 100) : 0);
const totalMembers = computed(() => props.members?.length || 0);

// ===== 每日營收趨勢 =====
const dailyRevenue = computed(() => {
  const map = {};
  props.orders.filter(o => o.status === 'paid').forEach(o => {
    const d = new Date(o.created_at).toLocaleDateString('zh-TW');
    map[d] = (map[d] || 0) + Number(o.total_amount || 0);
  });
  const sorted = Object.entries(map).sort((a, b) => new Date(a[0]) - new Date(b[0]));
  return { labels: sorted.map(e => e[0]), data: sorted.map(e => e[1]) };
});

// ===== 訂單狀態分佈 =====
const statusDist = computed(() => {
  const map = {};
  props.orders.forEach(o => {
    const s = o.status === 'paid' ? '已付款' : (o.status === 'pending' ? '待付款' : (o.status === 'shipped' ? '已出貨' : o.status));
    map[s] = (map[s] || 0) + 1;
  });
  return { labels: Object.keys(map), data: Object.values(map) };
});

// ===== 熱銷商品排行 =====
const topProducts = computed(() => {
  const map = {};
  props.orders.filter(o => o.status === 'paid').forEach(o => {
    try {
      const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
      if (Array.isArray(items)) {
        items.forEach(i => {
          const p = props.products.find(p => p.product_id === i.id);
          const name = p ? p.name : i.id;
          map[name] = (map[name] || 0) + (i.qty || 1);
        });
      }
    } catch (e) {}
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
});

// ===== 每日訂單量 =====
const dailyOrderCount = computed(() => {
  const map = {};
  props.orders.forEach(o => {
    const d = new Date(o.created_at).toLocaleDateString('zh-TW');
    map[d] = (map[d] || 0) + 1;
  });
  const sorted = Object.entries(map).sort((a, b) => new Date(a[0]) - new Date(b[0]));
  return { labels: sorted.map(e => e[0]), data: sorted.map(e => e[1]) };
});

// ===== Charts =====
let revenueChart = null;
let statusChart = null;
let orderCountChart = null;
let topProductChart = null;

const renderCharts = () => {
  nextTick(() => {
    // Revenue Line Chart
    const rc = document.getElementById('revenueChart');
    if (rc) {
      if (revenueChart) revenueChart.destroy();
      revenueChart = new Chart(rc, {
        type: 'line',
        data: {
          labels: dailyRevenue.value.labels,
          datasets: [{
            label: '營收 (NT$)',
            data: dailyRevenue.value.data,
            borderColor: '#d97706',
            backgroundColor: 'rgba(217,119,6,0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: '#d97706'
          }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
      });
    }
    // Status Pie Chart
    const sc = document.getElementById('statusChart');
    if (sc) {
      if (statusChart) statusChart.destroy();
      statusChart = new Chart(sc, {
        type: 'doughnut',
        data: {
          labels: statusDist.value.labels,
          datasets: [{
            data: statusDist.value.data,
            backgroundColor: ['#2ecc71', '#f1c40f', '#3498db', '#e74c3c'],
            borderWidth: 2
          }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
      });
    }
    // Daily Order Count Bar Chart
    const oc = document.getElementById('orderCountChart');
    if (oc) {
      if (orderCountChart) orderCountChart.destroy();
      orderCountChart = new Chart(oc, {
        type: 'bar',
        data: {
          labels: dailyOrderCount.value.labels,
          datasets: [{
            label: '訂單數',
            data: dailyOrderCount.value.data,
            backgroundColor: 'rgba(52,152,219,0.7)',
            borderRadius: 6
          }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
      });
    }
    // Top Products Horizontal Bar
    const tp = document.getElementById('topProductChart');
    if (tp) {
      if (topProductChart) topProductChart.destroy();
      topProductChart = new Chart(tp, {
        type: 'bar',
        data: {
          labels: topProducts.value.map(e => e[0]),
          datasets: [{
            label: '銷售數量',
            data: topProducts.value.map(e => e[1]),
            backgroundColor: 'rgba(217,119,6,0.7)',
            borderRadius: 6
          }]
        },
        options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } } }
      });
    }
  });
};

onMounted(() => renderCharts());
watch(() => props.orders, () => renderCharts(), { deep: true });
</script>

<template>
  <div class="analytics">
    <!-- KPI Cards -->
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-icon revenue">💰</div>
        <div class="kpi-info">
          <span class="kpi-label">總營收</span>
          <span class="kpi-value">NT$ {{ totalRevenue.toLocaleString() }}</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon orders">📦</div>
        <div class="kpi-info">
          <span class="kpi-label">訂單總數</span>
          <span class="kpi-value">{{ totalOrders }}</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon avg">📊</div>
        <div class="kpi-info">
          <span class="kpi-label">平均客單價</span>
          <span class="kpi-value">NT$ {{ avgOrderValue.toLocaleString() }}</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon rate">✅</div>
        <div class="kpi-info">
          <span class="kpi-label">付款率</span>
          <span class="kpi-value">{{ paidRate }}%</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon members">👥</div>
        <div class="kpi-info">
          <span class="kpi-label">會員數</span>
          <span class="kpi-value">{{ totalMembers }}</span>
        </div>
      </div>
    </div>

    <!-- Status Summary -->
    <div class="status-summary">
      <span class="status-pill paid">已付款 {{ paidOrders }}</span>
      <span class="status-pill pending">待付款 {{ pendingOrders }}</span>
    </div>

    <!-- Charts Grid -->
    <div class="charts-grid">
      <div class="chart-card wide">
        <h4>📈 每日營收趨勢</h4>
        <canvas id="revenueChart"></canvas>
      </div>
      <div class="chart-card">
        <h4>🎯 訂單狀態分佈</h4>
        <canvas id="statusChart"></canvas>
      </div>
      <div class="chart-card wide">
        <h4>📅 每日訂單量</h4>
        <canvas id="orderCountChart"></canvas>
      </div>
      <div class="chart-card">
        <h4>🏆 熱銷商品排行</h4>
        <canvas id="topProductChart"></canvas>
      </div>
    </div>
  </div>
</template>

<style scoped>
.analytics { padding: 0; }

.kpi-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.kpi-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: white;
  padding: 1.2rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  border: 1px solid #eee;
  transition: transform 0.2s, box-shadow 0.2s;
}
.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
}
.kpi-icon {
  font-size: 2rem;
  width: 52px; height: 52px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 12px;
}
.kpi-icon.revenue { background: #fef3c7; }
.kpi-icon.orders { background: #dbeafe; }
.kpi-icon.avg { background: #ede9fe; }
.kpi-icon.rate { background: #dcfce7; }
.kpi-icon.members { background: #fce7f3; }
.kpi-info { display: flex; flex-direction: column; }
.kpi-label { font-size: 0.8rem; color: #888; }
.kpi-value { font-size: 1.4rem; font-weight: 800; color: #1a1a1a; }

.status-summary {
  display: flex;
  gap: 0.8rem;
  margin-bottom: 1.5rem;
}
.status-pill {
  padding: 0.4rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}
.status-pill.paid { background: #dcfce7; color: #166534; }
.status-pill.pending { background: #fef9c3; color: #854d0e; }

.charts-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.2rem;
}
.chart-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  border: 1px solid #eee;
}
.chart-card h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: #333;
}
.chart-card.wide { grid-column: 1; }

@media (max-width: 900px) {
  .charts-grid { grid-template-columns: 1fr; }
}
</style>
