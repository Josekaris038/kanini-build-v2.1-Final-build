// ===== moduleAnalytics.js (KANINI EXECUTIVE INTELLIGENCE DASHBOARD v1) =====

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
  // MONEY FORMAT
  // =========================================
  function money(value) {

    return Number(value || 0)
      .toLocaleString();
  }

  // =========================================
  // CARD
  // =========================================
  function metricCard(
    label,
    value
  ) {

    return `
      <div class="analytics-card">

        <div class="analytics-label">
          ${label}
        </div>

        <div class="analytics-value">
          ${value}
        </div>

      </div>
    `;
  }

  // =========================================
  // LIST SECTION
  // =========================================
  function listSection(
    title,
    items,
    formatter
  ) {

    return `

      <div class="analytics-panel">

        <div class="panel-title">
          ${title}
        </div>

        <div class="panel-body">

          ${
            items.length

            ? items.map(formatter).join("")

            : `
              <div class="analytics-empty">
                No data available
              </div>
            `
          }

        </div>

      </div>

    `;
  }

  // =========================================
  // RENDER
  // =========================================
  function render() {

    const summary =
      BIK.getExecutiveSummary();

    const pulse =
      BIK.getBusinessPulse();

    const fastMovers =
      BIK.getFastMovers(5);

    const topProfit =
      BIK.getTopProfitProducts(5);

    const deadStock =
      BIK.getDeadStock(30)
         .slice(0, 5);

    const reorder =
      BIK.getReorderRecommendations()
         .slice(0, 5);

    const alerts =
      BIK.getOperationalAlerts();

    const insights =
      BIK.generateInsights();

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
        <!-- EXECUTIVE METRICS -->
        <!-- ================================= -->

        <div class="analytics-grid">

          ${metricCard(
            "Revenue",
            money(summary.revenue)
          )}

          ${metricCard(
            "Profit",
            money(summary.profit)
          )}

          ${metricCard(
            "Inventory Value",
            money(summary.inventoryValue)
          )}

          ${metricCard(
            "Potential Profit",
            money(summary.potentialProfit)
          )}

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

            Health:
            ${pulse.health}

            |

            Momentum:
            ${pulse.momentum}

            |

            Alerts:
            ${pulse.alerts}

          </div>

        </div>

        <!-- ================================= -->
        <!-- PRODUCT INTELLIGENCE -->
        <!-- ================================= -->

        <div class="analytics-section-title">
          Product Intelligence
        </div>

        <div class="analytics-panels">

          ${listSection(

            "Fast Movers",

            fastMovers,

            item => `

              <div class="analytics-row">

                <span>
                  ${item.name}
                </span>

                <span>
                  ${item.quantitySold}
                </span>

              </div>
            `
          )}

          ${listSection(

            "Top Profit",

            topProfit,

            item => `

              <div class="analytics-row">

                <span>
                  ${item.name}
                </span>

                <span>
                  ${money(item.profit)}
                </span>

              </div>
            `
          )}

        </div>

        <!-- ================================= -->
        <!-- RISK INTELLIGENCE -->
        <!-- ================================= -->

        <div class="analytics-section-title">
          Risk Intelligence
        </div>

        <div class="analytics-panels">

          ${listSection(

            "Dead Stock",

            deadStock,

            item => `

              <div class="analytics-row">

                <span>
                  ${item.name}
                </span>

                <span>
                  Stock:
                  ${item.stock}
                </span>

              </div>
            `
          )}

          ${listSection(

            "Reorder Risk",

            reorder,

            item => `

              <div class="analytics-row">

                <span>
                  ${item.name}
                </span>

                <span>
                  ${item.daysRemaining}
                  days
                </span>

              </div>
            `
          )}

        </div>

        <!-- ================================= -->
        <!-- ALERTS -->
        <!-- ================================= -->

        <div class="analytics-section-title">
          Operational Alerts
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

              : `

                  <div class="analytics-empty">
                    No active alerts
                  </div>

                `
            }

          </div>

        </div>

        <!-- ================================= -->
        <!-- INSIGHTS -->
        <!-- ================================= -->

        <div class="analytics-section-title">
          Business Insights
        </div>

        <div class="analytics-panel">

          <div class="panel-body">

            ${
              insights.length

              ? insights.map(insight => `

                  <div class="insight-item">

                    <div class="insight-title">
                      ${insight.title}
                    </div>

                    <div class="insight-message">
                      ${insight.message}
                    </div>

                  </div>

                `).join("")

              : `

                  <div class="analytics-empty">
                    No insights available
                  </div>

                `
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

    Bus.on(
      "sales:updated",
      render,
      "analytics"
    );

    Bus.on(
      "inventory:updated",
      render,
      "analytics"
    );
  }

  // =========================================
  // CLEANUP
  // =========================================
  function cleanup() {

    Bus.clearModule(
      "analytics"
    );

    container.innerHTML = "";
  }

  return {

    mount,
    cleanup
  };

});