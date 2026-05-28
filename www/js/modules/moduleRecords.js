// ===== moduleRecords.js (KANINI RECORDS v14 - CLEAN RECEIPT UI RESTORED) =====

function moduleRecords() {

  const Records = () => window.RecordsKernel;

  let root = null;
  let state = "home";
  let searchQuery = "";
  let selectedSale = null;

  // ===============================
  // FORMATTERS
  // ===============================
  const money = v =>
    `KES ${Number(v || 0).toLocaleString()}`;

  const formatDate = t =>
    t ? new Date(t).toLocaleString() : "-";

  const q = () => searchQuery.trim().toLowerCase();

  // ===============================
  // SEARCH
  // ===============================
  function saleText(s) {
    return (
      s.saleId +
      " " +
      s.timestamp +
      " " +
      (s.items || []).map(i => i.name).join(" ")
    ).toLowerCase();
  }

  // ===============================
  // HOME
  // ===============================
  function renderHome() {
    return `
      <div class="records-tiles">

        <div class="record-tile" data-view="sales">
          💰 Sales Records
        </div>

        <div class="record-tile" data-view="inventory">
          📦 Inventory Records
        </div>

        <div class="record-tile" data-view="receipts">
          🧾 Receipts
        </div>

      </div>
    `;
  }

  // ===============================
  // SEARCH BAR
  // ===============================
  function renderSearchBar() {
    return `
      <div class="records-search">
        <input id="records-search" placeholder="Search records..." />
      </div>
    `;
  }

  const backBtn = () => `
    <button class="toggle-form-btn" id="records-back">← Back</button>
  `;

  // ===============================
  // SALES TABLE (CLEAN COUNT ONLY)
  // ===============================
  function renderSalesTable() {

    let sales = Records().getSales();

    if (q()) {
      sales = sales.filter(s => saleText(s).includes(q()));
    }

    return `
      <table class="records-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Items</th>
            <th>Total</th>
          </tr>
        </thead>

        <tbody>
          ${sales.map(s => `
            <tr class="sale-row" data-id="${s.saleId}">
              <td>${formatDate(s.timestamp)}</td>
              <td>${(s.items || []).length}</td>
              <td>${money(s.totals.subtotal)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  // ===============================
  // INVENTORY
  // ===============================
  function renderInventoryTable() {

    let moves = Records().getInventoryMovements();

    if (q()) {
      moves = moves.filter(m =>
        (m.type + m.productName + m.productId + m.timestamp)
          .toLowerCase()
          .includes(q())
      );
    }

    return `
      <table class="records-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Product</th>
            <th>Qty</th>
            <th>Date</th>
          </tr>
        </thead>

        <tbody>
          ${moves.map(m => `
            <tr>
              <td>${m.type}</td>
              <td>${m.productName || m.productId}</td>
              <td>${m.qty}</td>
              <td>${formatDate(m.timestamp)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  // ===============================
  // RECEIPTS TABLE
  // ===============================
  function renderReceiptsTable() {

    let sales = Records().getSales();

    if (q()) {
      sales = sales.filter(s => saleText(s).includes(q()));
    }

    return `
      <table class="records-table">
        <thead>
          <tr>
            <th>Receipt ID</th>
            <th>Date</th>
            <th>Total</th>
          </tr>
        </thead>

        <tbody>
          ${sales.map(s => `
            <tr>
              <td>${s.saleId}</td>
              <td>${formatDate(s.timestamp)}</td>
              <td>${money(s.totals.subtotal)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  // ===============================
  // SALE DETAIL (CLEAN RECEIPT MODE)
  // ===============================
  function renderSaleDetail() {

    const s = selectedSale;

    if (!s) return `<div class="empty-mini">No sale selected</div>`;

    return `
      ${backBtn()}

      <div class="form-container">

        <h3>Sale Receipt</h3>

        <div><strong>Date:</strong> ${formatDate(s.timestamp)}</div>
        <div><strong>Sale ID:</strong> ${s.saleId}</div>

        <table class="records-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>

          <tbody>
            ${(s.items || []).map(i => `
              <tr>
                <td>${i.name}</td>
                <td>${i.qty}</td>
                <td>${money(i.sellingPrice)}</td>
                <td>${money(i.subtotal)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div class="cart-summary">
          <div><strong>Total:</strong> ${money(s.totals.subtotal)}</div>
          <div><strong>Profit:</strong> ${money(s.totals.profit)}</div>
          <div><strong>Paid:</strong> ${money(s.totals.paid)}</div>
        </div>

      </div>
    `;
  }

  // ===============================
  // ROUTER
  // ===============================
  function render() {

    if (!root) return;

    let view = "";

    if (state === "home") view = renderHome();

    if (state === "sales") {
      view = `
        ${backBtn()}
        ${renderSearchBar()}
        <div id="table-area">${renderSalesTable()}</div>
      `;
    }

    if (state === "inventory") {
      view = `
        ${backBtn()}
        ${renderSearchBar()}
        <div id="table-area">${renderInventoryTable()}</div>
      `;
    }

    if (state === "receipts") {
      view = `
        ${backBtn()}
        ${renderSearchBar()}
        <div id="table-area">${renderReceiptsTable()}</div>
      `;
    }

    if (state === "sale-detail") {
      view = renderSaleDetail();
    }

    root.innerHTML = `
      <div class="records-module">
        <div class="module-header">
          <h1>Records & History</h1>
        </div>
        ${view}
      </div>
    `;
  }

  // ===============================
  // EVENTS
  // ===============================
  function bindEvents() {

    if (!root) return;

    root.onclick = (e) => {

      if (e.target.id === "records-back") {
        state = (state === "sale-detail") ? "sales" : "home";
        render();
        bindEvents();
        return;
      }

      const tile = e.target.closest(".record-tile");
      if (tile) {
        state = tile.dataset.view;
        render();
        bindEvents();
        return;
      }

      const row = e.target.closest(".sale-row");
      if (row) {

        selectedSale = Records()
          .getSales()
          .find(s => s.saleId === row.dataset.id);

        state = "sale-detail";
        render();
        bindEvents();
        return;
      }
    };

    setTimeout(() => {

      const input = root.querySelector("#records-search");
      const tableArea = root.querySelector("#table-area");

      if (!input || !tableArea) return;

      input.value = searchQuery;

      input.oninput = (e) => {
        searchQuery = e.target.value;

        if (state === "sales") {
          tableArea.innerHTML = renderSalesTable();
        }

        if (state === "inventory") {
          tableArea.innerHTML = renderInventoryTable();
        }

        if (state === "receipts") {
          tableArea.innerHTML = renderReceiptsTable();
        }
      };

    }, 0);
  }

  // ===============================
  // LIFECYCLE
  // ===============================
  function mount(container) {
    root = container;
    render();
    bindEvents();
  }

  function unmount() {
    if (root) root.innerHTML = "";
    root = null;
  }

  return { mount, unmount };
}