// ===== RecordsKernel.js (KANINI HISTORICAL PROJECTION ENGINE v1 ALIGNED) =====

const RecordsKernel = (() => {

  // =========================================
  // KERNEL ACCESS
  // =========================================
  const State = () => window.StateKernel;

  // =========================================
  // SAFE CLONE
  // =========================================
  function clone(data) {

    return JSON.parse(
      JSON.stringify(data)
    );
  }

  // =========================================
  // INTERNAL LOADERS
  // =========================================
  function loadSales() {

    return clone(
      State().getSales?.() || []
    );
  }

  function loadMovements() {

    return clone(
      State().getMovements?.() || []
    );
  }

  function loadProducts() {

    return clone(
      State().getProducts?.() || []
    );
  }

  // =========================================
  // TIME NORMALIZATION (IMPORTANT FIX)
  // =========================================
  function getDayKey(timestamp) {

    const d = new Date(timestamp);

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // =========================================
  // SALES HISTORY
  // =========================================
  function getSales() {

    return loadSales()
      .map(projectSale)
      .reverse();
  }

  // =========================================
  // SINGLE SALE
  // =========================================
  function getSaleById(saleId) {

    if (!saleId) return null;

    const sales = loadSales();

    const sale = sales.find(s =>
      s.saleId === saleId
    );

    if (!sale) return null;

    return projectSale(sale);
  }

  // =========================================
  // RECEIPT PROJECTION
  // =========================================
  function getReceipts() {

    return loadSales()
      .map(projectReceipt)
      .reverse();
  }

  // =========================================
  // INVENTORY MOVEMENTS
  // =========================================
  function getInventoryMovements() {

    return loadMovements()
      .map(projectMovement)
      .reverse();
  }

  // =========================================
  // SALES METRICS
  // =========================================
  function getSalesMetrics() {

    const sales = loadSales();

    const totalSales = sales.length;

    const revenue = sales.reduce(
      (sum, sale) =>
        sum + Number(
          sale?.totals?.subtotal || 0
        ),
      0
    );

    const profit = sales.reduce(
      (sum, sale) =>
        sum + Number(
          sale?.totals?.profit || 0
        ),
      0
    );

    const totalItemsSold = sales.reduce(
      (sum, sale) => {

        const qty =
          sale.items?.reduce(
            (a, item) =>
              a + Number(item.qty || 0),
            0
          ) || 0;

        return sum + qty;
      },
      0
    );

    return {

      totalSales,
      revenue,
      profit,
      totalItemsSold,

      averageSaleValue:
        totalSales > 0
          ? Math.round(revenue / totalSales)
          : 0
    };
  }

  // =========================================
  // DAILY SALES SUMMARY (FIXED - STABLE DATES)
  // =========================================
  function getDailySalesSummary() {

    const sales = loadSales();

    const grouped = {};

    sales.forEach(sale => {

      const date = getDayKey(sale.timestamp);

      if (!grouped[date]) {

        grouped[date] = {
          date,
          sales: 0,
          revenue: 0,
          profit: 0
        };
      }

      grouped[date].sales += 1;

      grouped[date].revenue += Number(
        sale?.totals?.subtotal || 0
      );

      grouped[date].profit += Number(
        sale?.totals?.profit || 0
      );
    });

    return Object.values(grouped)
      .sort((a, b) =>
        new Date(b.date) - new Date(a.date)
      );
  }

  // =========================================
  // RECENT ACTIVITY
  // =========================================
  function getRecentActivity(limit = 10) {

    const sales = loadSales().map(sale => ({

      type: "sale",
      timestamp: sale.timestamp,
      title: sale.saleId,
      amount: sale?.totals?.subtotal || 0,
      meta: projectSale(sale)
    }));

    const inventory = loadMovements().map(move => ({

      type: "inventory",
      timestamp: move.timestamp,
      title: move.productName || move.productId,
      amount: move.qty || 0,
      meta: projectMovement(move)
    }));

    return [...sales, ...inventory]
      .sort((a, b) =>
        b.timestamp - a.timestamp
      )
      .slice(0, limit);
  }

  // =========================================
  // PRODUCT SALES HISTORY
  // =========================================
  function getProductSales(productId) {

    if (!productId) return [];

    const sales = loadSales();

    return sales
      .filter(sale =>
        sale.items?.some(item =>
          item.productId === productId
        )
      )
      .map(projectSale)
      .reverse();
  }

  // =========================================
  // PRODUCT MOVEMENT HISTORY
  // =========================================
  function getProductMovements(productId) {

    if (!productId) return [];

    return loadMovements()
      .filter(move =>
        move.productId === productId
      )
      .map(projectMovement)
      .reverse();
  }

  // =========================================
  // DAILY SALES SUMMARY (ALIAS READY FOR FUTURE EXPANSION)
  // =========================================
  function getWeeklySalesSummary() {
    // placeholder for future upgrade
    return [];
  }

  // =========================================
  // SALE PROJECTION
  // =========================================
  function projectSale(sale) {

    return {

      saleId: sale.saleId,
      timestamp: sale.timestamp,

      items: clone(sale.items || []),

      totals: {

        subtotal: Number(sale?.totals?.subtotal || 0),
        paid: Number(sale?.totals?.paid || 0),
        change: Number(sale?.totals?.change || 0),
        profit: Number(sale?.totals?.profit || 0)
      },

      itemsCount: sale.items?.length || 0,

      totalQuantity:
        sale.items?.reduce(
          (sum, item) =>
            sum + Number(item.qty || 0),
          0
        ) || 0
    };
  }

  // =========================================
  // RECEIPT PROJECTION
  // =========================================
  function projectReceipt(sale) {

    const projected = projectSale(sale);

    return {

      ...projected,
      receiptTitle: `Receipt ${sale.saleId}`,
      printable: true
    };
  }

  // =========================================
  // MOVEMENT PROJECTION
  // =========================================
  function projectMovement(move) {

    return {

      id: move.id,
      type: move.type,
      productId: move.productId,
      productName: move.productName,
      qty: Number(move.qty || 0),
      timestamp: move.timestamp
    };
  }

  // =========================================
  // SYSTEM SNAPSHOT
  // =========================================
  function getSnapshot() {

    return {

      sales: getSales(),
      receipts: getReceipts(),
      movements: getInventoryMovements(),
      metrics: getSalesMetrics(),
      products: loadProducts()
    };
  }

  // =========================================
  // PUBLIC API
  // =========================================
  return {

    getSales,
    getSaleById,

    getReceipts,
    getInventoryMovements,

    getSalesMetrics,
    getDailySalesSummary,

    getRecentActivity,

    getProductSales,
    getProductMovements,

    getSnapshot
  };

})();

window.RecordsKernel = RecordsKernel;

