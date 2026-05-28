// ===== moduleReceipts.js (KANINI SHOP DYNAMIC RECEIPT ENGINE v3) =====

ModuleLoader.register("receipts", function () {

  // =========================================
  // ROOT
  // =========================================
  const moduleContainer =
    document.getElementById("moduleContainer");

  if (!moduleContainer) {
    console.error("❌ moduleContainer missing");
    return;
  }

  // =========================================
  // STATE
  // =========================================
  let sales = [];

  // =========================================
  // INIT
  // =========================================
  init();

  function init() {

    loadSales();

    render();

    bindGlobalEvents();
  }

  // =========================================
  // LOAD SALES
  // =========================================
  function loadSales() {

    sales =
      DataService.getSalesHistory()
      .reverse();
  }

  // =========================================
  // RENDER
  // =========================================
  function render() {

    moduleContainer.innerHTML = `

      <section class="module-page fade-in">

        <!-- HEADER -->
        <div class="page-header">

          <div>

            <h2>Receipts</h2>

            <p>
              Dynamic receipt rendering system
            </p>

          </div>

        </div>

        <!-- RECEIPTS -->
        <div
          class="receipts-grid"
          id="receiptsGrid"
        ></div>

      </section>
    `;

    renderReceipts();
  }

  // =========================================
  // RENDER RECEIPTS
  // =========================================
  function renderReceipts() {

    const grid =
      document.getElementById(
        "receiptsGrid"
      );

    if (!grid) return;

    // EMPTY
    if (!sales.length) {

      grid.innerHTML = `

        <div class="empty-state">

          <h3>No Receipts Found</h3>

          <p>
            Completed sales will appear here
          </p>

        </div>
      `;

      return;
    }

    // SALES RECEIPTS
    grid.innerHTML = sales.map(sale => {

      const totalItems =
        sale.items.reduce(
          (sum, item) =>
            sum + Number(item.qty),
          0
        );

      return `

        <div class="receipt-card">

          <!-- TOP -->
          <div class="receipt-top">

            <div>

              <h3>
                ${sale.saleId}
              </h3>

              <small>
                ${formatDate(
                  sale.timestamp
                )}
              </small>

            </div>

            <div class="receipt-total">

              KES
              ${sale.totals.subtotal}

            </div>

          </div>

          <!-- ITEMS -->
          <div class="receipt-items">

            ${sale.items.map(item => `

              <div class="receipt-item-row">

                <div>

                  <strong>
                    ${item.productName}
                  </strong>

                  <small>
                    ${item.qty} ×
                    ${item.sellingPrice}
                  </small>

                </div>

                <strong>
                  KES ${item.subtotal}
                </strong>

              </div>

            `).join("")}

          </div>

          <!-- SUMMARY -->
          <div class="receipt-summary">

            <div class="summary-row">
              <span>Items</span>
              <strong>${totalItems}</strong>
            </div>

            <div class="summary-row">
              <span>Paid</span>
              <strong>
                KES ${sale.totals.paid}
              </strong>
            </div>

            <div class="summary-row">
              <span>Change</span>
              <strong>
                KES ${sale.totals.change}
              </strong>
            </div>

            <div class="summary-row">
              <span>Profit</span>
              <strong>
                KES ${sale.totals.profit}
              </strong>
            </div>

          </div>

          <!-- ACTIONS -->
          <div class="receipt-actions">

            <button
              class="print-btn"
              data-id="${sale.saleId}"
            >
              Print Receipt
            </button>

            <button
              class="view-btn"
              data-id="${sale.saleId}"
            >
              View Full
            </button>

          </div>

        </div>
      `;

    }).join("");

    bindReceiptActions();
  }

  // =========================================
  // ACTIONS
  // =========================================
  function bindReceiptActions() {

    // PRINT
    document.querySelectorAll(
      ".print-btn"
    ).forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const saleId =
            button.dataset.id;

          printReceipt(saleId);
        }
      );
    });

    // VIEW
    document.querySelectorAll(
      ".view-btn"
    ).forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const saleId =
            button.dataset.id;

          showReceiptDetails(saleId);
        }
      );
    });
  }

  // =========================================
  // PRINT RECEIPT
  // =========================================
  function printReceipt(saleId) {

    const sale = sales.find(
      s => s.saleId === saleId
    );

    if (!sale) return;

    const receiptWindow =
      window.open("", "_blank");

    receiptWindow.document.write(`

      <html>

        <head>

          <title>
            Receipt ${sale.saleId}
          </title>

          <style>

            body {
              font-family: Arial;
              padding: 20px;
            }

            h2 {
              margin-bottom: 5px;
            }

            .line {
              border-bottom:
                1px dashed #999;
              margin: 10px 0;
            }

            .row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
            }

          </style>

        </head>

        <body>

          <h2>Kanini Shop POS</h2>

          <p>
            Receipt:
            ${sale.saleId}
          </p>

          <p>
            ${formatDate(
              sale.timestamp
            )}
          </p>

          <div class="line"></div>

          ${sale.items.map(item => `

            <div class="row">

              <span>
                ${item.productName}
                (${item.qty})
              </span>

              <strong>
                KES ${item.subtotal}
              </strong>

            </div>

          `).join("")}

          <div class="line"></div>

          <div class="row">
            <span>Total</span>
            <strong>
              KES ${sale.totals.subtotal}
            </strong>
          </div>

          <div class="row">
            <span>Paid</span>
            <strong>
              KES ${sale.totals.paid}
            </strong>
          </div>

          <div class="row">
            <span>Change</span>
            <strong>
              KES ${sale.totals.change}
            </strong>
          </div>

          <div class="line"></div>

          <p>
            Thank you for shopping!
          </p>

        </body>

      </html>
    `);

    receiptWindow.document.close();

    receiptWindow.print();
  }

  // =========================================
  // RECEIPT DETAILS
  // =========================================
  function showReceiptDetails(saleId) {

    const sale = sales.find(
      s => s.saleId === saleId
    );

    if (!sale) return;

    alert(`

Receipt:
${sale.saleId}

Items:
${sale.items.length}

Total:
KES ${sale.totals.subtotal}

Profit:
KES ${sale.totals.profit}

Date:
${formatDate(sale.timestamp)}

    `);
  }

  // =========================================
  // HELPERS
  // =========================================
  function formatDate(timestamp) {

    return new Date(timestamp)
      .toLocaleString();
  }

  // =========================================
  // EVENTS
  // =========================================
  function bindGlobalEvents() {

    window.addEventListener(
      "salesUpdated",
      () => {

        loadSales();

        renderReceipts();
      }
    );
  }

});