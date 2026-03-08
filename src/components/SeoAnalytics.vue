<script setup>
import { ref, computed, onMounted } from 'vue';

const props = defineProps({ orders: Array, products: Array });

const siteName = ref(import.meta.env.VITE_SITE_NAME || '珈琲攝小舖');
const siteUrl = ref('https://senugen.github.io/prj1/');

// ===== SEO 編輯欄位 =====
const seoTitle = ref('');
const seoDescription = ref('');
const seoKeywords = ref('');
const ogImage = ref('');

onMounted(() => {
  seoTitle.value = siteName.value + ' — 精品咖啡專賣';
  seoDescription.value = '嚴選世界各地精品咖啡豆，手工烘焙，新鮮直送。提供水洗、日曬、蜜處理等多種風味濾掛咖啡。';
  seoKeywords.value = '精品咖啡, 濾掛咖啡, 手沖咖啡, 咖啡豆, 單品咖啡, 耶加雪菲, 咖啡禮盒';
  ogImage.value = siteUrl.value + 'banner.webp';
});

// ===== SEO 評分 =====
const seoChecks = computed(() => {
  const checks = [];
  // Title
  const tLen = seoTitle.value.length;
  checks.push({ name: '標題長度', pass: tLen >= 10 && tLen <= 60, tip: `${tLen} 字（建議 10~60）`, icon: '🏷️' });
  checks.push({ name: '標題含品牌名', pass: seoTitle.value.includes(siteName.value), tip: seoTitle.value.includes(siteName.value) ? '✓ 含品牌名' : '建議加入品牌名', icon: '🔤' });
  // Description
  const dLen = seoDescription.value.length;
  checks.push({ name: '描述長度', pass: dLen >= 50 && dLen <= 160, tip: `${dLen} 字（建議 50~160）`, icon: '📝' });
  // Keywords
  const kwCount = seoKeywords.value.split(',').filter(k => k.trim()).length;
  checks.push({ name: '關鍵字數量', pass: kwCount >= 3 && kwCount <= 10, tip: `${kwCount} 個（建議 3~10）`, icon: '🔑' });
  // OG Image
  checks.push({ name: 'OG 圖片', pass: !!ogImage.value, tip: ogImage.value ? '已設定' : '請設定社群分享圖', icon: '🖼️' });
  // URL structure
  checks.push({ name: 'URL 結構', pass: siteUrl.value.includes('https'), tip: siteUrl.value.includes('https') ? 'HTTPS ✓' : '建議使用 HTTPS', icon: '🔗' });
  // Product count
  const activeProducts = props.products?.filter(p => p.status === 'active').length || 0;
  checks.push({ name: '上架商品數', pass: activeProducts >= 3, tip: `${activeProducts} 個上架中`, icon: '📦' });

  return checks;
});

const seoScore = computed(() => {
  const passed = seoChecks.value.filter(c => c.pass).length;
  return Math.round(passed / seoChecks.value.length * 100);
});

const scoreColor = computed(() => {
  if (seoScore.value >= 80) return '#16a34a';
  if (seoScore.value >= 50) return '#d97706';
  return '#dc2626';
});

// ===== 關鍵字分析 =====
const keywordAnalysis = computed(() => {
  const kws = seoKeywords.value.split(',').map(k => k.trim()).filter(k => k);
  return kws.map(kw => {
    const inTitle = seoTitle.value.includes(kw);
    const inDesc = seoDescription.value.includes(kw);
    const productMatch = props.products?.filter(p => (p.name || '').includes(kw) || (p.description || '').includes(kw)).length || 0;
    return { keyword: kw, inTitle, inDesc, productMatch, score: (inTitle ? 30 : 0) + (inDesc ? 30 : 0) + Math.min(productMatch * 10, 40) };
  });
});

// ===== 頁面效能指標（模擬） =====
const perfMetrics = ref([
  { name: '首次內容繪製 (FCP)', value: '1.2s', status: 'good', icon: '⚡' },
  { name: '最大內容繪製 (LCP)', value: '2.1s', status: 'good', icon: '🎨' },
  { name: '互動準備時間 (TTI)', value: '1.8s', status: 'good', icon: '👆' },
  { name: '累計版面位移 (CLS)', value: '0.05', status: 'good', icon: '📐' },
  { name: '首次輸入延遲 (FID)', value: '45ms', status: 'good', icon: '⌨️' },
]);

// ===== 產生 meta tags =====
const generatedMetaTags = computed(() => {
  return `<!-- Primary Meta Tags -->
<title>${seoTitle.value}</title>
<meta name="title" content="${seoTitle.value}">
<meta name="description" content="${seoDescription.value}">
<meta name="keywords" content="${seoKeywords.value}">

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:url" content="${siteUrl.value}">
<meta property="og:title" content="${seoTitle.value}">
<meta property="og:description" content="${seoDescription.value}">
<meta property="og:image" content="${ogImage.value}">

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image">
<meta property="twitter:url" content="${siteUrl.value}">
<meta property="twitter:title" content="${seoTitle.value}">
<meta property="twitter:description" content="${seoDescription.value}">
<meta property="twitter:image" content="${ogImage.value}">`;
});

