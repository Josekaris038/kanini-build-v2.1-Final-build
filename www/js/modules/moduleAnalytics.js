// ===== moduleAnalytics.js (KANINI EXECUTIVE INTELLIGENCE DASHBOARD v3 — CLASS EDITION) =====

ModuleLoader.register("analytics", function () {

  // =========================================
  // KERNEL ACCESS
  // =========================================
  const BIK = window.BusinessIntelligenceKernel;
  const Bus = window.EventKernel;

  const container =
    document.getElementById("moduleContainer");

  if (!container) return;

  // =========================================
  // FORMATTERS
  // =========================================
  function money(value) {
    return Number(value || 0).toLocaleString();
  }

  function percent(value) {
    return `${Number(value || 0).toFixed(2)}%`;
  }

  // =========================================
  // UI CARD
  // =========================================
  function metricCard(label, value) {
    return `
      <div class="analytics-card">
        <div class="analytics-label">${label}</div>
        <div class="analytics-value">${value}</div>
      </div>
    `;
  }

  // =========================================
  // LIST SECTION
  // =========================================
  function listSection(title, items, formatter) {
    return `
      <div class="analytics-panel">

        <div class="panel-title">
          ${title}
        </div>

        <div class="panel-body">

          ${
            items.length
              ? items.map(formatter).join("")
              : `<div class="analytics-empty">No records available at this time</div>`
          }

        </div>

      </div>
    `;
  }

  // =========================================
  // 🧠 ELEGANT NARRATIVE ENGINE
  // =========================================
  function buildNarrative(summary, pulse, comparison, insights) {

    const lines = [];

    const revenueGrowth = comparison?.growth?.revenue;
    const profitGrowth = comparison?.growth?.profit;

    // -----------------------------------------
    // Revenue narrative (refined tone)
    // -----------------------------------------
    if (typeof revenueGrowth === "number") {

      if (revenueGrowth > 0) {
        lines.push(
          `Revenue has expanded by ${percent(revenueGrowth)} compared to yesterday, indicating healthy demand momentum across the business.`
        );
      } else if (revenueGrowth < 0) {
        lines.push(
          `Revenue contracted by ${percent(Math.abs(revenueGrowth))} relative to yesterday, suggesting a temporary softening in market activity.`
        );
      } else {
        lines.push(
          `Revenue has remained steady compared to yesterday, reflecting stable market conditions.`
        );
      }
    }

    // -----------------------------------------
    // Profit narrative (refined tone)
    // -----------------------------------------
    if (typeof profitGrowth === "number") {

      if (profitGrowth > 0) {
        lines.push(
          `Profitability strengthened by ${percent(profitGrowth)}, reflecting improved operational efficiency and margin control.`
        );
      } else if (profitGrowth < 0) {
        lines.push(
          `Profitability declined by ${percent(Math.abs(profitGrowth))}, indicating margin pressure within current sales composition.`
        );
      } else {
        lines.push(
          `Profit levels remain consistent with the previous day, indicating balanced cost-to-revenue performance.`
        );
      }
    }

    // -----------------------------------------
    // Business pulse narrative
    // -----------------------------------------
    if (pulse) {

      lines.push(
        `The business is currently positioned in a "${pulse.status}" state with an operational score of ${pulse.score}.`
      );

      if (pulse.alerts > 0) {
        lines.push(
          `There are ${pulse.alerts} active operational signals requiring attention within inventory and sales flow.`
        );
      } else {
        lines.push(
          `Operational conditions remain stable with no immediate risk indicators detected.`
        );
      }
    }

    // -----------------------------------------
    // Strategic insight elevation
    // -----------------------------------------
    if (insights?.length) {

      const top = insights[0];

      if (top?.message) {
        lines.push(
          `Key observation: ${top.message}`
        );
      }
    }

    return lines;
  }

  // =========================================
  // MAIN RENDER
  // =========================================
  function render() {

    const summary =
      BIK.getExecutiveSummary();

    const pulse =
      BIK.getBusinessPulse();

    const comparison =
      BIK.getDailyComparison();

    const fastMovers =
      BIK.getFastMovers(5);

    const topProfit =
      BIK.getTopProfitProducts(5);

    const deadStock =
      BIK.getDeadStock(30).slice(0, 5);

    const reorder =
      BIK.getReorderRecommendations().slice(0, 5);

    const alerts =
      BIK.getOperationalAlerts();

    const insights =
      BIK.generateInsights();

    const narrative =
      buildNarrative(summary, pulse, comparison, insights);

    container.innerHTML = `

      <div class="analytics-wrapper">

        <!-- ================================= -->
        <!-- HEADER -->
        <!-- ================================= -->

        <div class="analytics-hero">

          <h2 class="analytics-title">
            Business Intelligence
          </h2>

          <div class="analytics-subtitle">
            Executive Command Center
          </div>

        </div>

        <!-- ================================= -->
        <!-- CORE METRICS -->
        <!-- ================================= -->

        <div class="analytics-grid">

          ${metricCard("Revenue", money(summary.revenue))}
          ${metricCard("Profit", money(summary.profit))}
          ${metricCard("Inventory Value", money(summary.inventoryValue))}
          ${metricCard("Potential Profit", money(summary.potentialProfit))}

        </div>

        <!-- ================================= -->
        <!-- DAILY PERFORMANCE -->
        <!-- ================================= -->

        <div class="analytics-section-title">
          Daily Performance Overview
        </div>

        <div class="analytics-grid">

          ${metricCard("Today’s Revenue", money(comparison.today.revenue))}
          ${metricCard("Yesterday’s Revenue", money(comparison.yesterday.revenue))}
          ${metricCard("Revenue Shift", percent(comparison.growth.revenue))}
          ${metricCard("Profit Shift", percent(comparison.growth.profit))}

        </div>

        <!-- ================================= -->
        <!-- BUSINESS PULSE -->
        <!-- ================================= -->

        <div class="pulse-card">

          <div class="pulse-score">
            ${pulse.score}
          </div>

          <div class="pulse-status">
            ${pulse.status}
          </div>

          <div class="pulse-meta">
            Health: ${pulse.health} |
            Momentum: ${pulse.momentum} |
            Active Signals: ${pulse.alerts}
          </div>

        </div>

        <!-- ================================= -->
        <!-- STRATEGIC NARRATIVE LAYER -->
        <!-- ================================= -->

        <div class="analytics-section-title">
          Executive Narrative Briefing
        </div>

        <div class="analytics-panel">

          <div class="panel-body">

            ${
              narrative.length
                ? narrative.map(line => `
                    <div class="insight-item">
                      ${line}
                    </div>
                  `).join("")
                : `<div class="analytics-empty">No strategic narrative available at this time</div>`
            }

          </div>

        </div>

        <!-- ================================= -->
        <!-- PRODUCT INTELLIGENCE -->
        <!-- ================================= -->

        <div class="analytics-section-title">
          Product Intelligence
        </div>

        <div class="analytics-panels">

          ${listSection("Fast Moving Products", fastMovers, item => `
            <div class="analytics-row">
              <span>${item.name}</span>
              <span>${item.quantitySold}</span>
            </div>
          `)}

          ${listSection("Top Profit Contributors", topProfit, item => `
            <div class="analytics-row">
              <span>${item.name}</span>
              <span>${money(item.profit)}</span>
            </div>
          `)}

        </div>

        <!-- ================================= -->
        <!-- RISK INTELLIGENCE -->
        <!-- ================================= -->

        <div class="analytics-section-title">
          Operational Risk Profile
        </div>

        <div class="analytics-panels">

          ${listSection("Inactive Inventory", deadStock, item => `
            <div class="analytics-row">
              <span>${item.name}</span>
              <span>Stock: ${item.stock}</span>
            </div>
          `)}

          ${listSection("Reorder Horizon", reorder, item => `
            <div class="analytics-row">
              <span>${item.name}</span>
              <span>${item.daysRemaining} days</span>
            </div>
          `)}

        </div>

        <!-- ================================= -->
        <!-- OPERATIONAL SIGNALS -->
        <!-- ================================= -->

        <div class="analytics-section-title">
          Operational Signals
        </div>

        <div class="analytics-panel">

          <div class="panel-body">

            ${
              alerts.length
                ? alerts.map(alert => `
                    <div class="alert-item">
                      ${alert.message}
                    </div>
                  `).join("")
                : `<div class="analytics-empty">No operational signals detected</div>`
            }

          </div>

        </div>

        <!-- ================================= -->
        <!-- STRATEGIC INSIGHTS -->
        <!-- ================================= -->

        <div class="analytics-section-title">
          Strategic Insights
        </div>

        <div class="analytics-panel">

          <div class="panel-body">

            ${
              insights.length
                ? insights.map(insight => `
                    <div class="insight-item">
                      <div class="insight-title">${insight.title}</div>
                      <div class="insight-message">${insight.message}</div>
                    </div>
                  `).join("")
                : `<div class="analytics-empty">No strategic insights available</div>`
            }

          </div>

        </div>

      </div>
    `;
  }

  // =========================================
  // MOUNT
  // =========================================
  function mount() {

    render();

    Bus.on("sales:updated", render, "analytics");
    Bus.on("inventory:updated", render, "analytics");
  }

  // =========================================
  // CLEANUP
  // =========================================
  function cleanup() {

    Bus.clearModule("analytics");
    container.innerHTML = "";
  }

  return {
    mount,
    cleanup
  };

});