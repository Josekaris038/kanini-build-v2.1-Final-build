// ===== app.js (KANINI BOOT ORCHESTRATOR v2 FINAL STABILIZED) =====

const App = (() => {

  let booted = false;

  // ===============================
  // DEPENDENCY CHECK
  // ===============================
  function validateBoot() {

    const missing = [];

    const deps = [
      "EventKernel",
      "StorageKernel",
      "StateKernel",
      "CartStore",
      "TransactionKernel",
      "DataService",
      "ModuleLoader",
      "Router"
    ];

    for (const name of deps) {
      if (!window[name]) missing.push(name);
    }

    if (missing.length) {
      throw new Error(`[BOOT] Missing dependencies: ${missing.join(", ")}`);
    }
  }

  // ===============================
  // PHASE 1: HYDRATION
  // ===============================
  function hydrateSystem() {

    window.StateKernel.load();

    console.table(window.StateKernel.snapshot?.() || {});
  }

  // ===============================
  // PHASE 2: ACTIVATE EVENT SYSTEM
  // ===============================
  function activateEventSystem() {

    // 🔴 SYSTEM BARRIER OPEN
    if (window.EventKernel?.setBootReady) {
      window.EventKernel.setBootReady();
    }
  }

  // ===============================
  // PHASE 3: ROUTER SAFE INIT (NO NAVIGATION YET)
  // ===============================
  function initRouter() {

    // IMPORTANT: do NOT auto-navigate immediately
    // just initialize internal state
    window.Router.getCurrent?.();
  }

  // ===============================
  // PHASE 4: FIRST STABLE NAVIGATION
  // ===============================
  function firstNavigation() {

    // 🔴 WAIT FOR STABILITY WINDOW
    requestAnimationFrame(() => {

      window.Router.init("dashboard");
    });
  }

  // ===============================
  // UI BINDINGS
  // ===============================
  function setupUI() {

    const sidebar = document.querySelector(".sidebar");
    const toggleBtn = document.getElementById("menuToggle");

    if (!sidebar || !toggleBtn) return;

    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      sidebar.classList.toggle("open");
    });

    sidebar.addEventListener("click", (e) => {

      const btn = e.target.closest("[data-route]");
      if (!btn) return;

      window.Router.go(btn.dataset.route);

      requestAnimationFrame(() => {
        sidebar.classList.remove("open");
      });
    });

    document.addEventListener("click", (e) => {
      if (e.target.closest(".sidebar") || e.target === toggleBtn) return;
      sidebar.classList.remove("open");
    });
  }

  // ===============================
  // BOOT SEQUENCE (STRICT PHASED CONTROL)
  // ===============================
  function boot() {

    if (booted) return;

    console.log("%c[BOOT] Starting Kanini Kernel...", "color:#00c2ff;font-weight:bold;");

    // STEP 1: VALIDATE
    validateBoot();

    // STEP 2: HYDRATE STATE
    hydrateSystem();

    // STEP 3: ACTIVATE EVENT SYSTEM (IMPORTANT BARRIER)
    activateEventSystem();

    // STEP 4: INIT ROUTER (NO NAVIGATION YET)
    initRouter();

    // STEP 5: UI BINDINGS
    setupUI();

    // STEP 6: FIRST NAVIGATION (DEFERRED STABLE ENTRY)
    firstNavigation();

    booted = true;

    console.log("%c[BOOT] System Stable ✔", "color:#00ff88;font-weight:bold;");
  }

  return { boot };

})();

// ===============================
// DOM READY
// ===============================
document.addEventListener("DOMContentLoaded", () => {

  try {
    App.boot();
  } catch (err) {
    console.error("❌ BOOT FAILURE:", err);
  }

});

window.App = App;
window.ModuleLoader.register("records", window.moduleRecords);

