// ===== INVENTORY AI ENGINE (KANINI v1.3 KERNEL ALIGNED INTELLIGENCE LAYER) =====

window.InventoryAIService = window.InventoryAIService || (() => {

  // ===============================
  // DEPENDENCIES
  // ===============================
  const Data = window.DataService;
  const Bus = window.EventKernel;

  if (!Data) {
    throw new Error("[InventoryAIService] DataService missing");
  }

  // ===============================
  // SAFE NUMBER
  // ===============================
  const n = (v) => {
    const num = Number(v);
    return Number.isFinite(num) ? num : 0;
  };

  // ===============================
  // SOURCE DATA
  // ===============================
  const sales = () => Data.getSales();
  const inventory = () => Data.getProducts();

  // ===============================
  // CACHE SYSTEM
  // ===============================
  let cachedDemandMap = null;
  let lastBuildTime = 0;
  const CACHE_TTL = 30000;

  // ===============================
  // TIME HELPERS
  // ===============================
  const now = () => Date.now();
  const day = 86400000;

  // ===============================
  // RECENT SALES FILTER
  // ===============================
  function getRecentSales(days = 30) {
    const cutoff = now() - days * day;
    return sales().filter(s => (s.timestamp || 0) >= cutoff);
  }

  // ===============================
  // BUILD DEMAND MAP
  // ===============================
  function buildDemandMap() {

    const t = now();

    if (cachedDemandMap && (t - lastBuildTime < CACHE_TTL)) {
      return cachedDemandMap;
    }

    const map = {};
    const recent = getRecentSales(30);

    for (const sale of recent) {

      for (const item of (sale.items || [])) {

        const id = item.productId;
        if (!id) continue;

        if (!map[id]) {
          map[id] = {
            qty: 0,
            revenue: 0,
            profit: 0,
            transactions: 0
          };
        }

        const qty = n(item.qty);
        const sp = n(item.sellingPrice);
        const bp = n(item.buyingPrice);

        map[id].qty += qty;
        map[id].revenue += n(item.subtotal);
        map[id].profit += (sp - bp) * qty;
        map[id].transactions += 1;
      }
    }

    cachedDemandMap = map;
    lastBuildTime = t;

    return map;
  }

  // ===============================
  // DEMAND SCORE
  // ===============================
  function getDemandScore(productId) {

    const map = buildDemandMap();
    const d = map[productId];

    if (!d) return 0;

    let score = 0;

    score += Math.min(d.qty * 5, 55);
    score += Math.min(d.revenue / 2000, 25);
    score += Math.min(d.transactions * 3, 20);

    return Math.min(100, Math.round(score));
  }

  // ===============================
  // MOVEMENT ANALYSIS
  // ===============================
  function getMovementAnalysis() {

    const map = buildDemandMap();

    const items = inventory().map(p => {

      const d = map[p.id] || {
        qty: 0,
        revenue: 0,
        transactions: 0
      };

      const score = getDemandScore(p.id);

      return {
        id: p.id,
        name: p.name,
        stock: n(p.stock),

        demand: d.qty,
        score,

        velocity: d.qty / 30
      };
    });

    items.sort((a, b) => b.score - a.score);

    return {
      fast: items.slice(0, 5),
      slow: items.slice(-5).reverse()
    };
  }

  // ===============================
  // DEAD STOCK
  // ===============================
  function getDeadStock() {

    const map = buildDemandMap();

    return inventory().filter(p =>
      !map[p.id]?.qty && n(p.stock) > 0
    );
  }

  // ===============================
  // OVERSTOCK RISK
  // ===============================
  function getOverstockRisk() {

    const map = buildDemandMap();

    return inventory().filter(p => {

      const d = map[p.id]?.qty || 0;
      const stock = n(p.stock);

      return d > 0 && stock > d * 2.5;
    });
  }

  // ===============================
  // REORDER SUGGESTIONS
  // ===============================
  function getReorderSuggestions() {

    const map = buildDemandMap();

    return inventory()
      .filter(p => {

        const d = map[p.id]?.qty || 0;
        const stock = n(p.stock);

        return d > 0 && stock <= d * 0.4;
      })
      .map(p => {

        const d = map[p.id]?.qty || 0;
        const stock = n(p.stock);

        return {
          id: p.id,
          name: p.name,
          stock,
          demand: d,
          suggestedOrder: Math.max(Math.round(d * 1.2 - stock), 5)
        };
      });
  }

  // ===============================
  // AI SIGNAL SCORE
  // ===============================
  function getAISignalScore() {

    const map = buildDemandMap();

    const totalProducts = inventory().length || 1;
    const activeProducts = Object.keys(map).length;

    return Math.round((activeProducts / totalProducts) * 100);
  }

  // ===============================
  // AI SUMMARY
  // ===============================
  function getAISummary() {

    const movement = getMovementAnalysis();

    return {
      fastMoving: movement.fast,
      slowMoving: movement.slow,
      deadStock: getDeadStock(),
      overstockRisk: getOverstockRisk(),
      reorder: getReorderSuggestions(),
      signalStrength: getAISignalScore()
    };
  }

  // ===============================
  // EVENT INVALIDATION (HARDENED)
  // ===============================
  function init() {

    if (!Bus) return;

    const invalidate = () => {
      cachedDemandMap = null;
      lastBuildTime = 0;
    };

    Bus.on("sale:created", invalidate, "InventoryAIService");
    Bus.on("inventory:updated", invalidate, "InventoryAIService");
  }

  init();

  // ===============================
  // PUBLIC API
  // ===============================
  return {
    getDemandScore,
    getMovementAnalysis,
    getDeadStock,
    getOverstockRisk,
    getReorderSuggestions,
    getAISummary
  };

})();