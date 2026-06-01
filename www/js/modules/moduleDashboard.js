// ===== moduleDashboard.js (KANINI CONTROL CENTER v23 PURE SURFACE - UPDATED) =====

ModuleLoader.register("dashboard", function () {

  const Data = window.DataService;
  const Finance = window.FinanceKernel;
  const Bus = window.EventKernel;
  const Router = window.Router;

  let container = null;
  let renderTimer = null;

  const arr = (v) => Array.isArray(v) ? v : [];

  // ===============================
  // SNAPSHOT (PURE OPERATIONAL STATE ONLY)
  // ===============================
  function snapshot() {

    const report = Finance?.exportReport?.() || {};
    const sales = arr(Data?.getSales?.());
    const movements = arr(Data?.getMovements?.());

    const activity = [
      ...sales.map(s => ({
        type: "Sale completed",
        time: s.timestamp || Date.now()
      })),
      ...movements.map(m => ({
        type: "Inventory update",
        time: m.timestamp || Date.now()
      }))
    ]
    .sort((a, b) => b.time - a.time)
    .slice(0, 5); // keep recent 5 activities as requested earlier

    return {
      healthScore: report.healthScore || 0,
      activity
    };
  }

  // ===============================
  // CONTROL CENTER (ENTRY HUB)
  // ===============================
  function controlCenter(d) {

    return `
      <section class="dashboard-hero">

        <div class="hero-left">
          <div class="hero-badge">KANINI CONTROL CENTER</div>
          <h1 class="hero-title">Executive Operations</h1>
          <p class="hero-subtitle">System control • execution flow • live activity</p>
        </div>

        <div class="hero-right">

          <div class="health-ring">
            <div class="health-inner">
              <div class="hero-score">${d.healthScore}</div>
              <div class="hero-score-label">HEALTH</div>
            </div>
          </div>

          <div class="hero-actions">

            <!-- FINANCIAL GATEWAY (ONLY FINANCE ENTRY POINT) -->
            <button class="alert-btn"
              onclick="Router?.go?.('analytics')">
              💰 Financials
            </button>

            <!-- SYSTEM CONTROL ENTRY -->
            <button class="alert-btn secondary"
              onclick="Router?.go?.('inventory')">
              📦 Inventory
            </button>

            <button class="alert-btn secondary"
              onclick="Router?.go?.('notifications')">
              🔔 Alerts
            </button>

          </div>

        </div>

      </section>
    `;
  }

  // ===============================
  // RECENT ACTIVITY (CORE VISIBILITY LAYER)
  // ===============================
  function recentActivity(d) {

    return `
      <section class="dashboard-panel">

        <h2>Recent Activity</h2>

        ${d.activity.length
          ? d.activity.map(a => `
              <div class="activity-item">
                <span>${a.type}</span>
                <small>${new Date(a.time).toLocaleTimeString()}</small>
              </div>
            `).join("")
          : `<div>No recent system activity</div>`
        }

      </section>
    `;
  }

  // ===============================
  // MAIN RENDER
  // ===============================
  function render() {

    if (!container) return;

    const d = snapshot();

    container.innerHTML = `
      <div class="dashboard-shell">

        ${controlCenter(d)}

        <section class="dashboard-grid">
          <div class="grid-left">
            ${recentActivity(d)}
          </div>
        </section>

      </div>
    `;
  }

  function refresh() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 120);
  }

  // ===============================
  // LIFECYCLE
  // ===============================
  function mount(el) {

    container = el;
    render();

    Bus.on("inventory:updated", refresh, "dashboard");
    Bus.on("sale:created", refresh, "dashboard");
    Bus.on("cart:updated", refresh, "dashboard");
  }

  function unmount() {
    clearTimeout(renderTimer);
    container = null;
  }

  return {
    mount,
    unmount
  };

});