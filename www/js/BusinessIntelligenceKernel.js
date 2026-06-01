// ======================================================
// BusinessIntelligenceKernel.js
// KANINI REAL-TIME BUSINESS INTELLIGENCE LAYER (RBIL)
// v4.0 — EVENT-DRIVEN INTELLIGENCE ENGINE
// ======================================================

// ===============================
// SINGLETON SAFETY
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
  const EventBus = () => window.EventKernel;

  const DAY = 86400000;

  // ===============================
  // SAFE NUMBER
  // ===============================
  const n = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;

  const toTime = (t) => {
    const d = new Date(t);
    const ts = d.getTime();
    return Number.isFinite(ts) ? ts : 0;
  };

  // ===============================
  // INTERNAL STATE (EVENT DRIVEN)
  // ===============================
  let state = {
    productAgg: new Map(),
    productMap: new Map(),
    lastSnapshot: null,
    lastUpdate: 0
  };

  const CACHE_TTL = 2000;

  // ===============================
  // EVENT-DRIVEN INVALIDATION
  // ===============================
  function clearCache() {
    state.productAgg.clear();
    state.productMap.clear();
    state.lastSnapshot = null;
    state.lastUpdate = Date.now();
  }

  function bindEvents() {
    const bus = EventBus();

    if (!bus?.subscribe) return;

    bus.subscribe("saleCreated", clearCache);
    bus.subscribe("inventoryUpdated", clearCache);
    bus.subscribe("productUpdated", clearCache);
  }

  // ===============================
  // SNAPSHOT (LAZY)
  // ===============================
  function snapshot() {
    if (state.lastSnapshot && (Date.now() - state.lastUpdate) < CACHE_TTL) {
      return state.lastSnapshot;
    }

    const data = {
      products: (State()?.getProducts?.() || []),
      sales: (Records()?.getSales?.() || []),
      movements: (Records()?.getInventoryMovements?.() || [])
    };

    state.lastSnapshot = data;
    state.lastUpdate = Date.now();

    return data;
  }

  // ===============================
  // PRODUCT MAP (INCREMENTAL BUILD)
  // ===============================
  function getProductMap() {
    if (state.productMap.size > 0) return state.productMap;

    const { products } = snapshot();

    for (let i = 0; i < products.length; i++) {
      state.productMap.set(products[i].id, products[i]);
    }

    return state.productMap;
  }

  // ===============================
  // INCREMENTAL AGGREGATION CORE
  // ===============================
  function buildAggregation() {
    if (state.productAgg.size > 0) return state.productAgg;

    const { sales } = snapshot();

    for (let s = 0; s < sales.length; s++) {

      const sale = sales[s];
      const ts = toTime(sale.timestamp);
      if (!ts) continue;

      const items = sale.items || [];

      for (let i = 0; i < items.length; i++) {

        const it = items[i];
        const id = it.productId;
        if (!id) continue;

        if (!state.productAgg.has(id)) {
          state.productAgg.set(id, {
            productId: id,
            name: it.name || "Unknown",
            quantitySold: 0,
            revenue: 0,
            profit: 0,
            transactions: 0,
            firstSold: ts,
            lastSold: ts
          });
        }

        const agg = state.productAgg.get(id);

        agg.quantitySold += n(it.qty);
        agg.revenue += n(it.subtotal);
        agg.profit += n(it.profit);
        agg.transactions += 1;

        if (ts > agg.lastSold) agg.lastSold = ts;
        if (ts < agg.firstSold) agg.firstSold = ts;
      }
    }

    return state.productAgg;
  }

  // ===============================
  // SAFE AGGREGATION EXPORT
  // ===============================
  function aggregateProducts() {
    return Array.from(buildAggregation().values());
  }

  // ===============================
  // EXECUTIVE SUMMARY (DIRECT FINANCE LAYER)
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
  // FAST MOVERS (NO RECOMPUTE)
  // ===============================
  function getFastMovers(limit = 10) {
    return aggregateProducts()
      .slice()
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, limit);
  }

  function getSlowMovers(limit = 10) {
    return aggregateProducts()
      .slice()
      .sort((a, b) => a.quantitySold - b.quantitySold)
      .slice(0, limit);
  }

  function getTopProfitProducts(limit = 10) {
    return aggregateProducts()
      .slice()
      .sort((a, b) => b.profit - a.profit)
      .slice(0, limit);
  }

  function getTopRevenueProducts(limit = 10) {
    return aggregateProducts()
      .slice()
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  // ===============================
  // INVENTORY EXPOSURE (DIRECT STATE READ)
  // ===============================
  function getInventoryExposure() {
    const { products } = snapshot();

    return products
      .map(p => ({
        id: p.id,
        name: p.name,
        stock: n(p.stock),
        value: n(p.stock) * n(p.buyingPrice)
      }))
      .sort((a, b) => b.value - a.value);
  }

  // ===============================
  // SALES VELOCITY (FROM AGGREGATE)
  // ===============================
  function getSalesVelocity() {
    const agg = aggregateProducts();

    return agg.map(p => {

      const daysActive = Math.max(1, (p.lastSold - p.firstSold) / DAY);

      return {
        productId: p.productId,
        name: p.name,
        quantitySold: p.quantitySold,
        averageDailySales: Number((p.quantitySold / daysActive).toFixed(2))
      };

    }).sort((a, b) => b.averageDailySales - a.averageDailySales);
  }

  // ===============================
  // DEAD STOCK (EVENT SAFE LOGIC)
  // ===============================
  function getDeadStock(days = 30) {
    const { products } = snapshot();
    const agg = aggregateProducts();

    const map = new Map();
    agg.forEach(p => map.set(p.productId, p));

    const cutoff = Date.now() - days * DAY;

    return products.filter(p => {
      const sold = map.get(p.id);
      const createdAt = toTime(p.createdAt);

      if (createdAt && (Date.now() - createdAt) < days * DAY) return false;
      if (!sold) return true;

      return sold.lastSold < cutoff;
    });
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
  // HOURLY PERFORMANCE (SAFE TIME HANDLING)
  // ===============================
  function getHourlyPerformance() {

    const { sales } = snapshot();
    const hours = Array.from({ length: 24 }, () => ({
      revenue: 0,
      profit: 0,
      transactions: 0
    }));

    for (let s = 0; s < sales.length; s++) {

      const sale = sales[s];
      const h = new Date(toTime(sale.timestamp)).getHours();

      const items = sale.items || [];

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        hours[h].revenue += n(it.subtotal);
        hours[h].profit += n(it.profit);
        hours[h].transactions += 1;
      }
    }

    return hours.map((h, i) => ({ hour: i, ...h }));
  }

  // ===============================
  // INSIGHTS (LIGHTWEIGHT)
  // ===============================
  function generateInsights() {
    const insights = [];

    const topRev = getTopRevenueProducts(1)[0];
    const topProf = getTopProfitProducts(1)[0];
    const dead = getDeadStock(30);

    if (topRev) insights.push({ type: "positive", title: "Top Revenue", message: topRev.name });
    if (topProf) insights.push({ type: "positive", title: "Top Profit", message: topProf.name });
    if (dead.length) insights.push({ type: "warning", title: "Dead Stock", message: `${dead.length} products inactive` });

    return insights;
  }

  // ===============================
  // INIT (IMPORTANT NEW PIECE)
  // ===============================
  function init() {
    bindEvents();
    console.log("[BIK v4] Event-driven intelligence kernel initialized");
  }

  // auto-init
  init();

  // ===============================
  // EXPORT CONTRACT (UNCHANGED)
  // ===============================
  return {

    getExecutiveSummary,

    getFastMovers,
    getSlowMovers,
    getTopProfitProducts,
    getTopRevenueProducts,

    getInventoryExposure,
    getSalesVelocity,
    getDeadStock,

    getBusinessPulse,
    generateInsights,
    getHourlyPerformance
  };

})();

window.BusinessIntelligenceKernel = BusinessIntelligenceKernel;

} // singleton end