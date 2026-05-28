// ===== Router.js (KANINI ROUTER KERNEL v2 TRANSACTION SAFE) =====

const Router = (() => {

  const Bus = () => window.EventKernel;
  const Loader = () => window.ModuleLoader;

  // ===============================
  // ROUTE STATE
  // ===============================
  const state = {
    uiRoute: null,
    moduleRoute: null,
    isNavigating: false
  };

  // ===============================
  // NAVIGATION TRANSACTION SYSTEM
  // ===============================
  let navToken = 0;

  // ===============================
  // EVENTS
  // ===============================
  const EVENTS = {
    NAV_START: "route:navigation:start",
    ROUTE_CHANGED: "route:changed",
    NAV_END: "route:navigation:end"
  };

  // ===============================
  // ROUTE MAP
  // ===============================
  const ROUTE_MAP = {
    sales: "makesale"
  };

  function resolve(route) {
    return ROUTE_MAP[route] || route;
  }

  // ===============================
  // CORE NAVIGATION
  // ===============================
  async function go(route = "dashboard") {

    const token = ++navToken;

    if (state.isNavigating) {
      console.warn("[Router] Navigation blocked (already navigating)");
      return;
    }

    state.isNavigating = true;

    const module = resolve(route);
    const timestamp = Date.now();

    state.uiRoute = route;
    state.moduleRoute = module;

    // ===============================
    // NAV START
    // ===============================
    Bus().emit(
      EVENTS.NAV_START,
      { route, module, timestamp },
      "Router"
    );

    // ===============================
    // UI SYNC
    // ===============================
    syncNav(route);

    // ===============================
    // ROUTE CHANGED
    // ===============================
    Bus().emit(
      EVENTS.ROUTE_CHANGED,
      { route, module, timestamp },
      "Router"
    );

    // ===============================
    // MODULE LOAD (SINGLE AUTHORITY)
    // ===============================
    try {
      Loader().load(module);
    } catch (err) {
      console.error("[Router] Module load failed:", err);
    }

    // ===============================
    // NAV END (TOKEN PROTECTED)
    // ===============================
    requestAnimationFrame(() => {

      // ignore stale navigation cycles
      if (token !== navToken) return;

      Bus().emit(
        EVENTS.NAV_END,
        { route, module, timestamp },
        "Router"
      );

      state.isNavigating = false;
    });
  }

  // ===============================
  // UI SYNC
  // ===============================
  function syncNav(route) {

    const buttons = document.querySelectorAll("[data-route]");

    buttons.forEach(btn => {
      btn.classList.toggle(
        "active",
        btn.dataset.route === route
      );
    });
  }

  // ===============================
  // INIT
  // ===============================
  function init(defaultRoute = "dashboard") {
    go(defaultRoute);
  }

  // ===============================
  // CURRENT STATE
  // ===============================
  function getCurrent() {
    return {
      route: state.uiRoute,
      module: state.moduleRoute,
      isNavigating: state.isNavigating
    };
  }

  // ===============================
  // BACK NAVIGATION
  // ===============================
  function back() {
    window.history.back();
  }

  // ===============================
  // PUBLIC API
  // ===============================
  return {
    go,
    init,
    getCurrent,
    back
  };

})();

window.Router = Router;