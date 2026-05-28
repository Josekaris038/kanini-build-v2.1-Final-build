// ===== EventKernel.js (KANINI EVENT ENGINE v2 STABLE BOOT SAFE) =====

const EventKernel = (() => {

  // ===============================
  // CORE REGISTRY
  // ===============================
  const events = new Map();
  const listenerIndex = new Map();
  const moduleIndex = new Map();
  const auditLog = [];

  const contract = () => window.EventContractMap;

  // ===============================
  // BOOT PHASE CONTROL
  // ===============================
  let bootPhase = "BOOTING"; 
  // BOOTING → READY → LOCKED

  function setBootReady() {
    bootPhase = "READY";
    log("boot", "kernel:ready");
  }

  function lockKernel() {
    bootPhase = "LOCKED";
  }

  // ===============================
  // KERNEL MAP
  // ===============================
  const KERNELS = Object.freeze({
    EventKernel: "EventKernel",
    StateKernel: "StateKernel",
    StorageKernel: "StorageKernel",
    CartStore: "CartStore",
    TransactionKernel: "TransactionKernel",
    ModuleLoader: "ModuleLoader",
    Router: "Router"
  });

  // ===============================
  // CONFIG
  // ===============================
  const CONFIG = {
    strictMode: true,
    audit: true,
    allowUnknownEventsDuringBoot: true
  };

  // ===============================
  // LOGGER
  // ===============================
  function log(action, event, data) {
    console.log(
      `%c[EventKernel:${action}]`,
      "color:#00c2ff;font-weight:bold;",
      event,
      data || ""
    );
  }

  function audit(record) {
    if (!CONFIG.audit) return;
    auditLog.push({ ...record, timestamp: Date.now() });
  }

  // ===============================
  // SAFE CONTRACT VALIDATION
  // ===============================
  function validate(event, emitter, data) {

    const rules = contract()?.get?.(event) || contract()?.[event];

    // ===============================
    // BOOT SAFETY LAYER
    // ===============================
    if (bootPhase === "BOOTING") {
      // allow router + system startup events only
      return true;
    }

    if (!rules) {
      if (bootPhase === "READY") {
        throw new Error(`[EventKernel] Unknown event: ${event}`);
      }
      return true;
    }

    const normalizedEmitter = KERNELS[emitter] || emitter;

    // ownership check
    if (rules.owner && rules.owner !== normalizedEmitter) {
      throw new Error(
        `[EventKernel] OWNER VIOLATION: ${event}`
      );
    }

    const allowed = rules.allowedEmitters;

    const isAllowed =
      allowed instanceof Set
        ? allowed.has(normalizedEmitter)
        : Array.isArray(allowed)
          ? allowed.includes(normalizedEmitter)
          : false;

    if (!isAllowed) {
      throw new Error(
        `[EventKernel] EMITTER BLOCKED: ${normalizedEmitter} → ${event}`
      );
    }

    if (rules.payload && data == null) {
      throw new Error(`[EventKernel] MISSING PAYLOAD: ${event}`);
    }

    return true;
  }

  // ===============================
  // EVENT STORAGE
  // ===============================
  function get(event) {
    if (!events.has(event)) {
      events.set(event, new Set());
    }
    return events.get(event);
  }

  // ===============================
  // LISTENERS
  // ===============================
  function on(event, callback, moduleId = null) {
    const id = Symbol(event);

    const listener = { id, callback, moduleId, event };

    get(event).add(listener);
    listenerIndex.set(id, listener);

    if (moduleId) {
      if (!moduleIndex.has(moduleId)) {
        moduleIndex.set(moduleId, new Set());
      }
      moduleIndex.get(moduleId).add(id);
    }

    return id;
  }

  function once(event, callback, moduleId = null) {
    const id = on(event, callback, moduleId);

    const listeners = get(event);
    for (const l of listeners) {
      if (l.id === id) l.once = true;
    }

    return id;
  }

  // ===============================
  // EMIT (SAFE BOOT AWARE)
  // ===============================
  function emit(event, data, emitter = "unknown") {

    validate(event, emitter, data);

    const listeners = get(event);

    log("emit", event, data);
    audit({ event, emitter, data });

    const snapshot = [...listeners];

    for (const listener of snapshot) {
      try {
        listener.callback({ event, data, emitter });

        if (listener.once) {
          listeners.delete(listener);
          listenerIndex.delete(listener.id);
        }

      } catch (err) {
        console.error(`[EventKernel] Listener crash:`, err);
      }
    }
  }

  // ===============================
  // CLEANUP
  // ===============================
  function clearModule(moduleId) {

    const ids = moduleIndex.get(moduleId);
    if (!ids) return;

    for (const id of ids) {
      const meta = listenerIndex.get(id);
      if (!meta) continue;

      const listeners = get(meta.event);
      listeners.forEach(l => {
        if (l.id === id) listeners.delete(l);
      });

      listenerIndex.delete(id);
    }

    moduleIndex.delete(moduleId);
  }

  function clear() {
    events.clear();
    listenerIndex.clear();
    moduleIndex.clear();
  }

  // ===============================
  // DEBUG
  // ===============================
  function dump() {
    return {
      bootPhase,
      events: [...events.keys()],
      listeners: [...listenerIndex.values()],
      audit: auditLog
    };
  }

  return {
    on,
    once,
    off: (e, id) => {
      const set = get(e);
      for (const l of set) if (l.id === id) set.delete(l);
    },

    emit,
    clear,
    clearModule,
    dump,

    setBootReady,
    lockKernel
  };

})();

window.EventKernel = EventKernel;