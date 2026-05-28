// ===== FinanceKernel.js (KANINI BUSINESS INTELLIGENCE ENGINE v5 FIXED SAFE) =====

const FinanceKernel = (() => {

  // ===============================
  // STATE ACCESS (READ ONLY)
  // ===============================
  const State = () => window.StateKernel;

  if (!window.StateKernel) {
    throw new Error("[FinanceKernel] Missing StateKernel");
  }

  // ===============================
  // SAFE NUMBER
  // ===============================
  const n = (v) => {
    const num = Number(v);
    return Number.isFinite(num) ? num : 0;
  };

  // ===============================
  // SNAPSHOT (SAFE + CONSISTENT)
  // ===============================
  function snapshot() {
    const s = State().snapshot();

    return {
      products: s?.inventory?.products || [],
      sales: s?.sales || [],
      movements: s?.movements || []
    };
  }

  // ===============================
  // TIME UTIL
  // ===============================
  const now = () => Date.now();
  const DAY = 86400000;

  const withinDays = (ts, d) =>
    now() - (ts || 0) <= d * DAY;

  // ===============================
  // CORE REVENUE
  // ===============================
  function getRevenue() {

    const { sales } = snapshot();

    return sales.reduce(
      (sum, s) => sum + n(s?.totals?.subtotal),
      0
    );
  }

  // ===============================
  // PROFIT
  // ===============================
  function getProfit() {

    const { sales } = snapshot();

    return sales.reduce(
      (sum, s) => sum + n(s?.totals?.profit),
      0
    );
  }

  // ===============================
  // ITEMS SOLD
  // ===============================
  function getItemsSold() {

    const { sales } = snapshot();

    return sales.reduce((sum, s) => {
      return sum + (s?.items || []).reduce(
        (a, i) => a + n(i?.qty),
        0
      );
    }, 0);
  }

  // ===============================
  // AVERAGE ORDER VALUE
  // ===============================
  function getAverageOrderValue() {

    const { sales } = snapshot();

    if (!sales.length) return 0;

    return getRevenue() / sales.length;
  }

  // ===============================
  // INVENTORY VALUE
  // ===============================
  function getInventoryValue() {

    const { products } = snapshot();

    return products.reduce(
      (sum, p) =>
        sum + (n(p?.stock) * n(p?.buyingPrice)),
      0
    );
  }

  // ===============================
  // POTENTIAL PROFIT
  // ===============================
  function getPotentialProfit() {

    const { products } = snapshot();

    return products.reduce(
      (sum, p) =>
        sum +
        ((n(p?.sellingPrice) - n(p?.buyingPrice)) *
          n(p?.stock)),
      0
    );
  }

  // ===============================
  // REVENUE TREND
  // ===============================
  function getRevenueTrend(days = 7) {

    const { sales } = snapshot();

    const filtered = sales.filter(s =>
      withinDays(s?.timestamp, days)
    );

    const buckets = {};

    for (const s of filtered) {

      const d = new Date(s?.timestamp || Date.now())
        .toISOString()
        .split("T")[0];

      buckets[d] ||= 0;
      buckets[d] += n(s?.totals?.subtotal);
    }

    return buckets;
  }

  // ===============================
  // PROFIT VELOCITY
  // ===============================
  function getProfitVelocity(days = 7) {

    const { sales } = snapshot();

    const filtered = sales.filter(s =>
      withinDays(s?.timestamp, days)
    );

    if (!filtered.length) return 0;

    const total = filtered.reduce(
      (sum, s) => sum + n(s?.totals?.profit),
      0
    );

    return total / days;
  }

  // ===============================
  // STOCK TURNOVER
  // ===============================
  function getStockTurnover() {

    const { movements } = snapshot();

    return movements.filter(
      m => m?.type === "SALE"
    ).length;
  }

  // ===============================
  // MOMENTUM SCORE
  // ===============================
  function getMomentumScore() {

    const revenue = getRevenue();
    const profit = getProfit();
    const velocity = getProfitVelocity();

    let score = 50;

    if (revenue > 0) {
      score += (profit / revenue) * 40;
    }

    score += Math.min(velocity / 100, 20);

    return Math.max(0, Math.min(100, score));
  }

  // ===============================
  // HEALTH SCORE
  // ===============================
  function getHealthScore() {

    const inventory = getInventoryValue();
    const profit = getProfit();

    let score = 60;

    if (inventory > 0) {
      score += Math.min(inventory / 10000, 20);
    }

    if (profit > 0) {
      score += Math.min(profit / 5000, 20);
    }

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  // ===============================
  // LOW STOCK
  // ===============================
  function getLowStock(threshold = 5) {

    const { products } = snapshot();

    return products.filter(
      p => n(p?.stock) <= threshold
    );
  }

  // ===============================
  // FINAL REPORT
  // ===============================
  function exportReport() {

    return {
      revenue: getRevenue(),
      profit: getProfit(),
      itemsSold: getItemsSold(),
      averageOrderValue: getAverageOrderValue(),
      inventoryValue: getInventoryValue(),
      potentialProfit: getPotentialProfit(),
      revenueTrend: getRevenueTrend(7),
      profitVelocity: getProfitVelocity(7),
      stockTurnover: getStockTurnover(),
      momentumScore: getMomentumScore(),
      healthScore: getHealthScore(),
      lowStock: getLowStock().length
    };
  }

  return {
    getRevenue,
    getProfit,
    getItemsSold,
    getAverageOrderValue,

    getInventoryValue,
    getPotentialProfit,

    getRevenueTrend,
    getProfitVelocity,

    getStockTurnover,
    getMomentumScore,
    getHealthScore,

    getLowStock,

    exportReport
  };

})();

window.FinanceKernel = FinanceKernel;