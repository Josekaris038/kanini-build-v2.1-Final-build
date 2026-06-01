// ===== CartStore.js (KANINI CART KERNEL v1 STABLE BUFFER) =====

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

      // ===============================
      // PRICE NORMALIZATION (CRITICAL FIX)
      // ===============================
      price: Number(
        item.price ??
        item.sellingPrice ??
        0
      ) || 0,

      sellingPrice: Number(
        item.sellingPrice ??
        item.price ??
        0
      ) || 0,

      qty: Math.max(1, Number(qty) || 1),

      // ===============================
      // EXTRA POS FIELDS (NOW PRESERVED)
      // ===============================
      stock: Number(item.stock ?? 0) || 0,

      barcode: item.barcode || ""
    };
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
  // COMMIT (SINGLE SOURCE OF TRUTH)
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
  // ADD (ENHANCED LOGIC INTEGRATED)
  // ===============================
  function add(item, qty = 1) {

    const normalized = normalize(item, qty);

    const exists = cart.find(i => i.id === normalized.id);

    if (exists) {

      return commit(
        cart.map(i =>
          i.id === normalized.id
            ? {
                ...i,
                qty: i.qty + normalized.qty
              }
            : i
        ),
        "add"
      );
    }

    return commit([...cart, normalized], "add");
  }

  // ===============================
  // UPDATE
  // ===============================
  function update(id, qty) {

    qty = Math.max(1, Number(qty) || 1);

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
  // INCREMENT
  // ===============================
  function increment(id) {

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


