// ===== CartStore.js (KANINI CART KERNEL v1 STABLE BUFFER + STOCK SAFE) =====

const CartStore = (() => {

  const Bus = () => window.EventKernel;

  // ===============================
  // INTERNAL STATE
  // ===============================
  let cart = [];
  let bootReady = false;

  function setBootReady() {
    bootReady = true;
  }

  // ===============================
  // HELPERS
  // ===============================
  function normalize(item, qty = 1) {

    if (!item?.id) {
      throw new Error("[CartStore] Invalid product");
    }

    const id = String(item.id);

    return {
      id,
      name: item.name || "Unnamed",

      price: Number(item.price ?? item.sellingPrice ?? 0) || 0,
      sellingPrice: Number(item.sellingPrice ?? item.price ?? 0) || 0,

      qty: Math.max(1, Number(qty) || 1),

      stock: Number(item.stock ?? 0) || 0,
      barcode: item.barcode || ""
    };
  }

  // ===============================
  // STOCK VALIDATION (NEW CORE LAYER)
  // ===============================
  function getAvailableStock(itemId) {

    // NOTE: CartStore does NOT own inventory
    // so we rely on product snapshot passed in cart items

    const item = cart.find(i => i.id === String(itemId));

    if (!item) return 0;

    return item.stock;
  }

  function canAdd(item, qtyToAdd) {

    const existing = cart.find(i => i.id === String(item.id));

    const currentQty = existing ? existing.qty : 0;

    const maxStock = Number(item.stock ?? 0);

    return (currentQty + qtyToAdd) <= maxStock;
  }

  function canIncrement(id) {

    const item = cart.find(i => i.id === String(id));

    if (!item) return false;

    return item.qty < item.stock;
  }

  function validateOrThrow(condition, message) {

    if (!condition) {
      throw new Error(message);
    }
  }

  // ===============================
  // SNAPSHOT
  // ===============================
  function getCart() {
    return cart.map(i => ({ ...i }));
  }

  // ===============================
  // SUMMARY
  // ===============================
  function summary() {

    let totalItems = 0;
    let totalPrice = 0;

    for (const item of cart) {
      totalItems += item.qty;
      totalPrice += item.qty * item.price;
    }

    return { totalItems, totalPrice };
  }

  // ===============================
  // EVENT EMITTER
  // ===============================
  function emit(event, data = {}) {

    if (!bootReady) return;

    Bus().emit(event, data, "CartStore");
  }

  // ===============================
  // COMMIT
  // ===============================
  function commit(next, action = "update") {

    cart = next;

    emit("cart:updated", {
      action,
      cart: getCart(),
      summary: summary(),
      timestamp: Date.now()
    });

    return getCart();
  }

  // ===============================
  // ADD (WITH STOCK VALIDATION)
  // ===============================
  function add(item, qty = 1) {

    const normalized = normalize(item, qty);

    const exists = cart.find(i => i.id === normalized.id);

    const currentQty = exists ? exists.qty : 0;

    // STOCK CHECK
    validateOrThrow(
      currentQty + normalized.qty <= normalized.stock,
      `[CartStore] Stock limit exceeded for ${normalized.name}`
    );

    if (exists) {

      return commit(
        cart.map(i =>
          i.id === normalized.id
            ? { ...i, qty: i.qty + normalized.qty }
            : i
        ),
        "add"
      );
    }

    return commit([...cart, normalized], "add");
  }

  // ===============================
  // UPDATE (WITH STOCK VALIDATION)
  // ===============================
  function update(id, qty) {

    qty = Math.max(1, Number(qty) || 1);

    const item = cart.find(i => i.id === String(id));

    validateOrThrow(
      item && qty <= item.stock,
      "[CartStore] Stock limit exceeded on update"
    );

    return commit(
      cart.map(i =>
        i.id === String(id)
          ? { ...i, qty }
          : i
      ),
      "update"
    );
  }

  // ===============================
  // INCREMENT (STOCK SAFE)
  // ===============================
  function increment(id) {

    const item = cart.find(i => i.id === String(id));

    validateOrThrow(
      item && item.qty < item.stock,
      "[CartStore] Cannot exceed stock"
    );

    return commit(
      cart.map(i =>
        i.id === String(id)
          ? { ...i, qty: i.qty + 1 }
          : i
      ),
      "increment"
    );
  }

  // ===============================
  // DECREMENT
  // ===============================
  function decrement(id) {

    const next = cart
      .map(i =>
        i.id === String(id)
          ? { ...i, qty: i.qty - 1 }
          : i
      )
      .filter(i => i.qty > 0);

    return commit(next, "decrement");
  }

  // ===============================
  // REMOVE
  // ===============================
  function remove(id) {

    return commit(
      cart.filter(i => i.id !== String(id)),
      "remove"
    );
  }

  // ===============================
  // CLEAR
  // ===============================
  function clear() {

    cart = [];

    emit("cart:cleared", {
      timestamp: Date.now()
    });

    emit("cart:updated", {
      action: "clear",
      cart: [],
      summary: summary(),
      timestamp: Date.now()
    });

    return [];
  }

  // ===============================
  // UTILITIES
  // ===============================
  function has(id) {
    return cart.some(i => i.id === String(id));
  }

  function getItem(id) {
    return cart.find(i => i.id === String(id)) || null;
  }

  function count() {
    return summary().totalItems;
  }

  function total() {
    return summary().totalPrice;
  }

  // ===============================
  // PUBLIC API
  // ===============================
  return {
    getCart,
    summary,

    add,
    update,
    increment,
    decrement,
    remove,
    clear,

    has,
    getItem,
    count,
    total,

    setBootReady
  };

})();

window.CartStore = CartStore;
