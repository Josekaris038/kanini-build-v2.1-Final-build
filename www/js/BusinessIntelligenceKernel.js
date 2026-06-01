// ======================================================
// BusinessIntelligenceKernel.js
// KANINI REAL-TIME BUSINESS INTELLIGENCE LAYER (RBIL)
// FULL SAFE UPGRADE v3 — NO FEATURE LOSS + CONTRACT LOCK
// ======================================================

// ===============================
// SINGLETON SAFETY (CRITICAL FIX)
// ===============================
if (window.BusinessIntelligenceKernel) {
  console.warn("[BIK] Already exists - preventing duplicate redeclaration");
} else {

const BusinessIntelligenceKernel = (() => {

  // ===============================
  // KERNEL CONTRACTS
  // ===============================
  const State = () => window.StateKernel;
  const Records = () => window.RecordsKernel;
  const Finance = () => window.FinanceKernel;

  const DAY = 86400000;

  // ===============================
  // SAFE NUMBER
  // ===============================
  const n = (v) => {
    const num = Number(v);
    return Number.isFinite(num) ? num : 0;
  };

  // ===============================
  // CLONE SAFE SNAPSHOT
  // ===============================
  function clone(data) {
    return JSON.parse(JSON.stringify(data || {}));
  }

  // ===============================
  // INTERNAL CACHE
  // ===============================
  let _cache = {
    snapshot: null,
    snapshotTime: 0,
    aggregation: null,
    aggregationTime: 0
  };

  const CACHE_TTL = 2000;

  // ===============================
  // SNAPSHOT
  // ===============================
  function snapshot() {

    const now = Date.now();

    if (_cache.snapshot && (now - _cache.snapshotTime) < CACHE_TTL) {
      return _cache.snapshot;
    }

    const data = {
      products: clone(State()?.getProducts?.() || []),
      sales: clone(Records()?.getSales?.() || []),
      movements: clone(Records()?.getInventoryMovements?.() || [])
    };

    _cache.snapshot = data;
    _cache.snapshotTime = now;

    return data;
  }

  // ===============================
  // PRODUCT AGGREGATION
  // ===============================
  function aggregateProducts() {

    const now = Date.now();

    if (_cache.aggregation && (now - _cache.aggregationTime) < CACHE_TTL) {
      return _cache.aggregation;
    }

    const { sales } = snapshot();

    const map = {};

    sales.forEach(sale => {

      const ts = n(sale.timestamp) || Date.now();

      (sale.items || []).forEach(item => {

        const id = item.productId;
        if (!id) return;

        if (!map[id]) {
          map[id] = {
            productId: id,
            name: item.name || "Unknown",
            quantitySold: 0,
            revenue: 0,
            profit: 0,
            transactions: 0,
            firstSold: ts,
            lastSold: ts
          };
        }

        const e = map[id];

        e.quantitySold += n(item.qty);
        e.revenue += n(item.subtotal);
        e.profit += n(item.profit);
        e.transactions += 1;

        if (ts > e.lastSold) e.lastSold = ts;
        if (ts < e.firstSold) e.firstSold = ts;
      });
    });

    const result = Object.values(map);

    _cache.aggregation = result;
    _cache.aggregationTime = now;

    return result;
  }

  // ===============================
  // PRODUCT MAP
  // ===============================
  function getProductMap() {
    const { products } = snapshot();
    const map = {};
    products.forEach(p => map[p.id] = p);
    return map;
  }

  // ===============================
  // EXECUTIVE SUMMARY
  // ===============================
  function getExecutiveSummary() {

    const finance = Finance();
    const { sales } = snapshot();

    return {
      revenue: finance.getRevenue(),
      profit: finance.getProfit(),
      inventoryValue: finance.getInventoryValue(),
      potentialProfit: finance.getPotentialProfit(),
      transactions: sales.length,
      itemsSold: finance.getItemsSold(),
      averageSale: finance.getAverageOrderValue(),
      healthScore: finance.getHealthScore(),
      momentumScore: finance.getMomentumScore()
    };
  }

  // ===============================
  // MOVERS
  // ===============================
  function getFastMovers(limit = 10) {
    return aggregateProducts()
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, limit);
  }

  function getSlowMovers(limit = 10) {
    return aggregateProducts()
      .sort((a, b) => a.quantitySold - b.quantitySold)
      .slice(0, limit);
  }

  function getTopProfitProducts(limit = 10) {
    return aggregateProducts()
      .sort((a, b) => b.profit - a.profit)
      .slice(0, limit);
  }

  function getTopRevenueProducts(limit = 10) {
    return aggregateProducts()
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  // ===============================
  // INVENTORY EXPOSURE
  // ===============================
  function getInventoryExposure() {

    const { products } = snapshot();

    return products.map(p => ({
      id: p.id,
      name: p.name,
      stock: n(p.stock),
      value: n(p.stock) * n(p.buyingPrice)
    })).sort((a, b) => b.value - a.value);
  }

  // ===============================
  // SALES VELOCITY
  // ===============================
  function getSalesVelocity() {

    return aggregateProducts().map(p => {

      const daysActive = Math.max(
        1,
        (p.lastSold - p.firstSold) / DAY || 1
      );

      return {
        productId: p.productId,
        name: p.name,
        quantitySold: p.quantitySold,
        averageDailySales: Number((p.quantitySold / daysActive).toFixed(2))
      };

    }).sort((a, b) => b.averageDailySales - a.averageDailySales);
  }

  // ===============================
  // DEAD STOCK (FIXED EXPORT ISSUE)
  // ===============================
  function getDeadStock(days = 30) {

    const { products } = snapshot();
    const sales = aggregateProducts();

    const map = {};
    sales.forEach(p => map[p.productId] = p);

    const cutoff = Date.now() - days * DAY;

    return products.filter(p => {

      const sold = map[p.id];
      const createdAt = n(p.createdAt);

      if (createdAt && (Date.now() - createdAt) < days * DAY) return false;
      if (!sold) return true;

      return sold.lastSold < cutoff;
    });
  }

  // ===============================
  // REORDER ENGINE
  // ===============================
  function getReorderRecommendations() {

    const products = getProductMap();

    return getSalesVelocity().map(item => {

      const p = products[item.productId];
      const stock = n(p?.stock);
      const velocity = n(item.averageDailySales);

      const daysRemaining = velocity > 0 ? stock / velocity : 9999;

      return {
        productId: item.productId,
        name: item.name,
        stock,
        averageDailySales: velocity,
        daysRemaining: Number(daysRemaining.toFixed(1))
      };

    }).sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  // ===============================
  // ALERTS
  // ===============================
  function getOperationalAlerts() {

    const alerts = [];
    const seen = new Set();
    const finance = Finance();

    const push = (a) => {
      const k = a.productId + ":" + a.message;
      if (seen.has(k)) return;
      seen.add(k);
      alerts.push(a);
    };

    finance.getLowStock(5).forEach(p => {
      push({
        level: n(p.stock) <= 2 ? "critical" : "warning",
        productId: p.id,
        message: `${p.name} stock is low (${p.stock})`
      });
    });

    getDeadStock(30).forEach(p => {
      push({
        level: "notice",
        productId: p.id,
        message: `${p.name} has not sold recently`
      });
    });

    return alerts;
  }

  // ===============================
  // BUSINESS PULSE
  // ===============================
  function getBusinessPulse() {

    const finance = Finance();
    const health = finance.getHealthScore();
    const momentum = finance.getMomentumScore();

    const score = Math.round((health + momentum) / 2);

    let status = "Critical";
    if (score >= 90) status = "Elite";
    else if (score >= 75) status = "Healthy";
    else if (score >= 60) status = "Stable";
    else if (score >= 40) status = "Weak";

    return { score, status, health, momentum };
  }

  // ===============================
  // DAILY COMPARISON
  // ===============================
  function getDailyComparison() {

    const { sales } = snapshot();

    const todayStart = new Date().setHours(0,0,0,0);
    const yesterdayStart = todayStart - DAY;

    let tRev = 0, yRev = 0;
    let tProf = 0, yProf = 0;

    sales.forEach(s => {

      const ts = n(s.timestamp);

      (s.items || []).forEach(i => {

        if (ts >= todayStart) {
          tRev += n(i.subtotal);
          tProf += n(i.profit);
        } else if (ts >= yesterdayStart) {
          yRev += n(i.subtotal);
          yProf += n(i.profit);
        }

      });

    });

    return {
      today: { revenue: tRev, profit: tProf },
      yesterday: { revenue: yRev, profit: yProf },
      growth: {
        revenue: yRev ? ((tRev - yRev) / yRev) * 100 : 100,
        profit: yProf ? ((tProf - yProf) / yProf) * 100 : 100
      }
    };
  }

  // ===============================
  // INSIGHTS
  // ===============================
  function generateInsights() {

    const insights = [];

    const topRev = getTopRevenueProducts(1)[0];
    const topProf = getTopProfitProducts(1)[0];
    const dead = getDeadStock(30);

    if (topRev) insights.push({ type:"positive", title:"Top Revenue", message:`${topRev.name}` });
    if (topProf) insights.push({ type:"positive", title:"Top Profit", message:`${topProf.name}` });
    if (dead.length) insights.push({ type:"warning", title:"Dead Stock", message:`${dead.length} products inactive` });

    return insights;
  }

  // ===============================
  // RBIL EXTENSIONS
  // ===============================
  function getHourlyPerformance() {

    const { sales } = snapshot();

    const hours = Array.from({ length: 24 }, () => ({
      revenue:0, profit:0, transactions:0
    }));

    sales.forEach(s => {

      const h = new Date(n(s.timestamp)).getHours();

      (s.items || []).forEach(i => {
        hours[h].revenue += n(i.subtotal);
        hours[h].profit += n(i.profit);
        hours[h].transactions += 1;
      });

    });

    return hours.map((h,i)=>({hour:i,...h}));
  }

  function getRevenueContribution() {

    const p = aggregateProducts();
    const total = p.reduce((a,b)=>a+b.revenue,0)||1;

    return p.map(x=>({
      productId:x.productId,
      name:x.name,
      revenue:x.revenue,
      contribution:(x.revenue/total)*100
    }));
  }

  function getCapitalLockRisk() {

    const { products } = snapshot();
    const sales = aggregateProducts();
    const map = {};

    sales.forEach(p=>map[p.productId]=p);

    return products.map(p=>{

      const sold = map[p.id];
      const stock = n(p.stock);
      const value = stock*n(p.buyingPrice);

      const velocity = sold ? sold.quantitySold : 0;

      return {
        productId:p.id,
        name:p.name,
        lockedCapital:value,
        riskScore: velocity === 0 ? 100 : Math.max(0,100-velocity)
      };

    }).sort((a,b)=>b.riskScore-a.riskScore);
  }

  function getForecast(days=7) {

    const finance = Finance();

    const baseRev = finance.getRevenue?.() || 0;
    const baseProf = finance.getProfit?.() || 0;

    const dailyRev = baseRev/7;
    const dailyProf = baseProf/7;

    const out = [];

    for(let i=1;i<=days;i++){
      out.push({
        day:i,
        revenue:dailyRev*i,
        profit:dailyProf*i
      });
    }

    return out;
  }

  function getExecutiveNarrative() {

    const pulse = getBusinessPulse();
    const summary = getExecutiveSummary();

    return {
      headline:`Business is ${pulse.status}`,
      insight:`Revenue ${summary.revenue}, Profit ${summary.profit}`,
      riskLevel:pulse.score<50?"High":"Moderate"
    };
  }

  // ===============================
  // EXPORT CONTRACT LOCK (FIXED)
  // ===============================
  return {

    getExecutiveSummary,

    getFastMovers,
    getSlowMovers,
    getTopProfitProducts,
    getTopRevenueProducts,

    getInventoryExposure,
    getSalesVelocity,
    getReorderRecommendations,

    getOperationalAlerts,
    getBusinessPulse,
    generateInsights,
    getDailyComparison,
    getDeadStock, // ✅ FIXED (your crash)

    getHourlyPerformance,
    getRevenueContribution,
    getCapitalLockRisk,
    getForecast,
    getExecutiveNarrative
  };

})();

window.BusinessIntelligenceKernel = BusinessIntelligenceKernel;

} // singleton end