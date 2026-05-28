// ===== DataService.js (KANINI READ PROJECTION LAYER v2 FIXED) =====

const DataService = (() => {

  const State = () => window.StateKernel;

  // ===============================
  // PRODUCTS (NO DATA LOSS)
  // ===============================
  function getProducts() {

    return State().getProducts().map(p => ({

      id: p.id,
      name: p.name,

      // IMPORTANT: preserve kernel fields exactly
      stock: p.stock,
      sellingPrice: p.sellingPrice,
      buyingPrice: p.buyingPrice,
      barcode: p.barcode

    }));
  }

  // ===============================
  // SALES (UNCHANGED LOGIC)
  // ===============================
  function getSales() {

    return State().getSales().map(s => ({

      id: s.saleId,
      timestamp: s.timestamp,
      itemsCount: s.items?.length || 0,
      total: s.totals?.subtotal || 0,
      profit: s.totals?.profit || 0

    }));
  }

  // ===============================
  // MOVEMENTS
  // ===============================
  function getMovements() {

    return State().getMovements().map(m => ({

      id: m.id,
      type: m.type,
      qty: m.qty,
      timestamp: m.timestamp

    }));
  }

  // ===============================
  // SNAPSHOT (SAFE AGGREGATION ONLY)
  // ===============================
  function getSnapshot() {

    const state = State().snapshot();

    return {
      productsCount: state.inventory.products.length,
      salesCount: state.sales.length,
      movementsCount: state.inventory.movements.length,

      totalStock: state.inventory.products.reduce(
        (a, p) => a + (p.stock || 0),
        0
      )
    };
  }

  function getSummary() {
    return getSnapshot();
  }

  // ===============================
  // EXPORT
  // ===============================
  function exportDB() {

    const state = State().snapshot();

    return JSON.stringify({
      products: state.inventory.products,
      sales: state.sales,
      movements: state.inventory.movements,
      settings: state.settings
    }, null, 2);
  }

  // ===============================
  // PUBLIC API
  // ===============================
  return {

    getProducts,
    getSales,
    getMovements,

    getSnapshot,
    getSummary,

    exportDB
  };

})();

window.DataService = DataService;