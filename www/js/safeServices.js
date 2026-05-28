// ===== Safe.js (KANINI SAFE INTELLIGENCE LAYER v6 HARDENED) =====

window.Safe = (() => {

  const Data = () => window.DataService;
  const State = () => window.StateKernel;

  // ===============================
  // NORMALIZERS
  // ===============================
  const normalizeProduct = (p) => ({
    id: p.id,
    name: p.name || "Unnamed",
    stock: Number(p.stock || 0),
    buyingPrice: Number(p.buyingPrice || 0),
    sellingPrice: Number(p.sellingPrice || 0)
  });

  const normalizeSale = (s) => ({
    id: s.saleId,
    timestamp: s.timestamp,
    items: (s.items || []).map(i => ({
      productId: i.productId,
      name: i.name,
      qty: Number(i.qty || 0),
      subtotal: Number(i.subtotal || 0),
      profit: Number(i.profit || 0)
    })),
    totals: s.totals || {}
  });

  // ===============================
  // STORAGE (SAFE READ WRAPPER)
  // ===============================
  function inventory() {
    return Data().getProducts().map(normalizeProduct);
  }

  function sales() {
    return Data().getSales().map(normalizeSale);
  }

  function movements() {
    return Data().getMovements();
  }

  // ===============================
  // CART SAFE VIEW (FIXED)
  // ===============================
  function cart() {
    return window.CartStore?.getCart?.() || [];
  }

  function cartSummary() {

    const c = cart();

    return {
      totalItems: c.reduce((sum, i) => sum + (i.qty || 0), 0),
      totalPrice: c.reduce((sum, i) => sum + ((i.qty || 0) * (i.price || 0)), 0)
    };
  }

  // ===============================
  // FINANCE SAFE VIEW (HARDENED)
  // ===============================
  function finance() {

    const salesData = sales();

    if (!salesData.length) {
      return {
        revenue: 0,
        profit: 0,
        salesCount: 0
      };
    }

    const revenue = salesData.reduce((sum, s) => sum + (s.totals?.subtotal || 0), 0);
    const profit = salesData.reduce((sum, s) => sum + (s.totals?.profit || 0), 0);

    return {
      revenue,
      profit,
      salesCount: salesData.length
    };
  }

  // ===============================
  // INVENTORY INSIGHTS
  // ===============================
  function lowStock(threshold = 5) {
    return inventory().filter(p => p.stock <= threshold);
  }

  function topProducts() {

    const map = new Map();

    sales().forEach(s => {
      (s.items || []).forEach(i => {
        map.set(i.productId, (map.get(i.productId) || 0) + i.qty);
      });
    });

    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, qty]) => ({ id, qty }));
  }

  // ===============================
  // AI SNAPSHOT
  // ===============================
  function aiSnapshot() {
    return {
      inventory: inventory(),
      finance: finance(),
      lowStock: lowStock(),
      topProducts: topProducts()
    };
  }

  // ===============================
  // EVENTS (SAFE DEBUG ONLY)
  // ===============================
  function events() {

    if (!window.__KANINI_DEBUG__) {
      return {};
    }

    return window.EventKernel?.dump?.() || {};
  }

  // ===============================
  // PUBLIC API
  // ===============================
  return {
    inventory,
    sales,
    movements,
    cart,
    cartSummary,
    finance,
    lowStock,
    topProducts,
    aiSnapshot,
    events
  };

})();