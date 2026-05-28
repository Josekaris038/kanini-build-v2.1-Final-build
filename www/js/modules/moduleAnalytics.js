// ===== moduleRecords.js (KANINI RECORDS CENTER v1 STABLE ARCHITECTURE) =====

ModuleLoader.register("records", function (ctx) {

  // ===============================
  // DEPENDENCIES
  // ===============================
  const container = ctx.container;
  const Data = ctx.data;
  const Bus = ctx.bus;

  if (!container) {
    console.error("❌ Records container missing");
    return;
  }

  // ===============================
  // STATE
  // ===============================
  const State = {
    activeTab: "sales",
    search: "",
    sales: [],
    inventoryLogs: []
  };

  // ===============================
  // INIT
  // ===============================
  init();

  function init() {

    loadData();

    render();

    bindEvents();

    attachBusListeners();
  }

  // ===============================
  // LOAD DATA
  // ===============================
  function loadData() {

    try {

      State.sales =
        Data.getSalesHistory
          ? Data.getSalesHistory().slice().reverse()
          : [];

      State.inventoryLogs =
        Data.getInventoryLogs
          ? Data.getInventoryLogs().slice().reverse()
          : [];

    } catch (err) {

      console.error(
        "❌ Failed loading records:",
        err
      );

      State.sales = [];
      State.inventoryLogs = [];
    }
  }

  // ===============================
  // MAIN RENDER
  // ===============================
  function render() {

    container.innerHTML = `

      <div class="records-wrapper fade-in">

        <!-- HEADER -->
        <div class="records-header">

          <div>
            <h2 class="module-title">
              Records Center
            </h2>

            <p class="module-subtitle">
              Sales history and inventory activity
            </p>
          </div>

        </div>

        <!-- SEARCH -->
        <div class="inventory-search-box">

          <input
            type="text"
            id="recordsSearch"
            placeholder="Search records..."
            value="${State.search}"
          >

        </div>

        <!-- TABS -->
        <div class="records-tabs">

          <button
            class="toggle-form-btn ${State.activeTab === "sales" ? "active-tab" : ""}"
            data-tab="sales"
          >
            Sales
          </button>

          <button
            class="toggle-form-btn ${State.activeTab === "inventory" ? "active-tab" : ""}"
            data-tab="inventory"
          >
            Inventory Logs
          </button>

          <button
            class="toggle-form-btn ${State.activeTab === "receipts" ? "active-tab" : ""}"
            data-tab="receipts"
          >
            Receipts
          </button>

        </div>

        <!-- CONTENT -->
        <div class="records-content">

          ${renderContent()}

        </div>

      </div>

    `;
  }

  // ===============================
  // CONTENT ROUTER
  // ===============================
  function renderContent() {

    switch (State.activeTab) {

      case "sales":
        return renderSales();

      case "inventory":
        return renderInventoryLogs();

      case "receipts":
        return renderReceipts();

      default:
        return renderSales();
    }
  }

  // ===============================
  // SALES VIEW
  // ===============================
  function renderSales() {

    const query =
      State.search.trim().toLowerCase();

    const filtered = State.sales.filter(sale => {

      return (
        !query ||

        String(sale.id || "")
          .toLowerCase()
          .includes(query)

        ||

        String(sale.date || "")
          .toLowerCase()
          .includes(query)
      );

    });

    if (!filtered.length) {

      return `

        <div class="empty-state">
          No sales records found
        </div>

      `;
    }

    return filtered.map(sale => {

      const total =
        Number(sale.total || 0);

      const items =
        sale.items?.length || 0;

      return `

        <div class="record-card">

          <div class="record-top">

            <div>

              <div class="record-title">
                Receipt #${sale.id || "N/A"}
              </div>

              <div class="record-date">
                ${sale.date || ""}
              </div>

            </div>

            <div class="record-amount">
              KES ${total.toLocaleString()}
            </div>

          </div>

          <div class="record-meta">
            ${items} item(s)
          </div>

        </div>

      `;

    }).join("");
  }

  // ===============================
  // INVENTORY LOGS
  // ===============================
  function renderInventoryLogs() {

    const query =
      State.search.trim().toLowerCase();

    const filtered =
      State.inventoryLogs.filter(log => {

        return (
          !query ||

          String(log.itemName || "")
            .toLowerCase()
            .includes(query)
        );

      });

    if (!filtered.length) {

      return `

        <div class="empty-state">
          No inventory logs found
        </div>

      `;
    }

    return filtered.map(log => {

      return `

        <div class="record-card">

          <div class="record-top">

            <div>

              <div class="record-title">
                ${log.itemName || "Inventory Item"}
              </div>

              <div class="record-date">
                ${log.date || ""}
              </div>

            </div>

            <div class="record-amount">
              +${log.quantity || 0}
            </div>

          </div>

          <div class="record-meta">

            Updated Stock

          </div>

        </div>

      `;

    }).join("");
  }

  // ===============================
  // RECEIPTS
  // ===============================
  function renderReceipts() {

    return `

      <div class="empty-state">
        Receipt archive coming soon
      </div>

    `;
  }

  // ===============================
  // BIND EVENTS
  // ===============================
  function bindEvents() {

    // SEARCH
    const searchInput =
      document.getElementById("recordsSearch");

    if (searchInput) {

      searchInput.addEventListener("input", e => {

        State.search = e.target.value;

        render();

        bindEvents();
      });
    }

    // TABS
    document
      .querySelectorAll("[data-tab]")
      .forEach(btn => {

        btn.addEventListener("click", () => {

          const tab =
            btn.dataset.tab;

          if (!tab) return;

          State.activeTab = tab;

          render();

          bindEvents();
        });

      });

  }

  // ===============================
  // EVENT BUS LISTENERS
  // ===============================
  function attachBusListeners() {

    if (!Bus) return;

    Bus.on("sale:created", refresh);

    Bus.on("inventory:updated", refresh);
  }

  // ===============================
  // REFRESH
  // ===============================
  function refresh() {

    loadData();

    render();

    bindEvents();
  }

  // ===============================
  // CLEANUP
  // ===============================
  return {

    destroy() {

      console.log(
        "🧹 Records module destroyed"
      );

    }

  };

});