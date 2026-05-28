// ===== ModuleLoader.js (KANINI LIFECYCLE ENGINE v3 DETERMINISTIC CORE) =====

const ModuleLoader = (() => {

  const modules = new Map();

  const state = {
    activeName: null,
    instance: null,
    container: null,
    loading: false
  };

  // ===============================
  // REGISTER MODULE
  // ===============================
  function register(name, factory) {
    modules.set(name, factory);
  }

  // ===============================
  // GET MODULE
  // ===============================
  function get(name) {
    return modules.get(name);
  }

  // ===============================
  // CONTEXT BUILDER
  // ===============================
  function buildCtx(container) {
    return {
      container,
      data: window.DataService,
      bus: window.EventKernel,
      state: window.StateKernel,
      router: window.Router,
      cart: window.CartStore
    };
  }

  // ===============================
  // CLEANUP
  // ===============================
  function cleanup() {

    if (!state.instance) return;

    try {

      state.instance.unmount?.();
      state.instance.cleanup?.();

      if (state.container) {
        state.container.innerHTML = "";
      }

      window.EventKernel?.clearModule?.(state.activeName);

    } catch (err) {
      console.error("[ModuleLoader] cleanup error:", err);
    }

    state.activeName = null;
    state.instance = null;
    state.container = null;
  }

  // ===============================
  // CORE LOAD (SINGLE SOURCE OF TRUTH)
  // ===============================
  function load(name, containerSelector = "#moduleContainer") {

    if (state.loading) return null;
    state.loading = true;

    const factory = get(name);
    if (!factory) {
      console.warn(`[ModuleLoader] Missing module: ${name}`);
      state.loading = false;
      return null;
    }

    const container = document.querySelector(containerSelector);
    if (!container) {
      console.warn(`[ModuleLoader] Missing container: ${containerSelector}`);
      state.loading = false;
      return null;
    }

    // HARD RESET BEFORE LOAD
    cleanup();

    const ctx = buildCtx(container);

    let instance;

    try {
      instance = factory.length >= 1 ? factory(ctx) : factory();
    } catch (err) {
      console.error("[ModuleLoader] factory error:", err);
      state.loading = false;
      return null;
    }

    // CRITICAL: ensure instance validity
    if (!instance || typeof instance !== "object") {
      console.error("[ModuleLoader] Invalid module instance returned");
      state.loading = false;
      return null;
    }

    // MOUNT PHASE (ONLY PLACE ALLOWED)
    if (typeof instance.mount === "function") {
      try {
        instance.mount(container, ctx);
      } catch (err) {
        console.error("[ModuleLoader] mount error:", err);
      }
    } else {
      console.warn("[ModuleLoader] Module missing mount():", name);
    }

    state.activeName = name;
    state.instance = instance;
    state.container = container;
    state.loading = false;

    window.EventKernel?.emit?.(
      "module:loaded",
      { module: name, timestamp: Date.now() },
      "ModuleLoader"
    );

    return instance;
  }

  // ===============================
  // RELOAD (FIXED — NO DESYNC POSSIBLE)
  // ===============================
  function reload() {

    if (!state.activeName) return null;

    const name = state.activeName;
    const container = state.container;

    if (!container) {
      console.error("[ModuleLoader] reload failed: no container");
      return null;
    }

    return load(name, "#moduleContainer");
  }

  // ===============================
  // CURRENT STATE
  // ===============================
  function current() {
    return {
      name: state.activeName,
      instance: state.instance,
      container: state.container
    };
  }

  // ===============================
  // DESTROY ALL
  // ===============================
  function destroyAll() {
    cleanup();
    modules.clear();

    window.EventKernel?.emit?.(
      "module:unloaded",
      { all: true, timestamp: Date.now() },
      "ModuleLoader"
    );
  }

  // ===============================
  // PUBLIC API
  // ===============================
  return {
    register,
    load,
    reload,
    current,
    destroyAll,
    get
  };

})();

window.ModuleLoader = ModuleLoader;