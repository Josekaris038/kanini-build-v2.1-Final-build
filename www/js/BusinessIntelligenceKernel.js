// ======================================================
// BusinessIntelligenceKernel.js
// KANINI REAL-TIME BUSINESS INTELLIGENCE LAYER (RBIL)
// v2 CORE ENGINE (CACHED + TREND AWARE)
// ======================================================

const BusinessIntelligenceKernel = (() => {

  // ===============================
  // KERNEL CONTRACTS (DO NOT CHANGE)
  // ===============================
  const State = () => window.StateKernel;
  const Records = () => window.RecordsKernel;
  const Finance = () => window.FinanceKernel;

  const DAY = 86400000;

  // ===============================
  // SAFE NUMBER NORMALIZER
  // ===============================
  const n = (v) => {
    const num = Number(v);
    return Number.isFinite(num) ? num : 0;
  };

  // ===============================
  // DEEP CLONE (SAFE SNAPSHOT)
  // ===============================
  function clone(data) {
    return JSON.parse(JSON.stringify(data));
  }

  // ===============================
  // INTERNAL CACHE LAYER
  // ===============================
  let _cache = {
    snapshot: null,
    snapshotTime: 0,
    aggregation: null,
    aggregationTime: 0
  };

  const CACHE_TTL = 2000; // 2s BI cycle window

  // ======================================================
  // SNAPSHOT (CACHED)
  // ======================================================
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

  // ======================================================
  // PRODUCT AGGREGATION (CACHED)
  // ======================================================
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

        const entry = map[id];

        entry.quantitySold += n(item.qty);
        entry.revenue += n(item.subtotal);
        entry.profit += n(item.profit);
        entry.transactions += 1;

        if (ts > entry.lastSold) entry.lastSold = ts;
        if (ts < entry.firstSold) entry.firstSold = ts;
      });
    });

    const result = Object.values(map);

    _cache.aggregation = result;
    _cache.aggregationTime = now;

    return result;
  }

  // ======================================================
  // PRODUCT MAP
  // ======================================================
  function getProductMap() {

    const { products } = snapshot();
    const map = {};

    products.forEach(p => {
      map[p.id] = p;
    });

    return map;
  }

  // ======================================================
  // EXECUTIVE SUMMARY
  // ======================================================
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

  // ======================================================
  // FAST / SLOW MOVERS
  // ======================================================
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

  // ======================================================
  // TOP PROFIT / REVENUE
  // ======================================================
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

  // ======================================================
  // INVENTORY EXPOSURE
  // ======================================================
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

  // ======================================================
  // SALES VELOCITY
  // ======================================================
  function getSalesVelocity() {

    return aggregateProducts()
      .map(p => {

        const daysActive = Math.max(
          1,
          (p.lastSold - p.firstSold) / DAY || 1
        );

        return {
          productId: p.productId,
          name: p.name,
          quantitySold: p.quantitySold,

          averageDailySales: Number(
            (p.quantitySold / daysActive).toFixed(2)
          )
        };
      })
      .sort((a, b) => b.averageDailySales - a.averageDailySales);
  }

  // ======================================================
  // DEAD STOCK
  // ======================================================
  function getDeadStock(days = 30) {

    const { products } = snapshot();
    const salesData = aggregateProducts();

    const map = {};
    salesData.forEach(p => map[p.productId] = p);

    const cutoff = Date.now() - (days * DAY);

    return products.filter(p => {

      const sold = map[p.id];

      const createdAt = n(p.createdAt) || 0;
      if (createdAt && (Date.now() - createdAt) < days * DAY) {
        return false;
      }

      if (!sold) return true;

      return sold.lastSold < cutoff;
    });
  }

  // ======================================================
  // REORDER ENGINE
  // ======================================================
  function getReorderRecommendations() {

    const products = getProductMap();

    return getSalesVelocity()
      .map(item => {

        const p = products[item.productId];
        const stock = n(p?.stock);
        const velocity = n(item.averageDailySales);

        const daysRemaining =
          velocity > 0 ? stock / velocity : 9999;

        return {
          productId: item.productId,
          name: item.name,
          stock,
          averageDailySales: velocity,
          daysRemaining: Number(daysRemaining.toFixed(1))
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  // ======================================================
  // OPERATIONAL ALERTS (DEDUPED)
  // ======================================================
  function getOperationalAlerts() {

    const alerts = [];
    const seen = new Set();
    const finance = Finance();

    const push = (alert) => {
      const key = alert.productId + ":" + alert.message;
      if (seen.has(key)) return;
      seen.add(key);
      alerts.push(alert);
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

    getReorderRecommendations()
      .slice(0, 5)
      .forEach(item => {

        if (item.daysRemaining <= 2) {
          push({
            level: "critical",
            productId: item.productId,
            message: `${item.name} may run out in ${item.daysRemaining} days`
          });
        }
      });

    return alerts;
  }

  // ======================================================
  // BUSINESS PULSE
  // ======================================================
  function getBusinessPulse() {

    const finance = Finance();
    const health = finance.getHealthScore();
    const momentum = finance.getMomentumScore();
    const alerts = getOperationalAlerts();

    const score = Math.round((health + momentum) / 2);

    let status = "Critical";
    if (score >= 90) status = "Elite";
    else if (score >= 75) status = "Healthy";
    else if (score >= 60) status = "Stable";
    else if (score >= 40) status = "Weak";

    return {
      score,
      status,
      alerts: alerts.length,
      health,
      momentum
    };
  }

  // ======================================================
  // 📊 DAILY COMPARISON ENGINE (NEW)
  // ======================================================
  function getDailyComparison() {

    const { sales } = snapshot();

    const today = new Date();
    const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const startYesterday = startToday - DAY;

    let todayRevenue = 0;
    let yesterdayRevenue = 0;

    let todayProfit = 0;
    let yesterdayProfit = 0;

    sales.forEach(sale => {

      const ts = n(sale.timestamp);

      (sale.items || []).forEach(item => {

        if (ts >= startToday) {
          todayRevenue += n(item.subtotal);
          todayProfit += n(item.profit);
        }

        else if (ts >= startYesterday && ts < startToday) {
          yesterdayRevenue += n(item.subtotal);
          yesterdayProfit += n(item.profit);
        }

      });
    });

    const revenueGrowth =
      yesterdayRevenue > 0
        ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
        : 100;

    const profitGrowth =
      yesterdayProfit > 0
        ? ((todayProfit - yesterdayProfit) / yesterdayProfit) * 100
        : 100;

    return {
      today: { revenue: todayRevenue, profit: todayProfit },
      yesterday: { revenue: yesterdayRevenue, profit: yesterdayProfit },

      growth: {
        revenue: Number(revenueGrowth.toFixed(2)),
        profit: Number(profitGrowth.toFixed(2))
      }
    };
  }

  // ======================================================
  // INSIGHTS ENGINE
  // ======================================================
  function generateInsights() {

    const insights = [];

    const topRevenue = getTopRevenueProducts(1)[0];
    const topProfit = getTopProfitProducts(1)[0];
    const deadStock = getDeadStock(30);

    if (topRevenue) {
      insights.push({
        type: "positive",
        title: "Top Revenue Product",
        message: `${topRevenue.name} generated the highest revenue.`
      });
    }

    if (topProfit) {
      insights.push({
        type: "positive",
        title: "Top Profit Product",
        message: `${topProfit.name} generated the highest profit.`
      });
    }

    if (deadStock.length) {
      insights.push({
        type: "warning",
        title: "Dead Stock",
        message: `${deadStock.length} products have not sold recently.`
      });
    }

    return insights;
  }

  // ======================================================
  // PUBLIC API (UNCHANGED CONTRACT)
  // ======================================================
  return {

    getExecutiveSummary,

    getFastMovers,
    getSlowMovers,

    getTopProfitProducts,
    getTopRevenueProducts,

    getDeadStock,

    getInventoryExposure,

    getSalesVelocity,

    getReorderRecommendations,

    getOperationalAlerts,

    getBusinessPulse,

    generateInsights,

    // NEW ADDITION (SAFE EXTENSION)
    getDailyComparison
  };

})();

window.BusinessIntelligenceKernel =
  BusinessIntelligenceKernel;