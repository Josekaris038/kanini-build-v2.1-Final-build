// ===== moduleDashboard.js (KANINI DASHBOARD v19 EXECUTIVE UI REWRITE) =====

ModuleLoader.register("dashboard", function () {

  const Data = window.DataService;
  const Finance = window.FinanceKernel;
  const Safe = window.Safe;
  const Bus = window.EventKernel;

  let container = null;
  let renderTimer = null;

  // ===============================
  // SAFE HELPERS
  // ===============================
  const num = (v) => Number(v) || 0;

  const money = (v) =>
    num(v).toLocaleString();

  const arr = (v) =>
    Array.isArray(v) ? v : [];

  // ===============================
  // HEALTH STATUS
  // ===============================
  const status = (score) => {
    const s = num(score);

    if (s < 40) return { label: "Critical", icon: "🔴", tone: "danger" };
    if (s < 60) return { label: "Warning", icon: "🟠", tone: "warning" };
    if (s < 80) return { label: "Healthy", icon: "🟢", tone: "safe-light" };

    return { label: "Excellent", icon: "💚", tone: "safe" };
  };

  // ===============================
  // SNAPSHOT ENGINE
  // ===============================
  function snapshot() {

    const report = Finance?.exportReport?.() || {};
    const sales = arr(Data?.getSales?.());
    const movements = arr(Data?.getMovements?.());
    const ai = Safe?.aiSnapshot?.() || {};

    const activity = [
      ...sales.map(s => ({
        type: "SALE",
        time: s.timestamp || Date.now(),
        value: num(s.totals?.subtotal)
      })),
      ...movements.map(m => ({
        type: m.type || "MOVE",
        time: m.timestamp || Date.now(),
        value: num(m.qty)
      }))
    ]
      .sort((a, b) => b.time - a.time)
      .slice(0, 6);

    return {
      revenue: num(report.revenue),
      profit: num(report.profit),
      salesCount: num(report.salesCount || sales.length),
      itemsSold: num(report.itemsSold),
      inventoryValue: num(report.inventoryValue),
      potentialProfit: num(report.potentialProfit),
      healthScore: num(report.healthScore),

      lowStock: arr(ai.lowStock),
      fast: arr(ai.topProducts).slice(0, 5),

      activity
    };
  }

  // ===============================
  // HERO
  // ===============================
  function hero(d) {

    const s = status(d.healthScore);

    return `
      <section class="dashboard-hero">

        <div class="hero-left">
          <div class="hero-badge">KANINI CONTROL CENTER</div>
          <h1 class="hero-title">Executive Dashboard</h1>
          <p class="hero-subtitle">Real-time operational intelligence layer</p>
        </div>

        <div class="hero-right">
          <div class="health-ring ${s.tone}">
            <div class="health-inner">
              <div class="hero-score">${d.healthScore}</div>
              <div class="hero-score-label">HEALTH</div>
            </div>
          </div>

          <div class="health-status">
            <span>${s.icon}</span>
            <span>${s.label}</span>
          </div>
        </div>

      </section>
    `;
  }

  // ===============================
  // KPI STRIP
  // ===============================
  function kpis(d) {

    return `
      <section class="kpi-grid">

        <div class="kpi-card">
          <div class="kpi-label">Revenue</div>
          <div class="kpi-value">KES ${money(d.revenue)}</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Profit</div>
          <div class="kpi-value">KES ${money(d.profit)}</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Sales</div>
          <div class="kpi-value">${d.salesCount}</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Items Sold</div>
          <div class="kpi-value">${d.itemsSold}</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Inventory Value</div>
          <div class="kpi-value">KES ${money(d.inventoryValue)}</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Potential Profit</div>
          <div class="kpi-value">KES ${money(d.potentialProfit)}</div>
        </div>

      </section>
    `;
  }

  // ===============================
  // PRODUCT INTELLIGENCE
  // ===============================
  function movement(d) {

    return `
      <section class="dashboard-panel">

        <h2>Product Intelligence</h2>

        <div class="movement-grid">

          <div>
            <h3>Top Performing Products</h3>

            ${d.fast.length
              ? d.fast.map(i => `
                  <div class="activity-item">
                    <span>${i.name || i.id || "Unknown"}</span>
                    <strong>${i.qty || i.sold || 0}</strong>
                  </div>
                `).join("")
              : `<div>No product data</div>`
            }

          </div>

        </div>

      </section>
    `;
  }

  // ===============================
  // LOW STOCK
  // ===============================
  function lowStock(d) {

    return `
      <section class="dashboard-panel">

        <h2>Low Stock Alert (${d.lowStock.length})</h2>

        ${d.lowStock.length
          ? d.lowStock.map(p => `
              <div class="stock-item">
                <strong>${p.name}</strong>
                <span>${p.stock}</span>
              </div>
            `).join("")
          : `<div>Inventory stable</div>`
        }

      </section>
    `;
  }

  // ===============================
  // ACTIVITY FEED
  // ===============================
  function activityFeed(d) {

    return `
      <section class="dashboard-panel">

        <h2>Recent Activity</h2>

        ${d.activity.length
          ? d.activity.map(a => `
              <div class="activity-item">
                <span>${a.type}</span>
                <strong>${a.value}</strong>
              </div>
            `).join("")
          : `<div>No recent activity</div>`
        }

      </section>
    `;
  }

  // ===============================
  // MAIN LAYOUT
  // ===============================
  function render() {

    if (!container) return;

    const d = snapshot();

    container.innerHTML = `
      <div class="dashboard-shell">

        ${hero(d)}

        <section class="kpi-wrapper">
          ${kpis(d)}
        </section>

        <section class="dashboard-grid">

          <div class="grid-left">
            ${movement(d)}
            ${activityFeed(d)}
          </div>

          <div class="grid-right">
            ${lowStock(d)}
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