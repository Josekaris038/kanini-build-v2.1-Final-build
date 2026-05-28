// ===== moduleMakesale.js (KANINI MAKE SALE MODULE v15 REALIGNED STABLE CHECKOUT) =====

ModuleLoader.register("makesale", function () {

  const container = document.querySelector("#moduleContainer");

  const Cart = window.CartStore;
  const Transaction = window.TransactionKernel;
  const Data = window.DataService;

  let inventory = [];
  let active = true;

  // ===============================
  // UI
  // ===============================
  const UI = {

    toast(msg) {

      const el = document.createElement("div");

      Object.assign(el.style, {
        position: "fixed",
        bottom: "18px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "#111",
        color: "#fff",
        padding: "10px 14px",
        borderRadius: "10px",
        fontSize: "13px",
        zIndex: 999999,
        border: "1px solid #333",
        transition: "opacity 0.2s ease"
      });

      el.textContent = msg;

      document.body.appendChild(el);

      setTimeout(() => {
        el.style.opacity = "0";
      }, 1800);

      setTimeout(() => {
        el.remove();
      }, 2200);
    }
  };

  // ===============================
  // HELPERS
  // ===============================
  const getCart = () => Cart.getCart();

  const getInventory = () =>
    Data.getProducts() || [];

  // ===============================
  // PREVIEW SALE BUILDER
  // ===============================
  function buildPreviewSale(cart) {

    const subtotal = cart.reduce(
      (sum, item) =>
        sum + (item.qty * item.price),
      0
    );

    return {
      saleId: "PENDING",
      timestamp: Date.now(),

      items: cart.map(item => ({
        name: item.name,
        qty: item.qty,
        sellingPrice: item.price,
        subtotal: item.qty * item.price
      })),

      totals: {
        subtotal
      }
    };
  }

  // ===============================
  // RENDER
  // ===============================
  function render() {

    if (!active || !container) return;

    const cart = getCart();

    let total = 0;

    const rows = cart.map(item => {

      const rowTotal =
        item.qty * item.price;

      total += rowTotal;

      return `
        <tr>
          <td>${item.name}</td>

          <td>
            KES ${item.price}
          </td>

          <td>
            <button
              class="minus gold-btn"
              data-id="${item.id}"
            >
              -
            </button>

            ${item.qty}

            <button
              class="plus gold-btn"
              data-id="${item.id}"
            >
              +
            </button>
          </td>

          <td>
            KES ${rowTotal}
          </td>

          <td>
            <button
              class="remove gold-btn"
              data-id="${item.id}"
            >
              Remove
            </button>
          </td>
        </tr>
      `;
    }).join("");

    container.innerHTML = `
      <div class="make-sale-wrapper">

        <h2 class="module-title">
          Make Sale
        </h2>

        <div class="inventory-search-box">

          <input
            id="saleSearch"
            placeholder="Search product..."
          />

          <div
            id="results"
            class="search-results"
            style="display:none;"
          ></div>

        </div>

        <div class="table-wrapper">

          <table>

            <thead>
              <tr>
                <th>Item</th>
                <th>Price</th>
                <th>Qty</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              ${rows}
            </tbody>

          </table>

        </div>

        <div class="cart-summary">

          <h3>
            Total:
            KES
            <span id="total">
              ${total}
            </span>
          </h3>

          <button
            id="checkoutBtn"
            class="gold-btn"
          >
            Checkout
          </button>

        </div>

        <!-- RECEIPT -->
        <div
          id="receipt"
          class="receipt-modal"
          style="display:none;"
        >
          <div class="receipt-box">
            <div id="receiptBox"></div>
          </div>
        </div>

      </div>
    `;

    bindSearch();
  }

  // ===============================
  // SEARCH
  // ===============================
  function bindSearch() {

    const search =
      container.querySelector("#saleSearch");

    const results =
      container.querySelector("#results");

    search.oninput = (e) => {

      const q =
        e.target.value
          .toLowerCase()
          .trim();

      results.innerHTML = "";

      results.style.display =
        q ? "block" : "none";

      if (!q) return;

      getInventory()
        .filter(p =>
          p.name
            .toLowerCase()
            .includes(q) ||

          (p.barcode || "")
            .toLowerCase()
            .includes(q)
        )
        .forEach(item => {

          const div =
            document.createElement("div");

          div.innerHTML = `
            <div>
              <strong>
                ${item.name}
              </strong>

              <br>

              <small>
                KES ${item.sellingPrice}
                •
                Stock ${item.stock}
              </small>
            </div>

            <button class="gold-btn">
              Add
            </button>
          `;

          div.querySelector("button").onclick = () => {

            if (item.stock <= 0) {
              return UI.toast("Out of stock");
            }

            Cart.add(item, 1);

            UI.toast(
              `${item.name} added`
            );

            results.style.display = "none";

            search.value = "";

            render();
          };

          results.appendChild(div);
        });
    };
  }

  // ===============================
  // EVENTS
  // ===============================
  function bindEvents() {

    container.onclick = (e) => {

      if (!active) return;

      const id =
        e.target.dataset.id;

      // ===============================
      // PLUS
      // ===============================
      if (
        e.target.classList.contains("plus")
      ) {

        const item =
          Cart.getCart()
            .find(i => i.id === id);

        if (item) {
          Cart.add(item, 1);
        }

        render();
      }

      // ===============================
      // MINUS
      // ===============================
      if (
        e.target.classList.contains("minus")
      ) {

        Cart.decrement(id);

        render();
      }

      // ===============================
      // REMOVE
      // ===============================
      if (
        e.target.classList.contains("remove")
      ) {

        Cart.remove(id);

        render();
      }

      // ===============================
      // CHECKOUT PREVIEW
      // ===============================
      if (
        e.target.id === "checkoutBtn"
      ) {

        openReceiptPreview();
      }

      // ===============================
      // CANCEL
      // ===============================
      if (
        e.target.id === "cancelSaleBtn"
      ) {

        closeReceipt();
      }

      // ===============================
      // CONFIRM SALE
      // ===============================
      if (
        e.target.id === "confirmSaleBtn"
      ) {

        try {

          Transaction.createSale();

          closeReceipt();

          render();

          UI.toast(
            "Sale completed"
          );

        } catch (err) {

          UI.toast(
            err.message ||
            "Checkout failed"
          );
        }
      }
    };
  }

  // ===============================
  // RECEIPT PREVIEW
  // ===============================
  function openReceiptPreview() {

    const cart = getCart();

    if (!cart.length) {
      return UI.toast(
        "Cart is empty"
      );
    }

    try {

      const previewSale =
        buildPreviewSale(cart);

      showReceipt(previewSale);

    } catch (err) {

      UI.toast(
        err.message ||
        "Failed to preview receipt"
      );
    }
  }

  // ===============================
  // CLOSE RECEIPT
  // ===============================
  function closeReceipt() {

    const modal =
      container.querySelector("#receipt");

    if (modal) {
      modal.style.display = "none";
    }
  }

  // ===============================
  // RECEIPT
  // ===============================
  function showReceipt(sale) {

    const box =
      container.querySelector("#receiptBox");

    const modal =
      container.querySelector("#receipt");

    const date =
      new Date(sale.timestamp)
        .toLocaleString();

    let html = `
      <div style="
        background:#0a0a0a;
        color:#eaeaea;
        padding:18px;
        border-radius:14px;
        border:1px solid #222;
        font-family:system-ui;
      ">

        <!-- HEADER -->
        <div style="
          text-align:center;
          margin-bottom:10px;
        ">

          <div style="
            font-size:18px;
            font-weight:700;
            color:#d4af37;
          ">
            KANINI SHOP
          </div>

          <div style="
            font-size:11px;
            color:#777;
          ">
            Official Receipt
          </div>

        </div>

        <!-- META -->
        <div style="
          display:flex;
          justify-content:space-between;
          font-size:11px;
          color:#888;
          margin-bottom:10px;
        ">
          <span>${sale.saleId}</span>
          <span>${date}</span>
        </div>

        <div style="
          border-top:1px dashed #333;
          margin:10px 0;
        "></div>
    `;

    sale.items.forEach(i => {

      html += `
        <div style="
          display:flex;
          justify-content:space-between;
          margin:8px 0;
        ">

          <div>

            <div style="
              font-weight:600;
              color:#eee;
            ">
              ${i.name}
            </div>

            <div style="
              font-size:11px;
              color:#777;
            ">
              ${i.qty} × ${i.sellingPrice}
            </div>

          </div>

          <div style="
            font-weight:600;
            color:#d4af37;
          ">
            KES ${i.subtotal}
          </div>

        </div>
      `;
    });

    html += `
      <div style="
        border-top:1px dashed #333;
        margin:12px 0;
      "></div>

      <div style="
        display:flex;
        justify-content:space-between;
        font-size:16px;
        font-weight:700;
        color:#d4af37;
      ">

        <span>TOTAL</span>

        <span>
          KES ${sale.totals.subtotal}
        </span>

      </div>

      <div style="
        text-align:center;
        font-size:11px;
        color:#777;
        margin-top:6px;
      ">
        Confirm to complete transaction
      </div>

      <!-- ACTIONS -->
      <div style="
        display:flex;
        gap:10px;
        margin-top:14px;
      ">

        <button
          id="confirmSaleBtn"
          style="
            flex:1;
            background:#1f7a1f;
            color:#fff;
            padding:12px;
            border:none;
            border-radius:10px;
          "
        >
          Confirm Sale
        </button>

        <button
          id="cancelSaleBtn"
          style="
            flex:1;
            background:#333;
            color:#ccc;
            padding:12px;
            border:none;
            border-radius:10px;
          "
        >
          Back
        </button>

      </div>

      <!-- CALCULATOR -->
      <div style="
        margin-top:14px;
        padding-top:10px;
        border-top:1px solid #222;
      ">

        <label style="
          font-size:11px;
          color:#777;
        ">
          Cash Received
        </label>

        <input
          id="paymentInput"
          type="number"
          placeholder="0"
          style="
            width:100%;
            margin-top:6px;
            padding:10px;
            border-radius:8px;
            background:#000;
            color:#fff;
            border:1px solid #222;
          "
        />

        <div style="
          margin-top:10px;
          font-size:13px;
        ">

          Change:

          <strong style="
            color:#00ff99;
          ">
            KES
            <span id="changeDisplay">
              0
            </span>
          </strong>

        </div>

      </div>

      </div>
    `;

    box.innerHTML = html;

    modal.style.display = "flex";

    setupCalculator(sale);
  }

  // ===============================
  // CALCULATOR
  // ===============================
  function setupCalculator(sale) {

    const input =
      container.querySelector("#paymentInput");

    const changeEl =
      container.querySelector("#changeDisplay");

    if (!input || !changeEl) return;

    input.oninput = (e) => {

      const paid =
        Number(e.target.value || 0);

      const change =
        paid - sale.totals.subtotal;

      changeEl.textContent =
        change > 0
          ? change
          : 0;
    };
  }

  // ===============================
  // INIT
  // ===============================
  function init() {

    inventory = getInventory();

    render();

    bindEvents();
  }

  init();

  // ===============================
  // CLEANUP
  // ===============================
  return function cleanup() {

    active = false;

    container.innerHTML = "";
  };

});