const copied = ref(false);
const copyMeta = () => {
  navigator.clipboard.writeText(generatedMetaTags.value);
  copied.value = true;
  setTimeout(() => copied.value = false, 2000);
};
</script>

<template>
  <div class="seo-panel">
    <div class="seo-grid">
      <!-- Left: Editor -->
      <div class="seo-editor">
        <h4>📄 SEO 設定編輯</h4>
        <div class="form-group">
          <label>頁面標題 <span class="char-count" :class="{ warn: seoTitle.length > 60 }">{{ seoTitle.length }}/60</span></label>
          <input v-model="seoTitle" placeholder="頁面標題" class="seo-input" />
        </div>
        <div class="form-group">
          <label>Meta 描述 <span class="char-count" :class="{ warn: seoDescription.length > 160 }">{{ seoDescription.length }}/160</span></label>
          <textarea v-model="seoDescription" placeholder="Meta 描述" class="seo-textarea" rows="3"></textarea>
        </div>
        <div class="form-group">
          <label>關鍵字（逗號分隔）</label>
          <input v-model="seoKeywords" placeholder="關鍵字1, 關鍵字2, ..." class="seo-input" />
        </div>
        <div class="form-group">
          <label>OG 社群分享圖</label>
          <input v-model="ogImage" placeholder="圖片 URL" class="seo-input" />
        </div>

        <!-- Google Preview -->
        <div class="preview-section">
          <h4>🔍 Google 搜尋預覽</h4>
          <div class="google-preview">
            <div class="gp-url">{{ siteUrl }}</div>
            <div class="gp-title">{{ seoTitle || '未設定標題' }}</div>
            <div class="gp-desc">{{ seoDescription || '未設定描述' }}</div>
          </div>
        </div>

        <!-- Social Preview -->
        <div class="preview-section">
          <h4>📱 社群分享預覽</h4>
          <div class="social-preview">
            <div class="sp-image" v-if="ogImage">
              <img :src="ogImage" alt="OG Image" @error="$event.target.style.display='none'" />
            </div>
            <div class="sp-content">
              <div class="sp-domain">senugen.github.io</div>
              <div class="sp-title">{{ seoTitle }}</div>
              <div class="sp-desc">{{ seoDescription }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Score & Analysis -->
      <div class="seo-analysis">
        <!-- Score Circle -->
        <div class="score-card">
          <h4>🎯 SEO 評分</h4>
          <div class="score-circle">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#eee" stroke-width="8"/>
              <circle cx="50" cy="50" r="42" fill="none" :stroke="scoreColor" stroke-width="8"
                stroke-linecap="round"
                :stroke-dasharray="`${seoScore * 2.64} 264`"
                transform="rotate(-90 50 50)"
                style="transition: stroke-dasharray 0.5s ease"/>
            </svg>
            <span class="score-text" :style="{ color: scoreColor }">{{ seoScore }}</span>
          </div>
        </div>

        <!-- Checklist -->
        <div class="checklist-card">
          <h4>✅ 檢查清單</h4>
          <div v-for="c in seoChecks" :key="c.name" class="check-item" :class="{ pass: c.pass, fail: !c.pass }">
            <span class="check-icon">{{ c.icon }}</span>
            <span class="check-name">{{ c.name }}</span>
            <span class="check-status">{{ c.pass ? '✓' : '✗' }}</span>
            <span class="check-tip">{{ c.tip }}</span>
          </div>
        </div>

        <!-- Keyword Analysis -->
        <div class="keyword-card">
          <h4>🔑 關鍵字覆蓋分析</h4>
          <table class="kw-table">
            <thead><tr><th>關鍵字</th><th>標題</th><th>描述</th><th>商品</th><th>覆蓋率</th></tr></thead>
            <tbody>
              <tr v-for="kw in keywordAnalysis" :key="kw.keyword">
                <td>{{ kw.keyword }}</td>
                <td><span :class="kw.inTitle ? 'dot-pass' : 'dot-fail'">{{ kw.inTitle ? '✓' : '✗' }}</span></td>
                <td><span :class="kw.inDesc ? 'dot-pass' : 'dot-fail'">{{ kw.inDesc ? '✓' : '✗' }}</span></td>
                <td>{{ kw.productMatch }}</td>
                <td>
                  <div class="kw-bar-bg"><div class="kw-bar" :style="{ width: kw.score + '%' }"></div></div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Performance -->
        <div class="perf-card">
          <h4>⚡ 頁面效能指標</h4>
          <div v-for="m in perfMetrics" :key="m.name" class="perf-item">
            <span class="perf-icon">{{ m.icon }}</span>
            <span class="perf-name">{{ m.name }}</span>
            <span class="perf-value good">{{ m.value }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Meta Tags Output -->
    <div class="meta-output">
      <div class="meta-header">
        <h4>🏷️ 產生的 Meta Tags（可複製到 index.html）</h4>
        <button @click="copyMeta" class="copy-btn">{{ copied ? '✓ 已複製!' : '📋 複製' }}</button>
      </div>
      <pre class="meta-code">{{ generatedMetaTags }}</pre>
    </div>
  </div>
</template>

<style scoped>
.seo-panel { padding: 0; }

.seo-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.seo-editor, .seo-analysis {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

h4 { margin: 0 0 0.8rem 0; font-size: 1rem; color: #333; }

.form-group { margin-bottom: 0.5rem; }
.form-group label {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #555;
  margin-bottom: 0.3rem;
  font-weight: 600;
}
.char-count { font-weight: 400; color: #999; }
.char-count.warn { color: #e74c3c; }

.seo-input, .seo-textarea {
  width: 100%;
  padding: 0.6rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.9rem;
  transition: border-color 0.2s;
  background: white;
  color: #333;
  box-sizing: border-box;
}
.seo-input:focus, .seo-textarea:focus {
  border-color: #3498db;
  outline: none;
}
.seo-textarea { resize: vertical; font-family: inherit; }

/* Google Preview */
.preview-section {
  background: white;
  border-radius: 12px;
  padding: 1.2rem;
  border: 1px solid #eee;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.google-preview {
  font-family: Arial, sans-serif;
  max-width: 600px;
}
.gp-url { font-size: 0.8rem; color: #202124; }
.gp-title { font-size: 1.1rem; color: #1a0dab; margin: 0.2rem 0; cursor: pointer; }
.gp-title:hover { text-decoration: underline; }
.gp-desc { font-size: 0.85rem; color: #4d5156; line-height: 1.5; }

/* Social Preview */
.social-preview {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}
.sp-image img { width: 100%; height: 160px; object-fit: cover; display: block; }
.sp-content { padding: 0.8rem; }
.sp-domain { font-size: 0.75rem; color: #999; text-transform: uppercase; }
.sp-title { font-size: 0.95rem; font-weight: 700; color: #1a1a1a; margin: 0.2rem 0; }
.sp-desc { font-size: 0.8rem; color: #777; }

/* Score Card */
.score-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #eee;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  text-align: center;
}
.score-circle {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto;
}
.score-circle svg { width: 100%; height: 100%; }
.score-text {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  font-size: 2rem;
  font-weight: 900;
}

/* Checklist */
.checklist-card {
  background: white;
  border-radius: 12px;
  padding: 1.2rem;
  border: 1px solid #eee;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.check-item {
  display: grid;
  grid-template-columns: 30px 1fr 24px;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f5f5f5;
  align-items: center;
  font-size: 0.85rem;
}
.check-item:last-child { border-bottom: none; }
.check-status { font-weight: 700; }
.check-item.pass .check-status { color: #16a34a; }
.check-item.fail .check-status { color: #dc2626; }
.check-tip { grid-column: 2 / -1; font-size: 0.75rem; color: #999; }

/* Keyword Table */
.keyword-card {
  background: white;
  border-radius: 12px;
  padding: 1.2rem;
  border: 1px solid #eee;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.kw-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.kw-table th { text-align: left; padding: 0.4rem; color: #888; font-weight: 600; border-bottom: 2px solid #eee; }
.kw-table td { padding: 0.4rem; border-bottom: 1px solid #f5f5f5; }
.dot-pass { color: #16a34a; font-weight: 700; }
.dot-fail { color: #dc2626; font-weight: 700; }
.kw-bar-bg { width: 100%; height: 8px; background: #eee; border-radius: 4px; overflow: hidden; }
.kw-bar { height: 100%; background: linear-gradient(90deg, #d97706, #fbbf24); border-radius: 4px; transition: width 0.3s; }

/* Performance */
.perf-card {
  background: white;
  border-radius: 12px;
  padding: 1.2rem;
  border: 1px solid #eee;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.perf-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f5f5f5;
  font-size: 0.85rem;
}
.perf-item:last-child { border-bottom: none; }
.perf-name { flex: 1; color: #555; }
.perf-value { font-weight: 700; }
.perf-value.good { color: #16a34a; }

/* Meta Output */
.meta-output {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #eee;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.meta-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.copy-btn {
  padding: 0.4rem 1rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
  color: #333;
}
.copy-btn:hover { background: #f5f5f5; border-color: #3498db; }
.meta-code {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 1rem;
  border-radius: 8px;
  font-size: 0.8rem;
  overflow-x: auto;
  line-height: 1.6;
  white-space: pre-wrap;
}

@media (max-width: 1024px) {
  .seo-grid { grid-template-columns: 1fr; }
}
</style>
