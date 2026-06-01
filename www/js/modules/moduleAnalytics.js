// ======================================================
// moduleAnalytics.js (KANINI BI DASHBOARD v5 — EXECUTIVE EXPERIENCE LAYER)
// Finance-aware realignment with TODAY metrics integration
// ======================================================

ModuleLoader.register("analytics", function () {

  const BIK = window.BusinessIntelligenceKernel;
  const Finance = window.FinanceKernel;
  const Bus = window.EventKernel;

  const container = document.getElementById("moduleContainer");
  if (!container) return;

  // =========================
  // FORMATTERS
  // =========================
  const money = v => Number(v || 0).toLocaleString();
  const percent = v => `${(v || 0).toFixed(1)}%`;

  // =========================
  // CARD UI
  // =========================
  function card(label, value, sub = "") {
    return `
      <div class="a-card">
        <div class="a-label">${label}</div>
        <div class="a-value">${value}</div>
        ${sub ? `<div class="a-sub">${sub}</div>` : ""}
      </div>
    `;
  }

  // =========================
  // SAFE WRAPPER
  // =========================
  const safe = (fn, fallback = null) => {
    try {
      return typeof fn === "function" ? fn() : fallback;
    } catch (e) {
      return fallback;
    }
  };

  // =========================
  // TODAY METRICS (NEW ADDITION)
  // =========================
  function getTodayMetrics() {

    const todayRevenue = safe(() => Finance.getRevenueByDays(1), 0);
    const todayProfit = safe(() => Finance.getProfitByDays(1), 0);

    return {
      revenue: todayRevenue,
      profit: todayProfit
    };
  }

  // =========================
  // EXECUTIVE NARRATIVE ENGINE (UNCHANGED TONE)
  // =========================
  function buildNarrative() {

    const comparison = safe(() => BIK.getDailyComparison(), {});
    const summary = safe(() => BIK.getExecutiveSummary(), {});
    const pulse = safe(() => BIK.getBusinessPulse(), {});
    const topRev = safe(() => BIK.getTopRevenueProducts?.(1)?.[0], null);
    const topProf = safe(() => BIK.getTopProfitProducts?.(1)?.[0], null);
    const dead = safe(() => BIK.getDeadStock?.(30), []);
    const forecast = safe(() => BIK.getForecast?.(7), []);

    const lines = [];

    const revGrowth = comparison?.growth?.revenue ?? 0;
    const profGrowth = comparison?.growth?.profit ?? 0;

    if (revGrowth > 0) {
      lines.push(`Business is expanding. Revenue is up ${revGrowth.toFixed(1)}%, driven by stronger customer demand and higher transaction flow.`);
    } else if (revGrowth < 0) {
      lines.push(`Business activity slowed. Revenue dropped by ${Math.abs(revGrowth).toFixed(1)}%, indicating reduced customer movement or weaker sales conversion.`);
    } else {
      lines.push(`Revenue stability maintained — the business is operating in a balanced demand state.`);
    }

    if (profGrowth > 0) {
      lines.push(`Profitability strengthened by ${profGrowth.toFixed(1)}%, suggesting improved profit generation and healthier product mix.`);
    } else if (profGrowth < 0) {
      lines.push(`Profit pressure detected. Profit weakened by ${Math.abs(profGrowth).toFixed(1)}%, likely due to cost or pricing imbalance.`);
    }

    if (topRev) {
      lines.push(`Primary revenue engine today: ${topRev.name}. This product is anchoring overall sales performance.`);
    }

    if (topProf) {
      lines.push(`Highest value contributor: ${topProf.name}. This is your strongest profit generator.`);
    }

    if (pulse?.status) {
      lines.push(`Business condition: ${pulse.status}. Operational health score sits at ${pulse.score}, indicating current system stability.`);
    }

    if (summary?.inventoryValue) {
      lines.push(`Inventory represents locked capital of ${money(summary.inventoryValue)}. This reflects resources currently tied in stock.`);
    }

    if (dead.length > 0) {
      lines.push(`${dead.length} products show no recent movement. This indicates potential capital stagnation and slow-moving inventory risk.`);
    }

    if (forecast?.length) {
      const end = forecast[forecast.length - 1];
      lines.push(`Forward outlook suggests revenue trajectory could reach approximately ${money(end.revenue)} within the next 7 days under current conditions.`);
    }

    return lines;
  }

  // =========================
  // HOURLY RENDER
  // =========================
  function renderHourly(hourly) {

    if (!hourly?.length) return `<div class="empty">No activity data</div>`;

    const max = Math.max(...hourly.map(h => h.revenue || 0), 1);

    return hourly.map(h => {
      const height = (h.revenue / max) * 100;

      return `
        <div class="hour-col">
          <div class="bar">
            <div class="fill" style="height:${height}px"></div>
          </div>
          <div class="hour-label">${h.hour}</div>
        </div>
      `;
    }).join("");
  }

  // =========================
  // MAIN RENDER
  // =========================
  function render() {

    const summary = safe(() => BIK.getExecutiveSummary(), {});
    const pulse = safe(() => BIK.getBusinessPulse(), {});
    const hourly = safe(() => BIK.getHourlyPerformance(), []);
    const insights = safe(() => BIK.generateInsights(), []);
    const reorder = safe(() => BIK.getReorderRecommendations(), []);
    const alerts = safe(() => BIK.getOperationalAlerts(), []);
    const exposure = safe(() => BIK.getInventoryExposure(), []);
    const revenueShare = safe(() => BIK.getRevenueContribution(), []);
    const capitalRisk = safe(() => BIK.getCapitalLockRisk(), []);
    const narrative = buildNarrative();

    const today = getTodayMetrics();

    container.innerHTML = `
      <div class="analytics">

        <!-- HERO -->
        <div class="hero">
          <h1>Executive Intelligence Layer</h1>
          <p>Live business state • decision-grade insights • operational awareness</p>
        </div>

        <!-- KPI STRIP -->
        <div class="grid">

          ${card("Today Revenue", money(today.revenue), "Revenue generated today")}
          ${card("Today Profit", money(today.profit), "Profit generated today")}

          ${card("Inventory Value", money(summary.inventoryValue), "Capital currently held in stock")}
          ${card("Potential Profit", money(summary.potentialProfit), "If all stock is optimally sold")}

          ${card("Transactions", summary.transactions, "Customer activity count")}
          ${card("Avg Sale", money(summary.averageSale), "Average transaction size")}
        </div>

        <!-- BUSINESS PULSE -->
        <div class="pulse">
          <div class="score">${pulse.score}</div>
          <div class="status">
            Business State: <b>${pulse.status}</b> • Health ${pulse.health} • Momentum ${pulse.momentum}
          </div>
        </div>

        <!-- NARRATIVE -->
        <div class="section-title">Executive Narrative</div>
        <div class="panel">
          ${narrative.map(n => `<div class="line">${n}</div>`).join("")}
        </div>

        <!-- OPERATIONAL RHYTHM -->
        <div class="section-title">Operational Rhythm</div>
        <div class="hourly-chart">
          ${renderHourly(hourly)}
        </div>

        <!-- INSIGHTS -->
        <div class="section-title">Key Intelligence Signals</div>
        <div class="panel">
          ${insights.length
            ? insights.map(i => `
                <div class="insight">
                  <b>${i.title}</b>
                  <span>${i.message}</span>
                </div>
              `).join("")
            : `<div class="empty">No active intelligence signals</div>`
          }
        </div>

        <!-- ALERTS -->
        <div class="section-title">Operational Awareness</div>
        <div class="panel">
          ${alerts.length
            ? alerts.map(a => `
              <div class="alert ${a.level}">
                <b>${a.level.toUpperCase()}</b>
                <span>${a.message}</span>
              </div>
            `).join("")
            : `<div class="empty">No operational risks detected</div>`
          }
        </div>

        <!-- INVENTORY -->
        <div class="section-title">Inventory Exposure</div>
        <div class="panel">
          ${exposure.slice(0, 5).map(p => `
            <div class="row">
              <span>${p.name}</span>
              <b>${money(p.value)}</b>
            </div>
          `).join("")}
        </div>

        <!-- CAPITAL RISK -->
        <div class="section-title">Capital Efficiency Risk</div>
        <div class="panel">
          ${capitalRisk.slice(0, 5).map(p => `
            <div class="row">
              <span>${p.name}</span>
              <b>${p.riskScore}</b>
            </div>
          `).join("")}
        </div>

        <!-- REORDER -->
        <div class="section-title">Reorder Intelligence</div>
        <div class="panel">
          ${reorder.slice(0, 5).map(p => `
            <div class="row">
              <span>${p.name}</span>
              <b>${p.daysRemaining} days</b>
            </div>
          `).join("")}
        </div>

        <!-- REVENUE -->
        <div class="section-title">Revenue Distribution</div>
        <div class="panel">
          ${revenueShare.slice(0, 5).map(p => `
            <div class="row">
              <span>${p.name}</span>
              <b>${percent(p.contribution)}</b>
            </div>
          `).join("")}
        </div>

      </div>
    `;
  }

  function mount() {
    render();
    Bus.on("sales:updated", render, "analytics");
    Bus.on("inventory:updated", render, "analytics");
  }

  function cleanup() {
    Bus.clearModule("analytics");
    container.innerHTML = "";
  }

  return { mount, cleanup };
});