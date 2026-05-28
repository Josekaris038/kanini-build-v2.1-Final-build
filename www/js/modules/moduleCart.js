// ===== moduleCart.js (KANINI CART MODULE v10 KERNEL CLEAN CORE) =====

ModuleLoader.register("cart", function () {

  const container = document.querySelector("#moduleContainer");
  if (!container) {
    console.error("[CartModule] Missing container");
    return;
  }

  const Cart = window.CartStore;

  let active = true;
  let renderTimer = null;

  // ===============================
  // TOAST
  // ===============================
  const UI = {

    toast(msg) {
      const el = document.createElement("div");
      el.textContent = msg;

      Object.assign(el.style, {
        position: "fixed",
        bottom: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "#111",
        color: "#fff",
        padding: "12px 16px",
        borderRadius: "10px",
        zIndex: 999999,
        fontSize: "14px",
        border: "1px solid #333"
      });

      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2000);
    }
  };

  // ===============================
  // RENDER SCHEDULER
  // ===============================
  function requestRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 30);
  }

  // ===============================
  // LAYOUT
  // ===============================
  function renderLayout() {

    container.innerHTML = `
      <div class="cart-module fade-in">

        <div class="cart-header">
          <h2 class="module-title">Shopping Cart</h2>
          <p class="module-subtitle">Review items before checkout</p>
        </div>

        <div class="cart-table-wrapper">
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
            <tbody></tbody>
          </table>
        </div>

        <div class="cart-summary-card">
          <div class="cart-summary-top">

            <div>
              <div class="summary-label">Grand Total</div>
              <div id="total">KES 0</div>
            </div>

            <button id="checkoutBtn" class="gold-btn premium-checkout-btn">
              Checkout
            </button>

          </div>
        </div>

      </div>
    `;
  }

  // ===============================
  // CORE RENDER
  // ===============================
  function render() {

    if (!active) return;

    renderLayout();

    const tbody = container.querySelector("tbody");
    const totalEl = container.querySelector("#total");

    const cart = Cart.getCart();
    let total = 0;

    if (!cart.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;padding:25px;color:#888;">
            Cart is empty
          </td>
        </tr>
      `;
      totalEl.textContent = "KES 0";
      bindEvents();
      return;
    }

    tbody.innerHTML = cart.map(item => {

      const rowTotal = item.qty * item.price;
      total += rowTotal;

      return `
        <tr>
          <td>${item.name}</td>
          <td>KES ${item.price.toLocaleString()}</td>

          <td>
            <button class="minus gold-btn" data-id="${item.id}">−</button>
            ${item.qty}
            <button class="plus gold-btn" data-id="${item.id}">+</button>
          </td>

          <td>KES ${rowTotal.toLocaleString()}</td>

          <td>
            <button class="remove gold-btn" data-id="${item.id}">
              Remove
            </button>
          </td>
        </tr>
      `;
    }).join("");

    totalEl.textContent = `KES ${total.toLocaleString()}`;

    bindEvents();
  }

  // ===============================
  // EVENTS (NO EVENTKERNEL RELIANCE)
  // ===============================
  function bindEvents() {

    container.onclick = (e) => {

      const id = e.target.dataset.id;

      // PLUS
      if (e.target.classList.contains("plus")) {
        const item = Cart.getCart().find(i => i.id === id);
        if (!item) return;

        Cart.add(item, 1);
        requestRender();
        return;
      }

      // MINUS
      if (e.target.classList.contains("minus")) {
        const item = Cart.getCart().find(i => i.id === id);
        if (!item) return;

        Cart.update(id, item.qty - 1);
        requestRender();
        return;
      }

      // REMOVE
      if (e.target.classList.contains("remove")) {
        Cart.remove(id);
        UI.toast("Item removed");
        requestRender();
        return;
      }

      // CHECKOUT
      if (e.target.id === "checkoutBtn") {
        openCheckout();
      }
    };
  }

  // ===============================
  // CHECKOUT
  // ===============================
  function openCheckout() {

    const cart = Cart.getCart();

    const total = cart.reduce(
      (sum, i) => sum + i.qty * i.price,
      0
    );

    const modal = document.createElement("div");

    modal.id = "checkoutOverlay";

    modal.innerHTML = `
      <div class="checkout-modal fade-in">

        <h3>Confirm Checkout</h3>
        <p>Complete this sale?</p>

        <div class="checkout-total">
          KES ${total.toLocaleString()}
        </div>

        <div class="checkout-actions">
          <button id="cancel" class="toggle-form-btn">Cancel</button>
          <button id="confirm" class="gold-btn">Confirm</button>
        </div>

      </div>
    `;

    Object.assign(modal.style, {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,.7)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 999999
    });

    document.body.appendChild(modal);

    modal.querySelector("#cancel").onclick = () => modal.remove();

    modal.querySelector("#confirm").onclick = () => {

      if (!cart.length) {
        UI.toast("Cart is empty");
        return;
      }

      try {

        window.DataService.createSale(cart, 0);

        Cart.clear();

        UI.toast("Sale completed");

        modal.remove();
        requestRender();

      } catch (err) {
        UI.toast(err.message || "Checkout failed");
      }
    };
  }

  // ===============================
  // INIT
  // ===============================
  function init() {
    render();
  }

  init();

  return function cleanup() {
    active = false;
    container.innerHTML = "";
  };

});
