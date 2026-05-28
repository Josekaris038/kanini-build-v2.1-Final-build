// ===== StateKernel.js (KANINI STATE CORE v2 KERNEL ALIGNED) =====

const StateKernel = (() => {

  const Storage = () => window.StorageKernel;
  const Bus = () => window.EventKernel;

  // =========================================
  // DOMAIN STATE
  // =========================================
  let state = {

    inventory: {
      products: [],
      movements: []
    },

    sales: []
  };

  // =========================================
  // IMMUTABLE SNAPSHOT
  // =========================================
  function snapshot() {

    return JSON.parse(
      JSON.stringify(state)
    );
  }

  // =========================================
  // LOAD DATABASE
  // =========================================
  function load() {

    const db = Storage().getDB() || {};

    state.inventory.products =
      db.products || [];

    state.inventory.movements =
      db.movements || [];

    state.sales =
      db.sales || [];

    return snapshot();
  }

  // =========================================
  // PERSIST
  // =========================================
  function persist() {

    Storage().write({

      products:
        state.inventory.products,

      movements:
        state.inventory.movements,

      sales:
        state.sales
    });
  }

  // =========================================
  // EVENT EMITTER
  // =========================================
  function emit(event, payload = {}) {

    Bus().emit(
      event,
      payload,
      "StateKernel"
    );
  }

  // =========================================
  // MUTATION ENGINE
  // =========================================
  function apply(type, payload = {}) {

    switch (type) {

      // =====================================
      // FULL INVENTORY REPLACE
      // =====================================
      case "INVENTORY_SET":

      case "PRODUCTS_SET":

        state.inventory.products =
          payload.products || [];

        persist();

        emit("inventory:updated", {
          products: snapshot().inventory.products
        });

        break;

      // =====================================
      // PRODUCT CREATE
      // =====================================
      case "PRODUCT_CREATE":

        state.inventory.products.push({
          ...payload.product
        });

        persist();

        emit("inventory:updated", {
          action: "create",
          product: payload.product
        });

        break;

      // =====================================
      // PRODUCT UPDATE
      // =====================================
      case "PRODUCT_UPDATE":

        state.inventory.products =
          state.inventory.products.map(product => {

            if (product.id === payload.id) {

              return {
                ...product,
                ...payload.updates
              };
            }

            return product;
          });

        persist();

        emit("inventory:updated", {
          action: "update",
          id: payload.id
        });

        break;

      // =====================================
      // PRODUCT DELETE
      // =====================================
      case "PRODUCT_DELETE":

        state.inventory.products =
          state.inventory.products.filter(
            product => product.id !== payload.id
          );

        persist();

        emit("inventory:updated", {
          action: "delete",
          id: payload.id
        });

        break;

      // =====================================
      // STOCK RECEIVE
      // =====================================
      case "PRODUCT_RECEIVE_STOCK":

        state.inventory.products =
          state.inventory.products.map(product => {

            if (product.id === payload.id) {

              return {
                ...product,
                stock:
                  Number(product.stock || 0) +
                  Number(payload.quantity || 0)
              };
            }

            return product;
          });

        persist();

        emit("inventory:updated", {
          action: "receive",
          id: payload.id,
          quantity: payload.quantity
        });

        break;

      // =====================================
      // INVENTORY MOVEMENT
      // =====================================
      case "INVENTORY_MOVEMENT_ADD":

        state.inventory.movements.push({
          ...payload.movement
        });

        persist();

        emit("inventory:movement:added", {
          movement: payload.movement
        });

        break;

      // =====================================
      // SALE RECORD
      // =====================================
      case "SALE_RECORD":

        state.sales.push({
          ...payload.sale
        });

        persist();

        emit("sales:updated", {
          sale: payload.sale
        });

        break;

      // =====================================
      // FULL RESET
      // =====================================
      case "STATE_RESET":

        state = {

          inventory: {
            products: [],
            movements: []
          },

          sales: []
        };

        persist();

        emit("state:reset", {});

        break;

      // =====================================
      // UNKNOWN MUTATION
      // =====================================
      default:

        throw new Error(
          `[StateKernel] Unknown mutation: ${type}`
        );
    }

    return snapshot();
  }

  // =========================================
  // SAFE READ API
  // =========================================
  function getInventory() {

    return snapshot().inventory;
  }

  function getProducts() {

    return snapshot().inventory.products;
  }

  function getMovements() {

    return snapshot().inventory.movements;
  }

  function getSales() {

    return snapshot().sales;
  }

  // =========================================
  // PUBLIC API
  // =========================================
  return {

    load,

    apply,

    snapshot,

    getInventory,

    getProducts,

    getMovements,

    getSales
  };

})();

window.StateKernel = StateKernel;