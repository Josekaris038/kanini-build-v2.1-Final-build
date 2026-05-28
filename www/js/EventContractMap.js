// ===== EventContractMap.js (KANINI KERNEL CONTRACT REGISTRY v3 CLEAN) =====

window.EventContractMap = (() => {

  // ===============================
  // CONTRACT REGISTRY
  // ===============================
  const contracts = {

    // ===============================
    // CART DOMAIN
    // ===============================
    "cart:updated": {
      owner: "CartStore",
      allowedEmitters: new Set(["CartStore", "TransactionKernel"]),
      payload: "cartPayload"
    },

    "cart:cleared": {
      owner: "CartStore",
      allowedEmitters: new Set(["CartStore", "TransactionKernel"]),
      payload: "cartPayload"
    },

    // ===============================
    // INVENTORY DOMAIN
    // ===============================
    "inventory:updated": {
      owner: "StateKernel",
      allowedEmitters: new Set(["StateKernel"]),
      payload: "inventoryPayload"
    },

    "inventory:movement:added": {
      owner: "StateKernel",
      allowedEmitters: new Set(["StateKernel"]),
      payload: "movementPayload"
    },

    // ===============================
    // SALES / TRANSACTION DOMAIN
    // ===============================
    "transaction:prepared": {
      owner: "TransactionKernel",
      allowedEmitters: new Set(["TransactionKernel"]),
      payload: "salePayload"
    },

    "sale:created": {
      owner: "TransactionKernel",
      allowedEmitters: new Set(["TransactionKernel"]),
      payload: "salePayload"
    },

    "sales:updated": {
      owner: "StateKernel",
      allowedEmitters: new Set(["StateKernel", "TransactionKernel"]),
      payload: "salePayload"
    },

    // ===============================
    // MODULE LIFECYCLE DOMAIN
    // ===============================
    "module:loaded": {
      owner: "ModuleLoader",
      allowedEmitters: new Set(["ModuleLoader"]),
      payload: "modulePayload"
    },

    "module:unloaded": {
      owner: "ModuleLoader",
      allowedEmitters: new Set(["ModuleLoader"]),
      payload: "moduleLifecyclePayload"
    },

    // ===============================
    // ROUTER DOMAIN
    // ===============================
    "route:navigation:start": {
      owner: "Router",
      allowedEmitters: new Set(["Router"]),
      payload: "routePayload"
    },

    "route:changed": {
      owner: "Router",
      allowedEmitters: new Set(["Router"]),
      payload: "routePayload"
    },

    "route:navigation:end": {
      owner: "Router",
      allowedEmitters: new Set(["Router"]),
      payload: "routePayload"
    }

  };

  // ===============================
  // CORE API
  // ===============================
  function get(eventName) {
    return contracts[eventName] || null;
  }

  function has(eventName) {
    return Object.prototype.hasOwnProperty.call(contracts, eventName);
  }

  function list() {
    return Object.keys(contracts);
  }

  // ===============================
  // STRICT VALIDATION
  // ===============================
  function validate(eventName, emitter, data) {

    const rule = contracts[eventName];

    // ❌ unknown event
    if (!rule) {
      throw new Error(
        `[EventContractMap] UNKNOWN EVENT: ${eventName}`
      );
    }

    const safeEmitter = emitter || "unknown";

    // ===============================
    // OWNER RULE
    // ===============================
    if (rule.owner && rule.owner !== safeEmitter) {
      throw new Error(
        `[EventContractMap] OWNER VIOLATION: ${eventName} → only ${rule.owner} can emit`
      );
    }

    // ===============================
    // EMITTER RULE
    // ===============================
    const allowed = rule.allowedEmitters;

    const ok =
      allowed instanceof Set
        ? allowed.has(safeEmitter)
        : allowed.includes?.(safeEmitter);

    if (!ok) {
      throw new Error(
        `[EventContractMap] EMITTER BLOCKED: ${safeEmitter} → ${eventName}`
      );
    }

    // ===============================
    // PAYLOAD RULE
    // ===============================
    if (rule.payload && (data === undefined || data === null)) {
      throw new Error(
        `[EventContractMap] MISSING PAYLOAD: ${eventName}`
      );
    }

    return true;
  }

  return {
    get,
    has,
    list,
    validate
  };

})();
