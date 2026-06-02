// ===== moduleCart.js (KANINI CART MODULE v16 KERNEL ALIGNED CART MANAGER) =====

ModuleLoader.register("cart", function () {

  let container = null;
  let active = false;
  let renderTimer = null;

  const Cart = window.CartStore;
  const Router = window.Router;

  // =====================================
  // UI
  // =====================================
  const UI = {

    toast(message) {

      const el = document.createElement("div");

      Object.assign(el.style, {
        position: "fixed",
        bottom: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "#111",
        color: "#fff",
        padding: "12px 16px",
        borderRadius: "10px",
        border: "1px solid #333",
        zIndex: 999999,
        fontSize: "14px"
      });

      el.textContent = message;

      document.body.appendChild(el);

      setTimeout(() => {
        el.remove();
      }, 2000);
    }
  };

  // =====================================
  // RENDER SCHEDULER
  // =====================================
  function requestRender() {

    clearTimeout(renderTimer);

    renderTimer = setTimeout(() => {

      if (!active) return;

      render();

    }, 30);
  }

  // =====================================
  // HELPERS
  // =====================================
  function getCart() {
    return Cart.getCart();
  }

  function calculateTotal(cart) {

    return cart.reduce(
      (sum, item) =>
        sum + (item.qty * item.price),
      0
    );
  }

  // =====================================
  // LAYOUT
  // =====================================
  function render() {

    if (!active || !container) return;

    const cart = getCart();

    const total =
      calculateTotal(cart);

    const rows = cart.length
      ? cart.map(item => {

          const rowTotal =
            item.qty * item.price;

          return `
            <tr>

              <td>
                ${item.name}
              </td>

              <td>
                KES ${item.price.toLocaleString()}
              </td>

              <td>

                <div class="qty-cell">

                  <button
                    class="qty-btn minus"
                    data-id="${item.id}"
                  >
                    -
                  </button>

                  <span>
                    ${item.qty}
                  </span>

                  <button
                    class="qty-btn plus"
                    data-id="${item.id}"
                  >
                    +
                  </button>

                </div>

              </td>

              <td>
                KES ${rowTotal.toLocaleString()}
              </td>

              <td>

                <button
                  class="remove-btn remove"
                  data-id="${item.id}"
                >
                  Remove
                </button>

              </td>

            </tr>
          `;

        }).join("")
      : `
        <tr>
          <td
            colspan="5"
            style="
              text-align:center;
              color:#888;
              padding:24px;
            "
          >
            Cart is empty
          </td>
        </tr>
      `;

    container.innerHTML = `

      <div class="cart-module">

        <h2 class="module-title">
          Shopping Cart
        </h2>

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
            ${total.toLocaleString()}
          </h3>

          <button
            id="continueCheckoutBtn"
            class="gold-btn"
            ${cart.length ? "" : "disabled"}
          >
            Continue To Checkout
          </button>

        </div>

      </div>

    `;

    bindEvents();
  }

  // =====================================
  // EVENTS
  // =====================================
  function bindEvents() {

    container.onclick = (e) => {

      if (!active) return;

      const id =
        e.target.dataset.id;

      // ==========================
      // PLUS
      // ==========================
      if (
        e.target.classList.contains("plus")
      ) {

        try {

          const item =
            Cart.getItem(id);

          if (!item) return;

          Cart.add(item, 1);

          requestRender();

        } catch (err) {

          UI.toast(
            err.message ||
            "Unable to increase quantity"
          );
        }

        return;
      }

      // ==========================
      // MINUS
      // ==========================
      if (
        e.target.classList.contains("minus")
      ) {

        Cart.decrement(id);

        requestRender();

        return;
      }

      // ==========================
      // REMOVE
      // ==========================
      if (
        e.target.classList.contains("remove")
      ) {

        Cart.remove(id);

        UI.toast(
          "Item removed"
        );

        requestRender();

        return;
      }

      // ==========================
      // CONTINUE TO SALE TERMINAL
      // ==========================
      if (
        e.target.id ===
        "continueCheckoutBtn"
      ) {

        const cart =
          Cart.getCart();

        if (!cart.length) {

          UI.toast(
            "Cart is empty"
          );

          return;
        }

        Router.go("sales");
      }
    };
  }

  // =====================================
  // MOUNT
  // =====================================
  function mount(targetContainer) {

    container = targetContainer;

    active = true;

    render();
  }

  // =====================================
  // CLEANUP
  // =====================================
  function cleanup() {

    active = false;

    clearTimeout(renderTimer);

    if (container) {

      container.onclick = null;
      container.innerHTML = "";
    }
  }

  // =====================================
  // MODULE CONTRACT
  // =====================================
  return {
    mount,
    cleanup
  };

});
